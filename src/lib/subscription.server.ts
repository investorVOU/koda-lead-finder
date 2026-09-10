import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canUseCustomDomain, hasPlanAccess, type PaidPlanId } from "@/lib/billing";

const PAID_SUBSCRIPTION_STATUSES = new Set(["active", "canceling"]);

export async function hasPaidSubscription(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return PAID_SUBSCRIPTION_STATUSES.has((data as { status?: string } | null)?.status ?? "");
}

export async function hasPlanAtLeast(userId: string, minimumPlan: PaidPlanId): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();

  const subscription = data as { plan?: string; status?: string } | null;
  return (
    PAID_SUBSCRIPTION_STATUSES.has(subscription?.status ?? "") &&
    hasPlanAccess(subscription?.plan, minimumPlan)
  );
}

export async function hasCustomDomainEntitlement(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();

  const subscription = data as { plan?: string; status?: string } | null;
  return (
    PAID_SUBSCRIPTION_STATUSES.has(subscription?.status ?? "") &&
    canUseCustomDomain(subscription?.plan)
  );
}

export function paidPlanRequired() {
  return {
    error: "plan_required",
    message: "Choose a paid plan to use this feature.",
  } as const;
}
