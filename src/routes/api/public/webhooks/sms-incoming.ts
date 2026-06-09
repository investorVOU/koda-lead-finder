import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhook } from "@/lib/telnyx.server";
import { extractOTP, detectService } from "@/lib/sms-utils";

/**
 * Telnyx inbound SMS webhook.
 * Set your Telnyx Messaging Profile webhook to:
 *   https://kodarai.xyz/api/webhooks/sms-incoming
 *
 * Telnyx retries for up to 72 hours if it doesn't get a 200.
 * Always return 200 as soon as auth passes.
 */
export const Route = createFileRoute("/api/public/webhooks/sms-incoming")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody  = await request.text();
        const sigHeader = request.headers.get("telnyx-signature-ed25519") ?? "";
        const tsHeader  = request.headers.get("telnyx-timestamp") ?? "";

        // Verify signature (skipped in dev, enforced in prod when TELNYX_WEBHOOK_SECRET is set)
        const valid = await verifyTelnyxWebhook(rawBody, sigHeader, tsHeader);
        if (!valid) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return ok();
        }

        const data = (payload as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const eventType = data?.event_type as string | undefined;

        // Only handle inbound SMS
        if (eventType !== "message.received") return ok();

        const msgPayload = data?.payload as Record<string, unknown> | undefined;
        if (!msgPayload) return ok();

        const from     = (msgPayload.from as { phone_number?: string })?.phone_number ?? "";
        const toArr    = msgPayload.to as Array<{ phone_number?: string }> | undefined;
        const to       = toArr?.[0]?.phone_number ?? "";
        const body     = (msgPayload.text as string) ?? "";
        const sid      = (msgPayload.id as string) ?? `telnyx_${Date.now()}`;

        if (!to || !body) return ok();

        // Find the virtual number in our DB by the "to" number
        const { data: numRow } = await supabaseAdmin
          .from("virtual_numbers")
          .select("id, user_id")
          .eq("phone_number", to)
          .eq("status", "active")
          .maybeSingle();

        if (!numRow) return ok();

        // Detect OTP and service metadata
        const otp     = extractOTP(body);
        const service = detectService(from);

        // Store message (idempotent via provider_sid unique index)
        await supabaseAdmin
          .from("sms_messages")
          .upsert(
            {
              number_id:    numRow.id,
              user_id:      numRow.user_id,
              provider:     "telnyx",
              provider_sid: sid,
              twilio_sid:   null,
              direction:    "inbound",
              from_number:  from,
              to_number:    to,
              body:
                otp && service
                  ? body
                  : body,   // store raw body, OTP extraction is done at display time
              status: "received",
            },
            { onConflict: "provider_sid", ignoreDuplicates: true },
          );

        return ok();
      },
    },
  },
});

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
