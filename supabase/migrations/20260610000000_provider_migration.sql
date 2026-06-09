-- ── Multi-provider migration (Telnyx + SMSPool) ──────────────────────────────
-- Replaces Twilio-only design with a provider-agnostic schema.
-- Keeps twilio_sid column for backward compatibility.

-- 1. virtual_numbers: add provider + provider_sid
ALTER TABLE public.virtual_numbers
  ADD COLUMN IF NOT EXISTS provider     text NOT NULL DEFAULT 'telnyx',
  ADD COLUMN IF NOT EXISTS provider_sid text;

-- Partial unique index: only enforce when provider_sid is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_numbers_provider_sid
  ON public.virtual_numbers (provider_sid)
  WHERE provider_sid IS NOT NULL;

-- 2. sms_messages: drop old unique constraint so Telnyx messages don't need twilio_sid
ALTER TABLE public.sms_messages
  DROP CONSTRAINT IF EXISTS sms_messages_twilio_sid_key;

ALTER TABLE public.sms_messages
  ALTER COLUMN twilio_sid DROP NOT NULL;

ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS provider     text DEFAULT 'telnyx',
  ADD COLUMN IF NOT EXISTS provider_sid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_messages_provider_sid
  ON public.sms_messages (provider_sid)
  WHERE provider_sid IS NOT NULL;
