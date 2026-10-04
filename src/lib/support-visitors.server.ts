import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "node:crypto";
import type { VisitorEventType } from "@/lib/visitor-events";
import { sendTelegram, telegramConfigured, telegramCall, operatorChatId } from "@/lib/telegram.server";

const db = supabaseAdmin as any;

// Must match hashVisitorToken() in support-chat.functions.ts.
const hashVisitorToken = (token: string) => createHash("sha256").update(token).digest("hex");


const NOTIFY_LABEL: Partial<Record<VisitorEventType, string>> = {
  finder_opened: "🔎 opened Finder",
  studio_opened: "🛠️ opened Studio",
  pricing_opened: "💰 looked at Pricing",
  signup_started: "👤 started signup",
  checkout_started: "💳 started checkout",
  chat_opened: "💬 opened the support chat",
};

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime/i;
const MAX_NEW_VISITOR_PINGS_PER_MINUTE = 30;

export function isBot(userAgent: string) {
  return !userAgent || BOT_RE.test(userAgent);
}

export function parseDevice(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Unknown";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}

function sourceLabel(s: { utm_source?: string | null; referrer?: string | null }) {
  if (s.utm_source) return s.utm_source;
  if (s.referrer) {
    try { return new URL(s.referrer).hostname.replace(/^www\./, ""); } catch { /* fall through */ }
  }
  return "Direct";
}

export const visitorLabel = (hash: string) => hash.slice(0, 4).toUpperCase();

const messageButton = (sessionId: string) => ({
  reply_markup: { inline_keyboard: [[{ text: "💬 Message visitor", callback_data: `msg:${sessionId}` }]] },
});

async function rememberThread(messageId: number | undefined, sessionId: string) {
  if (!messageId) return;
  await db.from("support_telegram_threads").upsert({ chat_id: operatorChatId(), message_id: messageId, session_id: sessionId });
}

export interface TrackInput {
  visitorToken: string;
  event: VisitorEventType;
  path: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  userAgent: string;
}

/** Records the event and pings Telegram. Never throws to the caller. */
export async function recordVisitorEvent(input: TrackInput) {
  try {
    if (isBot(input.userAgent)) return;
    const hash = hashVisitorToken(input.visitorToken);
    const now = new Date().toISOString();

    const { data: existing } = await db.from("support_visitor_sessions").select("*").eq("visitor_token_hash", hash).maybeSingle();
    let session = existing;
    let isNew = false;

    if (!session) {
      const { data: created, error } = await db.from("support_visitor_sessions").insert({
        visitor_token_hash: hash,
        landing_path: input.path,
        current_path: input.path,
        referrer: input.referrer?.slice(0, 500) || null,
        utm_source: input.utm?.source?.slice(0, 100) || null,
        utm_medium: input.utm?.medium?.slice(0, 100) || null,
        utm_campaign: input.utm?.campaign?.slice(0, 100) || null,
        device: parseDevice(input.userAgent),
      }).select("*").single();
      if (error) {
        // Lost a race with a parallel request; reload and treat as existing.
        const { data: again } = await db.from("support_visitor_sessions").select("*").eq("visitor_token_hash", hash).maybeSingle();
        if (!again) return;
        session = again;
      } else {
        session = created;
        isNew = true;
      }
    } else {
      await db.from("support_visitor_sessions").update({ current_path: input.path, last_seen_at: now }).eq("id", session.id);
    }

    const type: VisitorEventType = isNew ? "visitor_started" : input.event;
    if (type === "visitor_started" && !isNew) return;

    if (type !== "page_viewed" && type !== "visitor_started") {
      const { data: seen } = await db.from("support_visitor_events").select("id").eq("session_id", session.id).eq("type", type).limit(1);
      if (seen?.length) return; // each milestone notifies once per visitor
    }
    if (type === "page_viewed" && session.current_path === input.path && !isNew) return;

    await db.from("support_visitor_events").insert({ session_id: session.id, type, path: input.path });
    if (!telegramConfigured() || type === "page_viewed") return;

    const who = `Visitor ${visitorLabel(hash)}`;
    if (type === "visitor_started") {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await db.from("support_visitor_sessions").select("id", { count: "exact", head: true }).gte("created_at", since);
      if ((count ?? 0) > MAX_NEW_VISITOR_PINGS_PER_MINUTE) return;
      const sent = await sendTelegram(
        `🟢 NEW VISITOR\n\nPage: ${session.landing_path}\nSource: ${sourceLabel(session)}\nDevice: ${session.device}\nVisitor: ${visitorLabel(hash)}`,
        messageButton(session.id),
      );
      await rememberThread(sent?.message_id, session.id);
      return;
    }

    const { data: first } = await db.from("support_telegram_threads").select("message_id").eq("session_id", session.id).order("created_at", { ascending: true }).limit(1);
    const sent = await sendTelegram(
      `${who} ${NOTIFY_LABEL[type] ?? type}\n${input.path}`,
      { ...messageButton(session.id), ...(first?.[0] ? { reply_to_message_id: first[0].message_id, allow_sending_without_reply: true } : {}) },
    );
    await rememberThread(sent?.message_id, session.id);
  } catch (error) {
    console.error("visitor tracking failed", error instanceof Error ? error.message : error);
  }
}

/** Finds or creates the guest conversation for a visitor session so Telegram can write into the existing chat. */
export async function getOrCreateConversationForSession(sessionId: string) {
  const { data: session } = await db.from("support_visitor_sessions").select("visitor_token_hash").eq("id", sessionId).maybeSingle();
  if (!session) return null;
  const { data: existing } = await db.from("support_conversations").select("*").eq("visitor_token_hash", session.visitor_token_hash).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await db.from("support_conversations")
    .insert({ visitor_token_hash: session.visitor_token_hash, status: "human", human_requested_at: new Date().toISOString() })
    .select("*").single();
  if (error) {
    const { data: again } = await db.from("support_conversations").select("*").eq("visitor_token_hash", session.visitor_token_hash).maybeSingle();
    return again ?? null;
  }
  return created;
}

/** Inserts an operator message exactly like the admin inbox reply does (sender "agent"). */
export async function sendAgentMessageToSession(sessionId: string, content: string) {
  const conversation = await getOrCreateConversationForSession(sessionId);
  if (!conversation) return { error: "Visitor session not found." } as const;
  const now = new Date().toISOString();
  const { error } = await db.from("support_messages").insert({ conversation_id: conversation.id, sender: "agent", content: content.slice(0, 2000) });
  if (error) return { error: error.message } as const;
  await db.from("support_conversations")
    .update({ status: "human", agent_replied_at: now, updated_at: now })
    .eq("id", conversation.id);
  return { ok: true } as const;
}

/** Called when a visitor writes in the chat: relays to Telegram so the operator can answer there. */
export async function relayVisitorMessageToTelegram(visitorTokenHash: string | null | undefined, content: string) {
  try {
    if (!visitorTokenHash || !telegramConfigured()) return;
    const { data: session } = await db.from("support_visitor_sessions").select("id").eq("visitor_token_hash", visitorTokenHash).maybeSingle();
    if (!session) return;
    const sent = await sendTelegram(
      `💬 Visitor ${visitorLabel(visitorTokenHash)}:\n${content.slice(0, 1500)}\n\n(reply to this message to answer)`,
      messageButton(session.id),
    );
    await rememberThread(sent?.message_id, session.id);
  } catch (error) {
    console.error("telegram relay failed", error instanceof Error ? error.message : error);
  }
}

export { telegramCall };
