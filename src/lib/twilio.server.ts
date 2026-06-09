/**
 * @deprecated — Replaced by Telnyx. This file is kept only so existing
 * payment webhook handlers (Stripe/Paystack) that call `activateVirtualNumber`
 * can still compile. Those webhooks internally call numbers.server.ts which
 * now uses Telnyx.
 *
 * Do NOT import getTwilioClient() — Twilio credentials are no longer set.
 */

export function getTwilioWebhookUrl(): string {
  // Redirected to the new Telnyx endpoint for any legacy callers
  const base = process.env.TELNYX_WEBHOOK_BASE_URL ?? "https://kodarai.xyz";
  return `${base}/api/webhooks/sms-incoming`;
}

export function validateTwilioSignature(
  _url: string,
  _params: Record<string, string>,
  _signature: string,
): boolean {
  // Twilio is no longer used — always return false so old webhook rejects
  return false;
}
