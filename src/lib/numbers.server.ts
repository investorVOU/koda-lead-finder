import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTwilioClient, getTwilioWebhookUrl } from "@/lib/twilio.server";

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
  // Provision on Twilio
  const client = getTwilioClient();
  const webhookUrl = getTwilioWebhookUrl();

  const provisioned = await client.incomingPhoneNumbers.create({
    phoneNumber,
    smsUrl: webhookUrl,
    smsMethod: "POST",
  });

  // Activate in DB
  await supabaseAdmin
    .from("virtual_numbers")
    .update({
      twilio_sid: provisioned.sid,
      friendly_name: provisioned.friendlyName,
      status: "active",
      expires_at: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", numberId)
    .eq("user_id", userId);

  // Log payment
  await supabaseAdmin.from("payment_history").insert({
    user_id: userId,
    provider,
    kind: "number_rental",
    description: `Virtual number ${phoneNumber}`,
    amount,
    currency: provider === "paystack" ? "NGN" : "USD",
    credits_granted: 0,
    status: "paid",
    reference,
  });
}
