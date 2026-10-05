-- Marks that a visitor already received the automatic live-chat welcome (once per visitor).
ALTER TABLE public.support_visitor_sessions
  ADD COLUMN IF NOT EXISTS welcome_sent_at timestamptz;
