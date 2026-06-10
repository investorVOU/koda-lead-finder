-- ── Numbers feature additions ──────────────────────────────────────────────────
-- Auto-renew, label, call forwarding, SMS templates, is_read flag, FTS index

-- virtual_numbers: new feature columns
ALTER TABLE public.virtual_numbers
  ADD COLUMN IF NOT EXISTS auto_renew          boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS label               text,
  ADD COLUMN IF NOT EXISTS call_forward_to     text,
  ADD COLUMN IF NOT EXISTS call_forward_enabled boolean      NOT NULL DEFAULT false;

-- sms_messages: read tracking + outbound direction already supported
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Full-text search on message body (enables fast ILIKE / text search)
CREATE INDEX IF NOT EXISTS idx_sms_body_fts
  ON public.sms_messages USING gin(to_tsvector('english', body));

-- SMS templates (per-user reusable message bodies)
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text         NOT NULL,
  body        text         NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT ALL                             ON public.sms_templates TO service_role;

CREATE POLICY "own templates" ON public.sms_templates
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
