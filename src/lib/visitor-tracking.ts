import { pingVisitorPresence, trackVisitor } from "@/lib/support-visitors.functions";
import type { VisitorEventType } from "@/lib/visitor-events";

// Same key the support widget uses, so the visitor session and the guest chat share one identity.
const GUEST_TOKEN_KEY = "kodarai_support_guest_token";

type ClientEvent = Exclude<VisitorEventType, "visitor_started">;

function getOrCreateToken(): string | null {
  try {
    let token = window.localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      token = crypto.randomUUID();
      window.localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

/** Fire-and-forget. Never throws, never blocks rendering. */
export function trackVisitorEvent(event: ClientEvent) {
  if (typeof window === "undefined") return;
  const visitorToken = getOrCreateToken();
  if (!visitorToken) return;
  const params = new URLSearchParams(window.location.search);
  void trackVisitor({
    data: {
      visitorToken,
      event,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      utm: {
        source: params.get("utm_source") ?? undefined,
        medium: params.get("utm_medium") ?? undefined,
        campaign: params.get("utm_campaign") ?? undefined,
      },
    },
  }).catch(() => undefined);
}

export function eventForPath(pathname: string): ClientEvent {
  if (pathname.startsWith("/leads")) return "finder_opened";
  if (pathname.startsWith("/studio")) return "studio_opened";
  if (pathname.startsWith("/choose-plan") || pathname.startsWith("/billing")) return "pricing_opened";
  if (pathname.startsWith("/signup")) return "signup_started";
  return "page_viewed";
}

export const AGENT_MESSAGE_EVENT = "kodarai:agent-message";
export type AgentMessageDetail = { id: string; content: string; created_at: string };

const HEARTBEAT_MS = 10_000;

/**
 * Heartbeat while the tab is visible. Tells the server the visitor is still here and
 * broadcasts any new human reply so the chat widget can pop it out. Returns a cleanup function.
 */
export function startPresence(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const ping = async () => {
    if (document.visibilityState !== "visible") return;
    const visitorToken = getOrCreateToken();
    if (!visitorToken) return;
    try {
      const result = await pingVisitorPresence({ data: { visitorToken, path: window.location.pathname } });
      if (result?.agent) window.dispatchEvent(new CustomEvent<AgentMessageDetail>(AGENT_MESSAGE_EVENT, { detail: result.agent }));
    } catch {
      // Presence is best-effort.
    }
  };
  const onVisible = () => { if (document.visibilityState === "visible") void ping(); };
  void ping();
  const interval = window.setInterval(ping, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisible);
  return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
}
