import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { operatorChatId, telegramCall, verifyTelegramSecret } from "@/lib/telegram.server";
import {
  getTelegramActiveVisitors,
  getTelegramVisitorStats,
  presenceLine,
  sendAgentMessageToSession,
  visitorLabel,
} from "@/lib/support-visitors.server";

const db = supabaseAdmin as any;
const ok = () => new Response("ok", { status: 200 });

const QUICK_REPLIES: Record<string, string> = {
  "no-code": "You do not need to know how to code to get started. KodarAI helps you find businesses that need a website and create a sample website to show them. You choose who to contact, discuss the work with the business, and agree a price directly.",
  starter: "The Starter plan is ₦2,000 for 30-day access. It includes lead searches, Studio credits, the website builder, outreach scripts, and a pipeline to manage opportunities. You will see the plan details before payment.",
  example: "An example lead is a local business that may not have a website yet. KodarAI helps you research the opportunity, create a sample website, and prepare a pitch. Any price you ask the business to pay is agreed directly with them and is not guaranteed.",
};

async function sessionInfo(sessionId: string) {
  const { data } = await db.from("support_visitor_sessions").select("visitor_token_hash,last_seen_at,current_path").eq("id", sessionId).maybeSingle();
  return data
    ? { label: visitorLabel(data.visitor_token_hash), presence: presenceLine(data) }
    : { label: "visitor", presence: "" };
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
          const callbackData = String(callback.data ?? "");
          const sessionId = callbackData.startsWith("msg:") ? callbackData.slice(4) : null;
          if (sessionId) {
            await db.from("support_telegram_operator").upsert({ chat_id: chatId, active_session_id: sessionId, updated_at: new Date().toISOString() });
            await telegramCall("answerCallbackQuery", { callback_query_id: callback.id, text: "Now messaging this visitor" });
            const info = await sessionInfo(sessionId);
            await telegramCall("sendMessage", {
              chat_id: chatId,
              text: `✍️ Now messaging Visitor ${info.label}\n${info.presence}\nType your message. It pops up on their screen.`,
            });
          }
          const quick = callbackData.match(/^quick:(no-code|starter|example):(.+)$/);
          if (quick) {
            const [, replyType, quickSessionId] = quick;
            const reply = QUICK_REPLIES[replyType];
            const result = reply ? await sendAgentMessageToSession(quickSessionId, reply) : { error: "Reply not found." };
            const info = await sessionInfo(quickSessionId);
            await telegramCall("answerCallbackQuery", {
              callback_query_id: callback.id,
              text: "error" in result ? "Could not send reply" : "Reply sent",
            });
            await telegramCall("sendMessage", {
              chat_id: chatId,
              text: "error" in result ? `⚠️ Not delivered: ${result.error}` : `✅ Quick reply sent to Visitor ${info.label}\n${info.presence}`,
              reply_to_message_id: callback.message.message_id,
            });
          }
          return ok();
        }

        const message = update?.message;
        if (!message || message.chat?.id !== chatId || typeof message.text !== "string") return ok();
        const text = message.text.trim();
        const command = text.split(/\s/, 1)[0].toLowerCase().replace(/@[^\s]+$/, "");
        if (command === "/active") {
          await telegramCall("sendMessage", { chat_id: chatId, text: await getTelegramActiveVisitors() });
          return ok();
        }
        if (command === "/stats") {
          await telegramCall("sendMessage", { chat_id: chatId, text: await getTelegramVisitorStats() });
          return ok();
        }
        if (command === "/help" || command === "/start") {
          await telegramCall("sendMessage", {
            chat_id: chatId,
            text: "KodarAI visitor bot\n\n/active — visitors online now\n/stats — today's visitor funnel\n\nTap Message visitor on an alert, reply directly to an alert, or use a quick-reply button.",
          });
          return ok();
        }
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
        const info = await sessionInfo(sessionId);
        await telegramCall("sendMessage", {
          chat_id: chatId,
          text: "error" in result ? `⚠️ Not delivered: ${result.error}` : `✅ Sent to Visitor ${info.label}\n${info.presence}`,
          reply_to_message_id: message.message_id,
        });
        return ok();
      },
    },
  },
});
