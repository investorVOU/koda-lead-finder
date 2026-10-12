import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findPlan, formatNgn, getPlanPrice } from "@/lib/billing";
import {
  CHECKOUT_RECOVERY_CAMPAIGN,
  sendCheckoutRecoveryEmail,
} from "@/lib/email.server";
import { sendTelegram, telegramConfigured } from "@/lib/telegram.server";

const db = supabaseAdmin as any;
const RECOVERY_DELAY_MS = 30 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

type CheckoutAttemptInput = {
  userId: string;
  reference: string;
  kind: "subscription" | "pack";
  planId: string;
  amount: number;
  currency: string;
  cycle?: "monthly" | "annually";
  renewalMode?: "manual" | "auto";
};

export async function recordCheckoutAttempt(input: CheckoutAttemptInput) {
  try {
    const { error } = await db.from("checkout_attempts").upsert({
      user_id: input.userId,
      provider: "paystack",
      provider_reference: input.reference,
      kind: input.kind,
      plan_id: input.planId,
      billing_cycle: input.cycle ?? null,
      renewal_mode: input.renewalMode ?? null,
      amount: input.amount,
      currency: input.currency,
    }, { onConflict: "provider_reference", ignoreDuplicates: true });
    if (error) console.error("Unable to record checkout attempt:", error.message);
  } catch (error) {
    // Payment creation must remain available even if recovery analytics is unavailable.
    console.error("Unable to record checkout attempt:", error);
  }
}

