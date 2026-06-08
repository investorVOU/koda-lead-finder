import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateTwilioSignature } from "@/lib/twilio.server";

export const Route = createFileRoute("/api/public/webhooks/twilio-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = request.url;
        const signature = request.headers.get("x-twilio-signature") ?? "";
        const body = await request.text();

        // Parse form-encoded body
        const params: Record<string, string> = {};
        for (const [k, v] of new URLSearchParams(body)) params[k] = v;

        // Validate Twilio signature
        if (process.env.NODE_ENV !== "development" && !validateTwilioSignature(url, params, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const messageSid = params.MessageSid ?? "";
        const from       = params.From ?? "";
        const to         = params.To ?? "";
        const body_text  = params.Body ?? "";

        if (!to) return twiml();

        // Find the virtual number record
        const { data: numRow } = await supabaseAdmin
          .from("virtual_numbers")
          .select("id, user_id")
          .eq("phone_number", to)
          .eq("status", "active")
          .maybeSingle();

        if (!numRow) return twiml();

        // Store message (ignore duplicate SIDs)
        await supabaseAdmin.from("sms_messages").upsert(
          {
            number_id:   numRow.id,
            user_id:     numRow.user_id,
            twilio_sid:  messageSid,
            direction:   "inbound",
            from_number: from,
            to_number:   to,
            body:        body_text,
            status:      "received",
          },
          { onConflict: "twilio_sid", ignoreDuplicates: true },
        );

        return twiml();
      },
    },
  },
});

function twiml() {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
