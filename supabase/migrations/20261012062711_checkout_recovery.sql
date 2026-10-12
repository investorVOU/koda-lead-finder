-- Server-side record of successful Paystack checkout initializations.
-- This is operational funnel data: browser analytics alone cannot tell us
-- whether Paystack generated a checkout session or whether that session paid.
CREATE TABLE public.checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  provider_reference text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('subscription', 'pack')),
  plan_id text NOT NULL,
  billing_cycle text,
  renewal_mode text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'initialized' CHECK (status IN ('initialized', 'paid')),
  started_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  recovery_claimed_at timestamptz,
  recovery_sent_at timestamptz
);

CREATE INDEX checkout_attempts_recovery_due_idx
  ON public.checkout_attempts (started_at)
  WHERE status = 'initialized' AND recovery_sent_at IS NULL;

CREATE INDEX checkout_attempts_user_recent_idx
  ON public.checkout_attempts (user_id, started_at DESC);

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.checkout_attempts FROM anon, authenticated;
GRANT ALL ON TABLE public.checkout_attempts TO service_role;
