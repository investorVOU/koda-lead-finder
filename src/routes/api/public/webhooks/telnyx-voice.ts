import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhook } from "@/lib/telnyx.server";

/**
 * Telnyx inbound voice call webhook — handles call forwarding.
 *
 * In your Telnyx Dashboard:
 *   1. Create a "Call Control Application"
 *   2. Set its webhook to: https://kodarai.xyz/api/public/webhooks/telnyx-voice
 *   3. Assign your virtual numbers to this application
 *
 * When a call comes in and `call_forward_enabled = true`, we answer then
 * transfer the call to the stored `call_forward_to` number.
 */
export const Route = createFileRoute("/api/public/webhooks/telnyx-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody   = await request.text();
        const sigHeader = request.headers.get("telnyx-signature-ed25519") ?? "";
        const tsHeader  = request.headers.get("telnyx-timestamp") ?? "";

        const valid = await verifyTelnyxWebhook(rawBody, sigHeader, tsHeader);
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let payload: unknown;
        try { payload = JSON.parse(rawBody); } catch { return ok(); }

        const data      = (payload as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const eventType = data?.event_type as string | undefined;

        // Only handle call.initiated (new inbound call)
        if (eventType !== "call.initiated") return ok();

        const callPayload    = data?.payload as Record<string, unknown> | undefined;
        if (!callPayload) return ok();

        const callControlId  = callPayload.call_control_id as string | undefined;
        const callLegId      = callPayload.call_leg_id as string | undefined;
        const toNumber       = (callPayload.to as string) ?? "";
        const direction      = callPayload.direction as string | undefined;

        // Only handle inbound calls
        if (direction !== "incoming" || !callControlId || !toNumber) return ok();

        // Look up our virtual number by the called-to number
        const { data: num } = await supabaseAdmin
          .from("virtual_numbers")
          .select("call_forward_to, call_forward_enabled, provider")
          .eq("phone_number", toNumber)
          .eq("status", "active")
          .maybeSingle();

        const apiKey = process.env.TELNYX_API_KEY;
        if (!apiKey) return ok();

        const telnyxBase = "https://api.telnyx.com/v2";
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        // Step 1: Always answer the call first
        await fetch(`${telnyxBase}/calls/${callControlId}/actions/answer`, {
          method: "POST",
          headers,
          body: JSON.stringify({ client_state: "answered" }),
        }).catch(() => {});

        if (num?.call_forward_enabled && num?.call_forward_to) {
          // Step 2: Transfer to the forwarding number
          await fetch(`${telnyxBase}/calls/${callControlId}/actions/transfer`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              to: num.call_forward_to,
              webhook_url: `https://kodarai.xyz/api/public/webhooks/telnyx-voice`,
            }),
          }).catch(() => {});
        } else {
          // No forwarding configured — play a message and hang up
          await fetch(`${telnyxBase}/calls/${callControlId}/actions/speak`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              payload: "This number does not accept voice calls.",
              voice: "female",
              language: "en-US",
            }),
          }).catch(() => {});
        }

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
