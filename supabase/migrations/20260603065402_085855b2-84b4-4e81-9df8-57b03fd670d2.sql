-- 1. Convert plan to flexible text tiers and remove free-trial defaults
ALTER TABLE public.subscriptions ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN plan TYPE text USING plan::text;
ALTER TABLE public.subscriptions ALTER COLUMN plan SET DEFAULT 'none';
ALTER TABLE public.subscriptions ALTER COLUMN search_credits_total SET DEFAULT 0;
ALTER TABLE public.subscriptions ALTER COLUMN status SET DEFAULT 'inactive';
ALTER TABLE public.subscriptions ALTER COLUMN credits_reset_at SET DEFAULT (now() + interval '1 month');

-- One-time purchased leads that never reset
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS topup_credits integer NOT NULL DEFAULT 0;
-- Paystack subscription email token (needed to disable a subscription)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_token text;

-- Migrate legacy trial rows to the new "none" plan
UPDATE public.subscriptions SET plan = 'none' WHERE plan = 'trial';

-- 2. Payment history / invoices
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_reference text,
  kind text NOT NULL,
  description text,
  plan_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  credits_granted integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_history TO authenticated;
GRANT ALL ON public.payment_history TO service_role;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payment history select"
  ON public.payment_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_payment_history_user ON public.payment_history (user_id, created_at DESC);

-- 3. Webhook idempotency (service_role only)
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 4. Cached provider plan codes (Paystack recurring plans)
CREATE TABLE public.provider_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  plan_id text NOT NULL,
  cycle text NOT NULL DEFAULT 'monthly',
  provider_plan_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider, plan_id, cycle)
);
GRANT ALL ON public.provider_plans TO service_role;
ALTER TABLE public.provider_plans ENABLE ROW LEVEL SECURITY;

-- 5. New signups start with zero leads, inactive plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.subscriptions (user_id, plan, status, search_credits_total, search_credits_used, topup_credits)
  VALUES (NEW.id, 'none', 'inactive', 0, 0, 0);
  RETURN NEW;
END; $function$;

-- 6. Consume monthly subscription leads first, then top-up leads
CREATE OR REPLACE FUNCTION public.use_search_credit(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub public.subscriptions%ROWTYPE;
  v_total int;
  v_used int;
  v_topup int;
BEGIN
  IF p_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, status, search_credits_total, search_credits_used, topup_credits)
    VALUES (p_uid, 'none', 'inactive', 0, 0, 0) RETURNING * INTO sub;
  END IF;

  v_total := sub.search_credits_total;
  v_used := sub.search_credits_used;
  v_topup := sub.topup_credits;

  -- Reset monthly allowance for active subscriptions
  IF sub.plan <> 'none' AND now() >= sub.credits_reset_at THEN
    v_used := 0;
    UPDATE public.subscriptions
      SET search_credits_used = 0, credits_reset_at = now() + interval '1 month'
      WHERE user_id = p_uid;
  END IF;

  IF v_used < v_total THEN
    UPDATE public.subscriptions SET search_credits_used = v_used + 1 WHERE user_id = p_uid;
    RETURN jsonb_build_object('allowed', true, 'remaining', (v_total - v_used - 1) + v_topup, 'total', v_total);
  ELSIF v_topup > 0 THEN
    UPDATE public.subscriptions SET topup_credits = v_topup - 1 WHERE user_id = p_uid;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_topup - 1, 'total', v_total);
  ELSE
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'total', v_total);
  END IF;
END; $function$;