import {
  PLAN_ACTIVATION_CAMPAIGNS,
  sendPlanActivationEmail,
  type PlanActivationCampaignKey,
} from "@/lib/email.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const activationDelays: Record<PlanActivationCampaignKey, number> = {
  "plan-activation-6h": 6 * 60 * 60 * 1000,
  "plan-activation-24h": 24 * 60 * 60 * 1000,
  "plan-activation-3d": 3 * 24 * 60 * 60 * 1000,
  "plan-activation-7d": 7 * 24 * 60 * 60 * 1000,
};

type Enrollment = {
  user_id: string;
  first_choose_plan_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  marketing_email_unsubscribed_at: string | null;
};

type CampaignSend = {
  id: string;
  campaign_key: PlanActivationCampaignKey;
  user_id: string;
  sent_at: string;
  clicked_at: string | null;
  converted_at: string | null;
};

function isPaid(status: string | null | undefined) {
  return status === "active" || status === "canceling";
}

async function loadActivationData() {
  const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
    .from("plan_activation_enrollments")
    .select("user_id,first_choose_plan_at")
    .order("first_choose_plan_at", { ascending: false });

  if (enrollmentError) throw new Error(enrollmentError.message);

  const enrollments = (enrollmentData ?? []) as Enrollment[];
  const userIds = enrollments.map((entry) => entry.user_id);
  if (!userIds.length) return { enrollments, profiles: [] as Profile[], paidUserIds: new Set<string>(), sends: [] as CampaignSend[] };

  const [profilesResult, subscriptionsResult, sendsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,marketing_email_unsubscribed_at")
      .in("id", userIds),
    supabaseAdmin
      .from("subscriptions")
      .select("user_id,status")
      .in("user_id", userIds),
    supabaseAdmin
      .from("marketing_campaign_sends")
      .select("id,campaign_key,user_id,sent_at,clicked_at,converted_at")
      .in("user_id", userIds)
      .in("campaign_key", [...PLAN_ACTIVATION_CAMPAIGNS]),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);
  if (sendsResult.error) throw new Error(sendsResult.error.message);

  const paidUserIds = new Set(
    (subscriptionsResult.data ?? [])
      .filter((subscription: { status?: string | null }) => isPaid(subscription.status))
      .map((subscription: { user_id: string }) => subscription.user_id),
  );

  return {
    enrollments,
    profiles: (profilesResult.data ?? []) as Profile[],
    paidUserIds,
    sends: (sendsResult.data ?? []) as CampaignSend[],
  };
}

async function syncConversions(sends: CampaignSend[], paidUserIds: Set<string>) {
  const ids = sends
    .filter((send) => paidUserIds.has(send.user_id) && !send.converted_at)
    .map((send) => send.id);

  if (!ids.length) return 0;

  const { error } = await supabaseAdmin
    .from("marketing_campaign_sends")
    .update({ converted_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
  return ids.length;
}

export async function sendPlanActivationCampaign() {
  const { enrollments, profiles, paidUserIds, sends } = await loadActivationData();
  await syncConversions(sends, paidUserIds);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const sentKeys = new Set(sends.map((send) => `${send.campaign_key}:${send.user_id}`));
  const now = Date.now();
  const results: Record<PlanActivationCampaignKey, { eligible: number; sent: number; skipped: number }> = {
    "plan-activation-6h": { eligible: 0, sent: 0, skipped: 0 },
    "plan-activation-24h": { eligible: 0, sent: 0, skipped: 0 },
    "plan-activation-3d": { eligible: 0, sent: 0, skipped: 0 },
    "plan-activation-7d": { eligible: 0, sent: 0, skipped: 0 },
  };

  for (const enrollment of enrollments) {
    const profile = profileById.get(enrollment.user_id);
    const firstViewAt = new Date(enrollment.first_choose_plan_at).getTime();
    const nextStageIndex = PLAN_ACTIVATION_CAMPAIGNS.findIndex(
      (campaignKey) => !sentKeys.has(`${campaignKey}:${enrollment.user_id}`),
    );

    if (nextStageIndex < 0) continue;

    const campaignKey = PLAN_ACTIVATION_CAMPAIGNS[nextStageIndex];
    const isDue = Number.isFinite(firstViewAt) && now - firstViewAt >= activationDelays[campaignKey];
    const previousCampaign = PLAN_ACTIVATION_CAMPAIGNS[nextStageIndex - 1];
    const previousSend = previousCampaign
      ? sends.find((send) => send.user_id === enrollment.user_id && send.campaign_key === previousCampaign)
      : null;
    const minimumGap = previousCampaign
      ? activationDelays[campaignKey] - activationDelays[previousCampaign]
      : 0;
    const previousStageHasSettled = !previousSend || now - new Date(previousSend.sent_at).getTime() >= minimumGap;

    if (!profile || !profile.email || profile.marketing_email_unsubscribed_at || paidUserIds.has(enrollment.user_id) || !isDue || !previousStageHasSettled) {
      results[campaignKey].skipped += 1;
      continue;
    }

    results[campaignKey].eligible += 1;
    const result = await sendPlanActivationEmail({
      userId: profile.id,
      to: profile.email,
      name: profile.full_name,
      campaignKey,
    });

    if (!result.sent) continue;

    const { error } = await supabaseAdmin
      .from("marketing_campaign_sends")
      .insert({ campaign_key: campaignKey, user_id: profile.id });

    if (error) throw new Error(error.message);
    sentKeys.add(`${campaignKey}:${profile.id}`);
    results[campaignKey].sent += 1;
  }

  return results;
}

export async function getPlanActivationMetrics() {
  const { enrollments, profiles, paidUserIds, sends } = await loadActivationData();
  await syncConversions(sends, paidUserIds);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const metrics = PLAN_ACTIVATION_CAMPAIGNS.map((campaignKey) => {
    const campaignSends = sends.filter((send) => send.campaign_key === campaignKey);
    const clicked = campaignSends.filter((send) => send.clicked_at).length;
    const converted = campaignSends.filter((send) => paidUserIds.has(send.user_id)).length;

    return {
      campaignKey,
      sent: campaignSends.length,
      clicked,
      converted,
      clickRate: campaignSends.length ? Math.round((clicked / campaignSends.length) * 100) : 0,
      conversionRate: campaignSends.length ? Math.round((converted / campaignSends.length) * 100) : 0,
    };
  });

  return {
    enrolled: enrollments.length,
    unpaid: enrollments.filter((entry) => !paidUserIds.has(entry.user_id) && !profileById.get(entry.user_id)?.marketing_email_unsubscribed_at).length,
    metrics,
    recent: sends
      .sort((left, right) => right.sent_at.localeCompare(left.sent_at))
      .slice(0, 20)
      .map((send) => ({
        ...send,
        name: profileById.get(send.user_id)?.full_name ?? null,
        email: profileById.get(send.user_id)?.email ?? null,
        converted: paidUserIds.has(send.user_id),
      })),
  };
}
