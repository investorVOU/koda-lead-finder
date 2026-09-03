import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const db = supabaseAdmin as any;

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function reminderCopy(followUpAt: string, businessName: string) {
  const today = isoDate();
  const label = followUpAt < today
    ? "Overdue follow-up"
    : followUpAt === today
      ? "Follow up today"
      : "Follow up tomorrow";

  return { title: label, body: `${businessName} needs your attention.`, url: "/leads" };
}

export async function sendDueFollowUpNotifications() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@kodarai.xyz";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured.");

  const today = isoDate();
  const tomorrow = isoDate(1);
  const { data: leads, error: leadsError } = await db
    .from("saved_leads")
    .select("id,user_id,business_name,follow_up_at")
    .not("follow_up_at", "is", null)
    .lte("follow_up_at", tomorrow);
  if (leadsError) throw new Error(leadsError.message);

  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  let skipped = 0;
  let expired = 0;

  for (const lead of leads ?? []) {
    const { data: subscriptions, error: subscriptionsError } = await db
      .from("follow_up_push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", lead.user_id);
    if (subscriptionsError) throw new Error(subscriptionsError.message);

    for (const subscription of subscriptions ?? []) {
      const { error: deliveryError } = await db
        .from("follow_up_push_deliveries")
        .insert({ push_subscription_id: subscription.id, lead_id: lead.id, notification_date: today });
      if (deliveryError?.code === "23505") {
        skipped += 1;
        continue;
      }
      if (deliveryError) throw new Error(deliveryError.message);

      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(reminderCopy(lead.follow_up_at, lead.business_name)),
        );
        sent += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await db.from("follow_up_push_subscriptions").delete().eq("id", subscription.id);
          expired += 1;
        } else {
          console.error("Follow-up push notification failed:", error);
        }
      }
    }
  }

  return { sent, skipped, expired, eligibleLeads: leads?.length ?? 0 };
}
