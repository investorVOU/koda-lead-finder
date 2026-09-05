import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { pollSMSPoolInbox } from "@/lib/services/phone-numbers";

/**
 * SMSPool polling endpoint.
 * Called by the SmsInbox client every 5 seconds for SMSPool numbers.
 * Auth: Authorization: Bearer <supabase_access_token>
 *
 * GET /api/smspool/poll/:numberId
 * Returns: { status: "waiting" | "received" | "expired", sms?: string }
 */
export const Route = createFileRoute("/api/smspool/poll/$numberId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { numberId } = params;

        // Auth via Bearer token
        const token = request.headers.get("Authorization")?.replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized" }, 401);

        const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !user) return json({ error: "Unauthorized" }, 401);

        // Load the number record
        const { data: num } = await supabaseAdmin
          .from("virtual_numbers")
          .select("id, user_id, provider_sid, twilio_sid, phone_number, status, expires_at")
          .eq("id", numberId)
          .eq("user_id", user.id)
          .eq("provider", "smspool")
          .maybeSingle();

        if (!num) return json({ error: "Not found" }, 404);

        // Already expired / released
        if (num.status === "expired" || num.status === "released") {
          return json({ status: "expired" });
        }

        // Check if number has exceeded 20-minute window
        if (num.expires_at && new Date(num.expires_at) < new Date()) {
          await supabaseAdmin
            .from("virtual_numbers")
            .update({ status: "expired" })
            .eq("id", num.id);
          return json({ status: "expired" });
        }

        const orderId = num.provider_sid ?? num.twilio_sid;
        if (!orderId || orderId.startsWith("pending_") || orderId.startsWith("smspool_pending_")) {
          return json({ status: "waiting" });
        }

        // Poll SMSPool once
        const smsText = await pollSMSPoolInbox(orderId);

        if (smsText) {
          // Persist message → Supabase realtime will push to client inbox
          await supabaseAdmin.from("sms_messages").insert({
            number_id:    num.id,
            user_id:      num.user_id,
            provider:     "smspool",
            provider_sid: `${orderId}_${Date.now()}`,
            direction:    "inbound",
            from_number:  "SMSPool",
            to_number:    num.phone_number,
            body:         smsText,
            status:       "received",
          });
          // Keep the temp number active until its expires_at countdown ends.

          return json({ status: "received", sms: smsText });
        }

        return json({ status: "waiting" });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
