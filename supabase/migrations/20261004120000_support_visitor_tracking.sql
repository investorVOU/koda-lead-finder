-- Anonymous visitor tracking + Telegram operator bridge for the existing support chat.
-- Additive only. All access is through server functions using the service role.

CREATE TABLE public.support_visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token_hash text NOT NULL UNIQUE,
  landing_path text,
  current_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_visitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_visitor_sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'visitor_started','page_viewed','finder_opened','studio_opened',
    'pricing_opened','signup_started','checkout_started','chat_opened'
  )),
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_visitor_events_session_idx
  ON public.support_visitor_events (session_id, created_at DESC);

-- Maps Telegram messages back to visitor sessions so operator replies route correctly.
CREATE TABLE public.support_telegram_threads (
  chat_id bigint NOT NULL,
  message_id bigint NOT NULL,
  session_id uuid NOT NULL REFERENCES public.support_visitor_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, message_id)
);

-- The visitor the operator is currently talking to (set by the "Message visitor" button).
CREATE TABLE public.support_telegram_operator (
  chat_id bigint PRIMARY KEY,
  active_session_id uuid REFERENCES public.support_visitor_sessions(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_telegram_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_telegram_operator ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_visitor_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_visitor_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_telegram_threads FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_telegram_operator FROM anon, authenticated;
GRANT ALL ON TABLE public.support_visitor_sessions TO service_role;
GRANT ALL ON TABLE public.support_visitor_events TO service_role;
GRANT ALL ON TABLE public.support_telegram_threads TO service_role;
GRANT ALL ON TABLE public.support_telegram_operator TO service_role;
