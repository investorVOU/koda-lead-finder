-- 1. Follow-up date on saved leads
ALTER TABLE public.saved_leads
  ADD COLUMN IF NOT EXISTS follow_up_at date;

-- 2. Referral code on profiles (derived from user id — 8-char deterministic slug)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Back-fill existing profiles
UPDATE public.profiles
  SET referral_code = lower(left(replace(id::text, '-', ''), 8))
  WHERE referral_code IS NULL;

-- 3. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credited    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referee_id)          -- one referrer per new user
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- 4. Update handle_new_user to set referral_code automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    lower(left(replace(NEW.id::text, '-', ''), 8))
  );

  INSERT INTO public.subscriptions (
    user_id, plan, status,
    search_credits_total, search_credits_used,
    credits_reset_at, trial_ends_at
  ) VALUES (
    NEW.id, 'trial', 'trialing',
    250, 0,
    now() + interval '3 days',
    now() + interval '3 days'
  );
  RETURN NEW;
END; $$;
