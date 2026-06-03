// Server-only billing helpers. The .server.ts suffix keeps this out of the
// client bundle. Reads secrets at call time (Workers bind env per-request).
import process from "node:process";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findPlan, findPack, type Provider } from "@/lib/billing";

export const STRIPE_API = "https://api.stripe.com/v1";
export const PAYSTACK_API = "https://api.paystack.co";

export function getStripeKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY is not configured");
  return k;
}

export function getStripeWebhookSecret(): string {
  const k = process.env.STRIPE_WEBHOOK_SECRET;
  if (!k) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return k;
}

export function getPaystackKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return k;
}

// ---- Stripe (REST, no SDK — Worker friendly) ----
export async function stripeFetch<T = any>(
  path: string,
  params: Record<string, string | number | undefined | null>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") body.append(k, String(v));
  }
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message || "Stripe request failed");
  return json as T;
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

// ---- Idempotency ----
// Returns true if this is the first time we've seen the event (safe to process).
export async function claimWebhookEvent(provider: Provider, eventId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("webhook_events")
    .insert({ provider, event_id: eventId });
  // Unique violation => already processed
  return !error;
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
  periodEnd?: string | null;
}): Promise<void> {
  const plan = findPlan(args.planId);
  if (!plan || !args.userId) return;
  const reset = args.periodEnd ?? new Date(Date.now() + 30 * 86_400_000).toISOString();

  await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: plan.id,
      status: "active",
      billing_cycle: "monthly",
      provider: args.provider,
      search_credits_total: plan.credits,
      search_credits_used: 0,
      credits_reset_at: reset,
      current_period_end: args.periodEnd ?? null,
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
    description: `${plan.name} plan — ${plan.credits} leads / month`,
    plan_id: plan.id,
    amount: args.amount ?? plan.usd,
    currency: args.currency ?? "USD",
    credits_granted: plan.credits,
    status: "success",
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
    amount: args.amount ?? pack.usd,
    currency: args.currency ?? "USD",
    credits_granted: pack.credits,
    status: "success",
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
