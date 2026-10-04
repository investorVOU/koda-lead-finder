import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { operatorChatId, telegramCall, verifyTelegramSecret } from "@/lib/telegram.server";
import { sendAgentMessageToSession, visitorLabel } from "@/lib/support-visitors.server";

const db = supabaseAdmin as any;
const ok = () => new Response("ok", { status: 200 });

async function labelFor(sessionId: string) {
  const { data } = await db.from("support_visitor_sessions").select("visitor_token_hash").eq("id", sessionId).maybeSingle();
  return data ? visitorLabel(data.visitor_token_hash) : "visitor";
}

/**
 * Telegram bot webhook. Register with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://kodarai.xyz/api/public/webhooks/telegram-support&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 * Only the configured operator chat is ever served.
 */
export const Route = createFileRoute("/api/public/webhooks/telegram-support")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyTelegramSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
          return new Response("Unauthorized", { status: 401 });
        }
        let update: any;
        try { update = await request.json(); } catch { return ok(); }
        const chatId = operatorChatId();

        // "💬 Message visitor" button
        const callback = update?.callback_query;
        if (callback) {
          if (callback.message?.chat?.id !== chatId) return ok();
          const sessionId = String(callback.data ?? "").startsWith("msg:") ? String(callback.data).slice(4) : null;
          if (sessionId) {
            await db.from("support_telegram_operator").upsert({ chat_id: chatId, active_session_id: sessionId, updated_at: new Date().toISOString() });
            await telegramCall("answerCallbackQuery", { callback_query_id: callback.id, text: "Now messaging this visitor" });
            await telegramCall("sendMessage", {
              chat_id: chatId,
              text: `✍️ Now messaging Visitor ${await labelFor(sessionId)}. Type your message — it appears in their support chat.`,
            });
          }
          return ok();
        }

        const message = update?.message;
        if (!message || message.chat?.id !== chatId || typeof message.text !== "string") return ok();
        const text = message.text.trim();
        if (!text || text.startsWith("/")) return ok();

        // Replying to a notification targets that visitor; otherwise use the visitor chosen via the button.
        let sessionId: string | null = null;
        const repliedTo = message.reply_to_message?.message_id;
        if (repliedTo) {
          const { data } = await db.from("support_telegram_threads").select("session_id").eq("chat_id", chatId).eq("message_id", repliedTo).maybeSingle();
          sessionId = data?.session_id ?? null;
        }
        if (!sessionId) {
          const { data } = await db.from("support_telegram_operator").select("active_session_id").eq("chat_id", chatId).maybeSingle();
          sessionId = data?.active_session_id ?? null;
        }
        if (!sessionId) {
          await telegramCall("sendMessage", { chat_id: chatId, text: "Tap “💬 Message visitor” on a notification first, or reply directly to one." });
          return ok();
        }

        const result = await sendAgentMessageToSession(sessionId, text);
        await telegramCall("sendMessage", {
          chat_id: chatId,
          text: "error" in result ? `⚠️ Not delivered: ${result.error}` : `✅ Sent to Visitor ${await labelFor(sessionId)}`,
          reply_to_message_id: message.message_id,
        });
        return ok();
      },
    },
  },
});
