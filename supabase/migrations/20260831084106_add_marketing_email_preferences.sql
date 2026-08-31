-- Marketing messages are strictly opt-in. Existing accounts remain opted out.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_email_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_email_opted_in_at timestamptz;

CREATE TABLE IF NOT EXISTS public.marketing_campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_key, user_id)
);

ALTER TABLE public.marketing_campaign_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_campaign_sends FROM anon, authenticated;
GRANT ALL ON public.marketing_campaign_sends TO service_role;

CREATE INDEX IF NOT EXISTS marketing_campaign_sends_campaign_key_idx
  ON public.marketing_campaign_sends (campaign_key);

-- Preserve the paid-only account defaults while recording an explicit signup choice.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marketing_opt_in boolean := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'marketing_email_opt_in', '')::boolean,
    false
  );
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, referral_code, marketing_email_opt_in, marketing_email_opted_in_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    lower(left(replace(NEW.id::text, '-', ''), 8)),
    v_marketing_opt_in,
    CASE WHEN v_marketing_opt_in THEN now() ELSE NULL END
  );

  INSERT INTO public.subscriptions (
    user_id, plan, status, search_credits_total, search_credits_used,
    topup_credits, credits_reset_at, trial_ends_at
  ) VALUES (
    NEW.id, 'none', 'pending_plan', 0, 0,
    0, now() + interval '1 month', NULL
  );

  RETURN NEW;
END;
$$;
