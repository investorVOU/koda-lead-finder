-- Virtual phone numbers
CREATE TABLE public.virtual_numbers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_sid      text NOT NULL UNIQUE,
  phone_number    text NOT NULL,
  friendly_name   text,
  country_code    text NOT NULL,
  number_type     text NOT NULL DEFAULT 'local',
  status          text NOT NULL DEFAULT 'pending_payment', -- pending_payment | active | released
  monthly_usd     numeric(8,2) NOT NULL DEFAULT 3.99,
  monthly_ngn     numeric(10,2) NOT NULL DEFAULT 6500,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_numbers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_numbers TO authenticated;
GRANT ALL ON public.virtual_numbers TO service_role;

CREATE POLICY "own numbers" ON public.virtual_numbers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER virtual_numbers_updated_at
  BEFORE UPDATE ON public.virtual_numbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inbound SMS messages
CREATE TABLE public.sms_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id      uuid NOT NULL REFERENCES public.virtual_numbers(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_sid     text UNIQUE,
  direction      text NOT NULL DEFAULT 'inbound',
  from_number    text NOT NULL,
  to_number      text NOT NULL,
  body           text NOT NULL,
  status         text NOT NULL DEFAULT 'received',
  received_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;

CREATE POLICY "own sms" ON public.sms_messages
  USING (auth.uid() = user_id);

CREATE INDEX idx_sms_number_time ON public.sms_messages (number_id, received_at DESC);
