// Server-only billing helpers. The .server.ts suffix keeps this out of the
// client bundle. Reads secrets at call time (Workers bind env per-request).
// Paystack only — Stripe support removed.
import process from "node:process";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BILLING_PRICE_TIER, findPlan, findPack, getPlanPrice, type BillingCycle, type Plan } from "@/lib/billing";
import { sendUserTransactionalEmail } from "@/lib/email.server";

export type Provider = "paystack";

export const PAYSTACK_API = "https://api.paystack.co";

export function getPaystackKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return k;
}

// ---- Paystack ----
export async function paystackFetch<T = any>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getPaystackKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as any;
  if (!res.ok || json?.status === false) throw new Error(json?.message || "Paystack request failed");
  return json as T;
}

export function verifyPaystackSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Get (or lazily create + cache) a Paystack recurring plan code for a plan.
export async function getPaystackPlanCode(
  plan: Plan,
  cycle: BillingCycle = "monthly",
): Promise<string> {
  // The table also contains plans made before launch pricing. Keep the cache
  // keys distinct so Paystack never reuses a plan with the wrong amount.
  const providerCycleKey = BILLING_PRICE_TIER === "high"
    ? cycle
    : `${cycle}-${BILLING_PRICE_TIER}`;
  const { data } = await supabaseAdmin
    .from("provider_plans")
    .select("provider_plan_code")
    .eq("provider", "paystack")
    .eq("plan_id", plan.id)
    .eq("cycle", providerCycleKey)
    .maybeSingle();
  const existing = (data as { provider_plan_code?: string } | null)?.provider_plan_code;
  if (existing) return existing;

  const res = await paystackFetch<{ data: { plan_code: string } }>("/plan", "POST", {
    name: `Kodarai ${plan.name} ${BILLING_PRICE_TIER === "low" ? "Launch " : ""}(${cycle === "annually" ? "Annual" : "Monthly"})`,
    amount: getPlanPrice(plan, cycle) * 100,
    interval: cycle,
    currency: "NGN",
  });
  const code = res.data.plan_code;
  await supabaseAdmin
    .from("provider_plans")
    .insert({ provider: "paystack", plan_id: plan.id, cycle: providerCycleKey, provider_plan_code: code });
  return code;
}

// ---- Idempotency ----
// Returns true if this is the first time we've seen the event (safe to process).
export async function claimWebhookEvent(provider: Provider, eventId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("webhook_events")
    .insert({ provider, event_id: eventId });
  // Unique violation => already processed
  return !error;
}

// Release a claim so a provider retry can re-process after a handler failure.
export async function releaseWebhookEvent(provider: Provider, eventId: string): Promise<void> {
  await supabaseAdmin
    .from("webhook_events")
    .delete()
    .eq("provider", provider)
    .eq("event_id", eventId);
}

