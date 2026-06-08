import Twilio from "twilio";

let _client: Twilio.Twilio | null = null;

export function getTwilioClient(): Twilio.Twilio {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    _client = new Twilio.Twilio(sid, token);
  }
  return _client;
}

export function getTwilioWebhookUrl(): string {
  const base = process.env.APP_URL ?? "https://kodarai.xyz";
  return `${base}/api/public/webhooks/twilio-sms`;
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  return Twilio.validateRequest(token, signature, url, params);
}