export async function markCheckoutPaid(reference: string | null | undefined) {
  if (!reference) return;
  try {
    const { error } = await db.from("checkout_attempts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("provider", "paystack")
      .eq("provider_reference", reference);
    if (error) console.error("Unable to mark checkout paid:", error.message);
  } catch (error) {
    // Never make verified payment fulfilment depend on the recovery funnel.
    console.error("Unable to mark checkout paid:", error);
  }
}

export async function getPendingCheckoutForUser(userId: string) {
  const [{ data: subscription }, { data: attempt, error }] = await Promise.all([
    db.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
    db.from("checkout_attempts")
      .select("kind,plan_id,billing_cycle,renewal_mode,amount,currency,started_at")
      .eq("user_id", userId)
      .eq("status", "initialized")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) throw new Error(error.message);
  if (subscription?.status === "active" || subscription?.status === "canceling") return null;
  if (!attempt) return null;
  if (Date.now() - new Date(attempt.started_at).getTime() > 7 * 24 * 60 * 60 * 1000) return null;

  return {
    kind: attempt.kind as "subscription" | "pack",
    planId: attempt.plan_id as string,
    cycle: attempt.billing_cycle === "annually" ? "annually" as const : "monthly" as const,
    renewalMode: attempt.renewal_mode === "manual" ? "manual" as const : "auto" as const,
    amount: Number(attempt.amount),
    currency: attempt.currency as string,
  };
}

/** Sends one reminder only after an initialized checkout remains unpaid for 30 minutes. */
export async function sendCheckoutRecoveryCampaign() {
  const now = new Date();
  const dueBefore = new Date(now.getTime() - RECOVERY_DELAY_MS).toISOString();
  const staleClaimBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS).toISOString();

  // A process that stopped midway should not suppress a reminder permanently.
  await db.from("checkout_attempts")
    .update({ recovery_claimed_at: null })
    .eq("status", "initialized")
    .is("recovery_sent_at", null)
    .lt("recovery_claimed_at", staleClaimBefore);

  const { data: dueAttempts, error } = await db.from("checkout_attempts")
    .select("id,user_id,kind,plan_id,billing_cycle,amount,currency,started_at")
    .eq("status", "initialized")
    .is("recovery_sent_at", null)
    .is("recovery_claimed_at", null)
    .lte("started_at", dueBefore)
    .order("started_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);

  const attempts = dueAttempts ?? [];
  const userIds = [...new Set(attempts.map((attempt: any) => attempt.user_id))];
  if (!userIds.length) return { eligible: 0, sent: 0, skipped: 0 };

  const [profilesResult, subscriptionsResult, sendsResult] = await Promise.all([
    db.from("profiles").select("id,email,full_name,marketing_email_unsubscribed_at").in("id", userIds),
    db.from("subscriptions").select("user_id,status").in("user_id", userIds),
    db.from("marketing_campaign_sends").select("user_id").eq("campaign_key", CHECKOUT_RECOVERY_CAMPAIGN).in("user_id", userIds),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);
  if (sendsResult.error) throw new Error(sendsResult.error.message);

  const profiles = new Map((profilesResult.data ?? []).map((profile: any) => [profile.id, profile]));
  const paidUsers = new Set((subscriptionsResult.data ?? [])
    .filter((subscription: any) => subscription.status === "active" || subscription.status === "canceling")
    .map((subscription: any) => subscription.user_id));
  const previouslySent = new Set((sendsResult.data ?? []).map((send: any) => send.user_id));
  const result = { eligible: 0, sent: 0, skipped: 0 };

  for (const attempt of attempts as any[]) {
    const claimedAt = new Date().toISOString();
    const { data: claimed } = await db.from("checkout_attempts")
      .update({ recovery_claimed_at: claimedAt })
      .eq("id", attempt.id)
      .eq("status", "initialized")
      .is("recovery_sent_at", null)
      .is("recovery_claimed_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const profile = profiles.get(attempt.user_id) as {
      email?: string | null;
      full_name?: string | null;
      marketing_email_unsubscribed_at?: string | null;
    } | undefined;
    if (!profile?.email || paidUsers.has(attempt.user_id) || previouslySent.has(attempt.user_id)
      || Boolean(profile.marketing_email_unsubscribed_at)) {
      await db.from("checkout_attempts").update({ recovery_sent_at: claimedAt }).eq("id", attempt.id);
      result.skipped += 1;
      continue;
    }

    result.eligible += 1;
    const plan = attempt.kind === "subscription" ? findPlan(attempt.plan_id) : null;
    const planName = plan?.name ?? "selected";
    const price = formatNgn(Number(attempt.amount) || (plan ? getPlanPrice(plan, attempt.billing_cycle) : 0));
    const email = await sendCheckoutRecoveryEmail({
      userId: attempt.user_id,
      to: profile.email,
      name: profile.full_name,
      planName,
      price,
    });

    if (!email.sent) {
      await db.from("checkout_attempts").update({ recovery_claimed_at: null }).eq("id", attempt.id);
      continue;
    }

    await db.from("checkout_attempts").update({ recovery_sent_at: new Date().toISOString() }).eq("id", attempt.id);
    const { error: sendError } = await db.from("marketing_campaign_sends")
      .insert({ campaign_key: CHECKOUT_RECOVERY_CAMPAIGN, user_id: attempt.user_id });
    if (sendError) console.error("Unable to store checkout recovery send:", sendError.message);
    previouslySent.add(attempt.user_id);
    result.sent += 1;

    if (telegramConfigured()) {
      await sendTelegram([
        "⏳ CHECKOUT NOT COMPLETED",
        "",
        `Plan: ${planName} (${price})`,
        `Started: ${new Date(attempt.started_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`,
        "Recovery email sent.",
      ].join("\n"));
    }
  }

  return result;
}

export async function getCheckoutRecoveryMetrics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: attempts, error: attemptsError }, { data: sends, error: sendsError }] = await Promise.all([
    db.from("checkout_attempts").select("user_id,status").gte("started_at", since),
    db.from("marketing_campaign_sends").select("user_id,clicked_at")
      .eq("campaign_key", CHECKOUT_RECOVERY_CAMPAIGN)
      .gte("sent_at", since),
  ]);
  if (attemptsError) throw new Error(attemptsError.message);
  if (sendsError) throw new Error(sendsError.message);

  const rows = attempts ?? [];
  const users = [...new Set(rows.map((attempt: any) => attempt.user_id))];
  const { data: subscriptions, error: subscriptionsError } = users.length
    ? await db.from("subscriptions").select("user_id,status").in("user_id", users)
    : { data: [], error: null };
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  const paidUsers = new Set((subscriptions ?? [])
    .filter((subscription: any) => subscription.status === "active" || subscription.status === "canceling")
    .map((subscription: any) => subscription.user_id));
  const recoverySends = sends ?? [];

  return {
    started: rows.length,
    paid: rows.filter((attempt: any) => attempt.status === "paid").length,
    unpaid: rows.filter((attempt: any) => attempt.status === "initialized").length,
    reminderSent: recoverySends.length,
    reminderClicked: recoverySends.filter((send: any) => send.clicked_at).length,
    reminderConverted: recoverySends.filter((send: any) => paidUsers.has(send.user_id)).length,
  };
}
