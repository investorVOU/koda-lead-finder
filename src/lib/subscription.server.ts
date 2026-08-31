import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PAID_SUBSCRIPTION_STATUSES = new Set(["active", "canceling"]);

export async function hasPaidSubscription(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return PAID_SUBSCRIPTION_STATUSES.has(
    (data as { status?: string } | null)?.status ?? "",
  );
}

export function paidPlanRequired() {
  return {
    error: "plan_required",
    message: "Choose a paid plan to use this feature.",
  } as const;
}
