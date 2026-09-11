-- Ad-acquired users who reach the plan picker can receive a short activation
-- sequence. This is private operational data and is only read server-side.
CREATE TABLE public.plan_activation_enrollments (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_choose_plan_at timestamptz NOT NULL DEFAULT now(),
  last_choose_plan_at timestamptz NOT NULL DEFAULT now(),
  acquisition_source text NOT NULL DEFAULT 'ads'
);

ALTER TABLE public.plan_activation_enrollments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_activation_enrollments FROM anon, authenticated;
GRANT ALL ON public.plan_activation_enrollments TO service_role;

CREATE INDEX plan_activation_enrollments_first_choose_plan_at_idx
  ON public.plan_activation_enrollments (first_choose_plan_at);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_email_unsubscribed_at timestamptz;

ALTER TABLE public.marketing_campaign_sends
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX marketing_campaign_sends_plan_activation_idx
  ON public.marketing_campaign_sends (campaign_key, sent_at)
  WHERE campaign_key LIKE 'plan-activation-%';
