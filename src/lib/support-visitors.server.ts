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


// ───────────────────────── Presence ─────────────────────────
const ONLINE_WINDOW_MS = 45_000;
const LEFT_AFTER_MS = 90_000;
const MAX_NOTIFY_AGE_MS = 60 * 60_000;

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${total % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function presenceLine(session: { last_seen_at: string; current_path?: string | null }) {
  const idle = Date.now() - new Date(session.last_seen_at).getTime();
  if (idle <= ONLINE_WINDOW_MS) return `🟢 online now${session.current_path ? ` on ${session.current_path}` : ""}`;
  return `⚪ offline, last seen ${formatDuration(idle)} ago (your message shows when they return)`;
}

const EVENT_SHORT: Partial<Record<VisitorEventType, string>> = {
  finder_opened: "Finder", studio_opened: "Studio", pricing_opened: "Pricing",
  signup_started: "Signup", checkout_started: "Checkout", chat_opened: "Chat",
};

let sweeperStarted = false;
function ensureSweeper() {
  if (sweeperStarted) return;
  sweeperStarted = true;
  // Render runs a long-lived Node process, so a lazy in-process timer is enough; it starts on the first heartbeat.
  const timer = setInterval(() => { void sweepLeftVisitors(); }, 30_000);
  (timer as any).unref?.();
}

/** Marks visitors who stopped sending heartbeats as "left" and tells the operator about the interesting ones. */
export async function sweepLeftVisitors() {
  try {
    if (!telegramConfigured()) return;
    const cutoff = new Date(Date.now() - LEFT_AFTER_MS).toISOString();
    const { data: stale } = await db.from("support_visitor_sessions").select("*")
      .is("left_notified_at", null).lt("last_seen_at", cutoff).limit(20);

    for (const session of stale ?? []) {
      // Claim atomically so two server instances never notify twice.
      const { data: claimed } = await db.from("support_visitor_sessions")
        .update({ left_notified_at: new Date().toISOString() })
        .eq("id", session.id).is("left_notified_at", null).select("id");
      if (!claimed?.length) continue;

      const lastSeen = new Date(session.last_seen_at).getTime();
      if (Date.now() - lastSeen > MAX_NOTIFY_AGE_MS) continue; // old session from before presence existed

      const [{ data: events }, { data: convo }, { data: operator }] = await Promise.all([
        db.from("support_visitor_events").select("type,path").eq("session_id", session.id).order("created_at", { ascending: true }).limit(100),
        db.from("support_conversations").select("id").eq("visitor_token_hash", session.visitor_token_hash).maybeSingle(),
        db.from("support_telegram_operator").select("active_session_id").eq("chat_id", operatorChatId()).maybeSingle(),
      ]);

      const did = Array.from(new Set((events ?? []).map((e: any) => EVENT_SHORT[e.type as VisitorEventType]).filter(Boolean))) as string[];
      const pages = Array.from(new Set((events ?? []).map((e: any) => e.path).filter(Boolean))).slice(0, 6) as string[];
      const stayed = lastSeen - new Date(session.created_at).getTime();
      const worthTelling = did.length > 0 || Boolean(convo) || stayed >= 60_000 || operator?.active_session_id === session.id;
      if (!worthTelling) continue;

      const sent = await sendTelegram(
        [
          `⚪ Visitor ${visitorLabel(session.visitor_token_hash)} left`,
          `Time on site: ${formatDuration(stayed)}`,
          pages.length ? `Pages: ${pages.join(", ")}` : "",
          did.length ? `Did: ${did.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
        messageButton(session.id),
      );
      await rememberThread(sent?.message_id, session.id);
    }
  } catch (error) {
    console.error("visitor sweep failed", error instanceof Error ? error.message : error);
  }
}

export interface PingResult {
  agent: { id: string; content: string; created_at: string } | null;
  /** Automatic welcome, returned at most once per visitor. */
  welcome: { id: string; content: string; created_at: string } | null;
}

// ───────────────────────── Automatic welcome ─────────────────────────
const WELCOME_DELAY_MS = 8_000; // let the visitor look around first; the 10s heartbeat delivers it
const NO_WELCOME_PATHS = /^\/(login|signup|privacy|terms|trial-welcome|welcome|onboarding)/;

function welcomeMessage(path: string) {
  if (path.startsWith("/start")) {
    return "Hey 👋 New here? You don't need to know how to code. KodarAI finds businesses that need a website and helps you build a sample to send them. Ask me anything.";
  }
  if (path.startsWith("/studio")) {
    return "Hey 👋 Building a website for a business? Tell me who it's for and I'll help you get the first version ready.";
  }
  if (path.startsWith("/numbers")) {
    return "Hey 👋 Need a virtual number? Tell me the country and what it's for and I'll help you pick one.";
  }
  return "Hey 👋 I'm the KodarAI assistant. Tell me if you've built websites before and I'll point you to the right first step.";
}

/** Heartbeat from the browser. Updates presence and returns the latest human reply so the widget can pop it out. */
export async function pingVisitor(input: { visitorToken: string; path: string }): Promise<PingResult> {
  try {
    const hash = hashVisitorToken(input.visitorToken);
    const { data: session } = await db.from("support_visitor_sessions").select("id,left_notified_at,created_at,welcome_sent_at").eq("visitor_token_hash", hash).maybeSingle();
    if (!session) return { agent: null, welcome: null };

    await db.from("support_visitor_sessions")
      .update({ last_seen_at: new Date().toISOString(), current_path: input.path, left_notified_at: null })
      .eq("id", session.id);
    ensureSweeper();

    if (session.left_notified_at && telegramConfigured()) {
      const { data: operator } = await db.from("support_telegram_operator").select("active_session_id").eq("chat_id", operatorChatId()).maybeSingle();
      if (operator?.active_session_id === session.id) {
        await sendTelegram(`🟢 Visitor ${visitorLabel(hash)} is back on ${input.path}`, messageButton(session.id));
      }
    }

    const { data: convo } = await db.from("support_conversations").select("id").eq("visitor_token_hash", hash).maybeSingle();

    // Welcome each visitor once, only if they have not already started a chat.
    let welcome: PingResult["welcome"] = null;
    const longEnough = Date.now() - new Date(session.created_at).getTime() >= WELCOME_DELAY_MS;
    if (!convo && !session.welcome_sent_at && longEnough && !NO_WELCOME_PATHS.test(input.path)) {
      const sentAt = new Date().toISOString();
      // Claim atomically so two heartbeats or server instances never send it twice.
      const { data: claimed } = await db.from("support_visitor_sessions")
        .update({ welcome_sent_at: sentAt }).eq("id", session.id).is("welcome_sent_at", null).select("id");
      if (claimed?.length) welcome = { id: `welcome-${session.id}`, content: welcomeMessage(input.path), created_at: sentAt };
    }

    if (!convo) return { agent: null, welcome };
    const { data: latest } = await db.from("support_messages").select("id,content,created_at")
      .eq("conversation_id", convo.id).eq("sender", "agent").order("created_at", { ascending: false }).limit(1);
    return { agent: latest?.[0] ?? null, welcome };
  } catch (error) {
    console.error("visitor ping failed", error instanceof Error ? error.message : error);
    return { agent: null, welcome: null };
  }
}
