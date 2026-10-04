export const VISITOR_EVENT_TYPES = [
  "visitor_started", "page_viewed", "finder_opened", "studio_opened",
  "pricing_opened", "signup_started", "checkout_started", "chat_opened",
] as const;
export type VisitorEventType = (typeof VISITOR_EVENT_TYPES)[number];
