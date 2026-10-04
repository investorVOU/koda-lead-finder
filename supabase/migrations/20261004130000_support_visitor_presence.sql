-- Presence tracking: lets the server tell when a visitor has left.
ALTER TABLE public.support_visitor_sessions
  ADD COLUMN IF NOT EXISTS left_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS support_visitor_sessions_active_idx
  ON public.support_visitor_sessions (last_seen_at)
  WHERE left_notified_at IS NULL;
