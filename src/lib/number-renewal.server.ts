import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendUserTransactionalEmail } from "@/lib/email.server";
import { releaseTelnyxNumber } from "@/lib/services/phone-numbers";

type RenewalResult = {
  status: "renewed" | "insufficient_funds" | "invalid_price" | "not_due" | "not_found";
  user_id?: string;
  phone_number?: string;
  amount_ngn?: number;
  expires_at?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Processes customer-authorized monthly renewals. The database RPC locks each
 * number and wallet in one transaction, so retries and overlapping job runs
 * cannot charge the same month twice.
 */
export async function processDueNumberRenewals() {
  const dueBefore = new Date(Date.now() + DAY_MS).toISOString();
  const { data: numbers, error } = await supabaseAdmin
    .from("virtual_numbers")
    .select("id")
    .eq("provider", "telnyx")
    .eq("status", "active")
    .eq("auto_renew", true)
    .not("expires_at", "is", null)
    .lte("expires_at", dueBefore)
    .limit(100);

  if (error) throw error;

  const summary = { renewed: 0, insufficientFunds: 0, invalidPrice: 0, skipped: 0, failed: 0 };

  for (const number of numbers ?? []) {
    try {
      const { data, error: renewalError } = await supabaseAdmin.rpc(
        "renew_due_virtual_number",
        { p_number_id: number.id, p_due_before: dueBefore },
      );
      if (renewalError) throw renewalError;

      const result = data as RenewalResult;
      if (result.status === "renewed") {
        summary.renewed += 1;
        if (result.user_id && result.phone_number && result.amount_ngn) {
          await sendUserTransactionalEmail(result.user_id, {
            subject: "Your Kodarai number was renewed",
            title: "Monthly number renewed",
            preview: `${result.phone_number} is active for another month.`,
            body: `We renewed ${result.phone_number} for ₦${Number(result.amount_ngn).toLocaleString("en-NG")} from your Kodarai wallet.`,
            ctaLabel: "View your number",
            ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
          });
        }
      } else if (result.status === "insufficient_funds") {
        summary.insufficientFunds += 1;
        if (result.user_id && result.phone_number) {
          await sendUserTransactionalEmail(result.user_id, {
            subject: "Top up your wallet to keep your Kodarai number",
            title: "Renewal needs wallet funds",
            preview: `${result.phone_number} could not be renewed.`,
            body: `We could not renew ${result.phone_number} because your wallet balance is too low. Auto-renew has been turned off. Top up and renew manually before the current month ends to keep this number.`,
            ctaLabel: "Top up wallet",
            ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
          });
        }
      } else if (result.status === "invalid_price") {
        summary.invalidPrice += 1;
        console.error("[number-renewal] missing renewal price", { numberId: number.id });
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error("[number-renewal] failed to renew number", { numberId: number.id, error });
    }
  }

  return summary;
}

/** Release expired numbers that are no longer set to renew, preventing an
 * inactive customer number from continuing to accrue upstream monthly cost. */
export async function releaseExpiredNumbers() {
  const now = new Date().toISOString();
  const { data: numbers, error } = await supabaseAdmin
    .from("virtual_numbers")
    .select("id, user_id, phone_number, provider_sid, twilio_sid")
    .eq("provider", "telnyx")
    .eq("status", "active")
    .eq("auto_renew", false)
    .not("expires_at", "is", null)
    .lte("expires_at", now)
    .limit(100);

  if (error) throw error;

  let released = 0;
  let failed = 0;
  for (const number of numbers ?? []) {
    const providerId = number.provider_sid ?? number.twilio_sid;
    if (!providerId || providerId.startsWith("pending_")) continue;

    try {
      await releaseTelnyxNumber(providerId);
      const { error: updateError } = await supabaseAdmin
        .from("virtual_numbers")
        .update({ status: "expired" })
        .eq("id", number.id)
        .eq("status", "active")
        .eq("auto_renew", false)
        .lte("expires_at", now);
      if (updateError) throw updateError;

      released += 1;
      await sendUserTransactionalEmail(number.user_id, {
        subject: "Your Kodarai number has expired",
        title: "Number released",
        preview: `${number.phone_number} was not renewed in time.`,
        body: `Your monthly number ${number.phone_number} has expired and was released because it was not renewed before its billing date.`,
        ctaLabel: "Get a new number",
        ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
      });
    } catch (error) {
      failed += 1;
      console.error("[number-renewal] failed to release expired number", { numberId: number.id, error });
    }
  }

  return { released, failed };
}
