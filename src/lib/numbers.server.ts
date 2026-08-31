import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTelnyxWebhookUrl } from "@/lib/telnyx.server";
import { purchaseTelnyxNumber } from "@/lib/services/phone-numbers";
import { sendUserTransactionalEmail } from "@/lib/email.server";

// Re-export for use in numbers.functions.ts
export { getTelnyxWebhookUrl };

export async function activateVirtualNumber({
  numberId,
  phoneNumber,
  userId,
  provider,
  reference,
  amount,
}: {
  numberId: string;
  phoneNumber: string;
  userId: string;
  provider: string;
  reference: string;
  amount: number;
}) {
  // Purchase from Telnyx
  const purchased = await purchaseTelnyxNumber(phoneNumber);

  // Activate in DB — store Telnyx UUID as provider_sid and also in twilio_sid for backward compat
  await supabaseAdmin
    .from("virtual_numbers")
    .update({
      twilio_sid:   purchased.id,      // repurposed as generic provider ID for compat
      provider_sid: purchased.id,      // canonical field going forward
      provider:     "telnyx",
      friendly_name: phoneNumber,
      status:       "active",
      expires_at:   new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", numberId)
    .eq("user_id", userId);

  // Log payment
  await supabaseAdmin.from("payment_history").insert({
    user_id:         userId,
    provider,
    kind:            "number_rental",
    description:     `Virtual number ${phoneNumber} (Telnyx)`,
    amount,
    currency:        provider === "paystack" ? "NGN" : "USD",
    credits_granted: 0,
    status:          "paid",
    reference,
  });

  await sendUserTransactionalEmail(userId, {
    subject: "Your KodarAI virtual number is active",
    title: "Your virtual number is ready",
    preview: `${phoneNumber} is active and ready to use.`,
    body: `Your virtual number ${phoneNumber} is active and available in your KodarAI account.`,
    ctaLabel: "Open virtual numbers",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
  });
}

/** Activate an SMSPool temp number — no external API needed (already purchased) */
export async function activateSMSPoolNumber({
  numberId,
  orderId,
  phoneNumber,
  userId,
}: {
  numberId: string;
  orderId: string;
  phoneNumber: string;
  userId: string;
}) {
  await supabaseAdmin
    .from("virtual_numbers")
    .update({
      twilio_sid:    orderId,   // compat field
      provider_sid:  orderId,   // SMSPool orderId used for polling
      provider:      "smspool",
      friendly_name: phoneNumber,
      status:        "active",
      // SMSPool numbers expire in 20 minutes
      expires_at:    new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    })
    .eq("id", numberId)
    .eq("user_id", userId);

  await sendUserTransactionalEmail(userId, {
    subject: "Your KodarAI temporary number is active",
    title: "Your temporary number is ready",
    preview: `${phoneNumber} is active for your verification.`,
    body: `Your temporary number ${phoneNumber} is active. It will expire in around 20 minutes.`,
    ctaLabel: "Open virtual numbers",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
  });
}
