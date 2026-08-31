import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendMarketingEmail } from "@/lib/email.server";

function currentCampaignKey() {
  const today = new Date();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return `weekly-leads-${monday.toISOString().slice(0, 10)}`;
}

export async function sendWeeklyLeadMarketingCampaign() {
  const campaignKey = currentCampaignKey();
  const { data: optedInProfiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,full_name")
    .eq("marketing_email_opt_in", true)
    .not("email", "is", null);
  if (profilesError) throw new Error(profilesError.message);

  const profiles = (optedInProfiles ?? []) as { id: string; email: string; full_name: string | null }[];
  if (!profiles.length) return { campaignKey, eligible: 0, sent: 0, skipped: 0 };

  const userIds = profiles.map((profile) => profile.id);
  const { data: paidSubscriptions, error: subscriptionsError } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .in("status", ["active", "canceling"]);
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  const paidUserIds = new Set((paidSubscriptions ?? []).map((subscription: { user_id: string }) => subscription.user_id));

  let sent = 0;
  let skipped = 0;
  for (const profile of profiles) {
    if (paidUserIds.has(profile.id)) {
      skipped += 1;
      continue;
    }

    const { data: priorSend, error: priorSendError } = await supabaseAdmin
      .from("marketing_campaign_sends")
      .select("id")
      .eq("campaign_key", campaignKey)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (priorSendError) throw new Error(priorSendError.message);
    if (priorSend) {
      skipped += 1;
      continue;
    }

    const result = await sendMarketingEmail({ userId: profile.id, to: profile.email, name: profile.full_name });
    if (!result.sent) continue;
    const { error: recordError } = await supabaseAdmin
      .from("marketing_campaign_sends")
      .insert({ campaign_key: campaignKey, user_id: profile.id });
    if (recordError) throw new Error(recordError.message);
    sent += 1;
  }

  return { campaignKey, eligible: profiles.length - paidUserIds.size, sent, skipped };
}