// ---- Referral crediting ----
// Called after a paid subscription activates. Awards 10 top-up leads to whoever
// referred this user, but only once (referrals.credited guard).
// Requires migration 20260608000000_follow_up_referral.sql to be applied.
export async function creditReferrer(refereeId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referee_id", refereeId)
      .eq("credited", false)
      .maybeSingle();

    if (!referral) return;

    // Fetch current top-up credits for referrer
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("topup_credits")
      .eq("user_id", referral.referrer_id)
      .maybeSingle();

    const current = (sub as { topup_credits?: number } | null)?.topup_credits ?? 0;

    await supabaseAdmin
      .from("subscriptions")
      .update({ topup_credits: current + 10 })
      .eq("user_id", referral.referrer_id);

    await admin
      .from("referrals")
      .update({ credited: true })
      .eq("id", referral.id);

    await sendUserTransactionalEmail(referral.referrer_id, {
      subject: "You earned 10 KodarAI leads",
      title: "Your referral reward is ready",
      preview: "10 leads were added to your KodarAI account.",
      body: "Someone you referred completed their first paid plan. We added 10 leads to your account as a thank you.",
      ctaLabel: "View referrals",
      ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/referrals`,
    });
  } catch {
    // Silently skip — referrals table may not exist yet
  }
}

// ---- Fulfillment ----
export async function applySubscription(args: {
  userId: string;
  planId: string;
  provider: Provider;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerSubscriptionToken?: string | null;
  reference?: string | null;
  currency?: string;
  amount?: number;
  cycle?: BillingCycle;
  periodEnd?: string | null;
}): Promise<void> {
  const plan = findPlan(args.planId);
  if (!plan || !args.userId) return;
  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("billing_cycle")
    .eq("user_id", args.userId)
    .maybeSingle();
  const savedCycle = (existingSubscription as { billing_cycle?: string } | null)?.billing_cycle;
  // Paystack renewal events may not repeat the checkout metadata. Preserve the
  // already-recorded cycle in that case, while new checkouts always send one.
  const cycle = args.cycle ?? (savedCycle === "annually" ? "annually" : "monthly");
  // Annual billing changes when the customer is charged, not their monthly
  // lead allowance. The credit RPC resets this allowance every month.
  const creditsResetAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const periodEnd = args.periodEnd ?? new Date(
    Date.now() + (cycle === "annually" ? 365 : 30) * 86_400_000,
  ).toISOString();

  await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: plan.id,
      status: "active",
      billing_cycle: cycle,
      provider: args.provider,
      search_credits_total: plan.credits,
      search_credits_used: 0,
      credits_reset_at: creditsResetAt,
      current_period_end: periodEnd,
      provider_customer_id: args.providerCustomerId ?? undefined,
      provider_subscription_id: args.providerSubscriptionId ?? undefined,
      provider_subscription_token: args.providerSubscriptionToken ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", args.userId);

  await supabaseAdmin.from("payment_history").insert({
    user_id: args.userId,
    provider: args.provider,
    provider_reference: args.reference ?? null,
    kind: "subscription",
    description: `${plan.name} plan — ${cycle === "annually" ? "annual billing" : "monthly billing"}`,
    plan_id: plan.id,
    amount: args.amount ?? getPlanPrice(plan, cycle),
    currency: args.currency ?? "NGN",
    credits_granted: plan.credits,
    status: "success",
  });

  await sendUserTransactionalEmail(args.userId, {
    subject: `Your ${plan.name} plan is active — KodarAI`,
    title: "Your subscription is active",
    preview: `${plan.credits} leads are ready for this billing period.`,
    body: `Your ${plan.name} plan is now active with ${cycle === "annually" ? "annual" : "monthly"} billing. ${plan.credits} leads are available for this billing period.`,
    ctaLabel: "Open billing",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/billing`,
  });
}

export async function applyCreditPack(args: {
  userId: string;
  packId: string;
  provider: Provider;
  reference?: string | null;
  currency?: string;
  amount?: number;
}): Promise<void> {
  const pack = findPack(args.packId);
  if (!pack || !args.userId) return;

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("topup_credits")
    .eq("user_id", args.userId)
    .maybeSingle();
  const current = (sub as { topup_credits?: number } | null)?.topup_credits ?? 0;

  await supabaseAdmin
    .from("subscriptions")
    .update({ topup_credits: current + pack.credits, updated_at: new Date().toISOString() })
    .eq("user_id", args.userId);

  await supabaseAdmin.from("payment_history").insert({
    user_id: args.userId,
    provider: args.provider,
    provider_reference: args.reference ?? null,
    kind: "credit_pack",
    description: `${pack.name} — ${pack.credits} leads`,
    plan_id: pack.id,
    amount: args.amount ?? pack.ngn,
    currency: args.currency ?? "NGN",
    credits_granted: pack.credits,
    status: "success",
  });

  await sendUserTransactionalEmail(args.userId, {
    subject: `${pack.credits} KodarAI leads added to your account`,
    title: "Your lead pack is ready",
    preview: `${pack.credits} leads were added to your account.`,
    body: `Your ${pack.name} purchase is complete. ${pack.credits} leads have been added to your account and do not expire.`,
    ctaLabel: "Start finding leads",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/dashboard`,
  });
}

export async function markSubscriptionCanceled(match: {
  userId?: string;
  provider?: Provider;
  providerCustomerId?: string;
}): Promise<void> {
  let q = supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", plan: "none", updated_at: new Date().toISOString() });
  if (match.userId) {
    q = q.eq("user_id", match.userId);
  } else if (match.provider && match.providerCustomerId) {
    q = q.eq("provider", match.provider).eq("provider_customer_id", match.providerCustomerId);
  } else {
    return;
  }
  await q;
}
