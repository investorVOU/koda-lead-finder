import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getSMSPoolPrice,
  getSMSPoolServices,
  requestSMSPoolNumber,
} from "@/lib/services/phone-numbers";

export const FIRST_PAID_PLAN_US_NUMBER_BONUS = "first_paid_plan_us_number" as const;

export type NumberBonusStatus = "none" | "available" | "redeemed" | "revoked";

const TEMP_NUMBER_DURATION_MINUTES = 20;

function numberBonusMaxCostUsd(): number {
  const configured = Number(process.env.US_NUMBER_BONUS_MAX_COST);
  return Number.isFinite(configured) && configured > 0 ? configured : 2;
}

async function eligibleTemporaryServices() {
  const services = await getSMSPoolServices();
  const candidates = [{ id: "any", name: "Any available service" }, ...services];
  const unique = Array.from(new Map(candidates.map((service) => [service.id, service])).values());

  const priced = await Promise.all(unique.map(async (service) => {
    try {
      const providerCostUsd = Number(await getSMSPoolPrice("US", service.id));
      if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0 || providerCostUsd > numberBonusMaxCostUsd()) {
        return null;
      }
      return { service: service.id, serviceLabel: service.name };
    } catch {
      return null;
    }
  }));

  return priced.filter((option): option is { service: string; serviceLabel: string } => option !== null);
}

export async function getNumberBonusStatus(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_promotional_entitlements")
    .select("id, status, number_order_id")
    .eq("user_id", userId)
    .eq("entitlement_type", FIRST_PAID_PLAN_US_NUMBER_BONUS)
    .maybeSingle();

  return {
    status: (data?.status ?? "none") as NumberBonusStatus,
    numberOrderId: data?.number_order_id ?? null,
  };
}

export async function grantFirstPaidPlanUSNumberBonus({
  userId,
  subscriptionId,
  paymentId,
  planId,
}: {
  userId: string;
  subscriptionId: string | null;
  paymentId: string | null;
  planId: string;
}): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("user_promotional_entitlements")
    .insert({
      user_id: userId,
      entitlement_type: FIRST_PAID_PLAN_US_NUMBER_BONUS,
      status: "available",
      source_subscription_id: subscriptionId,
      source_payment_id: paymentId,
      metadata: { plan_id: planId, country: "US", number_kind: "temporary" },
    });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

export async function revokeAvailableNumberBonusForPaymentReference(reference: string | undefined) {
  if (!reference) return;

  const { data: payment } = await supabaseAdmin
    .from("payment_history")
    .select("id")
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .eq("kind", "subscription")
    .maybeSingle();

  if (!payment) return;

  await supabaseAdmin
    .from("user_promotional_entitlements")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), claim_locked_at: null })
    .eq("source_payment_id", payment.id)
    .eq("status", "available");
}

export async function getEligibleUSNumberBonusOptions(userId: string) {
  const bonus = await getNumberBonusStatus(userId);
  if (bonus.status !== "available") return { status: bonus.status, options: [] } as const;

  return { status: bonus.status, options: await eligibleTemporaryServices() } as const;
}

export async function claimUSNumberBonus({
  userId,
  service,
}: {
  userId: string;
  service: string;
}) {
  const eligibleServices = await eligibleTemporaryServices();
  const selected = eligibleServices.find((option) => option.service === service);
  if (!selected) {
    return { error: true, message: "That temporary-number service is no longer available for this bonus." } as const;
  }

  const { data: entitlementId, error: lockError } = await supabaseAdmin.rpc(
    "acquire_number_bonus_claim",
    { p_user_id: userId, p_entitlement_type: FIRST_PAID_PLAN_US_NUMBER_BONUS },
  );
  if (lockError) throw lockError;
  if (!entitlementId) {
    return { error: true, message: "This bonus is no longer available, or a claim is already in progress." } as const;
  }

  let provisioned = false;
  try {
    // Recheck immediately before purchase; neither the browser quote nor an
    // earlier catalogue result is trusted for the promotional cost ceiling.
    const liveProviderCostUsd = Number(await getSMSPoolPrice("US", selected.service));
    if (!Number.isFinite(liveProviderCostUsd) || liveProviderCostUsd <= 0 || liveProviderCostUsd > numberBonusMaxCostUsd()) {
      throw new Error("This temporary-number service is no longer eligible for the bonus.");
    }

    const providerResult = await requestSMSPoolNumber("US", selected.service);
    provisioned = true;

    // Persist the supplier order before recording the local number row so a
    // post-provisioning persistence error remains locked for support review,
    // rather than ever risking a second supplier purchase.
    const { error: supplierRecordError } = await supabaseAdmin
      .from("user_promotional_entitlements")
      .update({ metadata: {
        provider: "smspool",
        provider_order_id: providerResult.orderId,
        country: "US",
        number_kind: "temporary",
        service: selected.service,
      } })
      .eq("id", entitlementId)
      .eq("status", "available");
    if (supplierRecordError) throw supplierRecordError;

    const expiresAt = new Date(Date.now() + TEMP_NUMBER_DURATION_MINUTES * 60 * 1000);
    const { data: numberOrder, error: numberError } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id: userId,
        twilio_sid: providerResult.orderId,
        provider_sid: providerResult.orderId,
        provider: "smspool",
        phone_number: providerResult.phoneNumber,
        friendly_name: providerResult.phoneNumber,
        country_code: "US",
        number_type: "promotional temporary number",
        status: "active",
        monthly_usd: 0,
        monthly_ngn: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();
    if (numberError || !numberOrder) throw numberError ?? new Error("Could not save the provisioned number.");

    const { data: completed, error: completionError } = await supabaseAdmin.rpc(
      "complete_number_bonus_claim",
      { p_entitlement_id: entitlementId, p_number_order_id: numberOrder.id },
    );
    if (completionError) throw completionError;
    if (!completed) throw new Error("Could not complete the promotional claim.");

    return {
      success: true,
      numberId: numberOrder.id,
      expiresAt: expiresAt.toISOString(),
      durationMinutes: TEMP_NUMBER_DURATION_MINUTES,
    } as const;
  } catch (error) {
    if (!provisioned) {
      await supabaseAdmin.rpc("release_number_bonus_claim", { p_entitlement_id: entitlementId });
    }
    console.error("[number-bonus] claim failed", error);
    return {
      error: true,
      message: provisioned
        ? "Your number was provisioned but needs review before the claim can finish. Please contact support."
        : "This number is currently unavailable. Your bonus is still available—please try another service.",
    } as const;
  }
}