-- Optional WhatsApp consent is kept private and is never exposed to the browser.
CREATE TABLE public.checkout_whatsapp_opt_ins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.checkout_whatsapp_opt_ins FROM anon, authenticated;
GRANT ALL ON TABLE public.checkout_whatsapp_opt_ins TO service_role;

ALTER TABLE public.checkout_attempts
  ADD COLUMN whatsapp_recovery_claimed_at timestamptz,
  ADD COLUMN whatsapp_recovery_sent_at timestamptz,
  ADD COLUMN whatsapp_recovery_checked_at timestamptz;

CREATE INDEX checkout_attempts_whatsapp_recovery_due_idx
  ON public.checkout_attempts (started_at)
  WHERE status = 'initialized' AND whatsapp_recovery_checked_at IS NULL;
