-- Add free tier to plan_tier enum
DO $$ BEGIN
  ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'free';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add trial_ends_at to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Back-fill: existing trial users get 14 days from account creation
UPDATE public.subscriptions s
SET trial_ends_at = (
  SELECT created_at + interval '3 days'
  FROM auth.users u WHERE u.id = s.user_id
)
WHERE trial_ends_at IS NULL AND plan = 'trial';

-- Update handle_new_user to set trial_ends_at and bump credits for trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));

  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    search_credits_total,
    search_credits_used,
    credits_reset_at,
    trial_ends_at
  ) VALUES (
    NEW.id,
    'trial',          -- starts on Pro trial
    'trialing',
    250,              -- Pro-level credits during trial
    0,
    now() + interval '3 days',
    now() + interval '3 days'
  );
  RETURN NEW;
END; $$;
