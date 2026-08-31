-- Kodarai is paid-only. New accounts must choose and pay for a plan before
-- they can use lead, Studio, or other product workflows.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    lower(left(replace(NEW.id::text, '-', ''), 8))
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

-- Remove trial access from accounts that never purchased a subscription.
UPDATE public.subscriptions
SET
  plan = 'none',
  status = 'pending_plan',
  search_credits_total = 0,
  search_credits_used = 0,
  trial_ends_at = NULL
WHERE plan = 'trial' OR status = 'trialing';

-- Retain the old RPC name only to return a clear failure to any stale client.
CREATE OR REPLACE FUNCTION public.activate_free_trial()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Free trials are not available. Choose a paid plan to continue.';
END;
$$;

REVOKE ALL ON FUNCTION public.activate_free_trial() FROM PUBLIC, anon, authenticated;

-- A credit pack does not independently unlock the product; an active paid
-- subscription is always required before a lead can be consumed.
CREATE OR REPLACE FUNCTION public.use_search_credit(p_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  v_total integer;
  v_used integer;
  v_topup integer;
BEGIN
  IF p_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub
  FROM public.subscriptions
  WHERE user_id = p_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id, plan, status, search_credits_total, search_credits_used, topup_credits
    ) VALUES (
      p_uid, 'none', 'pending_plan', 0, 0, 0
    ) RETURNING * INTO sub;
  END IF;

  IF sub.status NOT IN ('active', 'canceling') THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'plan_required');
  END IF;

  v_total := sub.search_credits_total;
  v_used := sub.search_credits_used;
  v_topup := sub.topup_credits;

  IF now() >= sub.credits_reset_at THEN
    v_used := 0;
    UPDATE public.subscriptions
    SET search_credits_used = 0,
        credits_reset_at = now() + interval '1 month'
    WHERE user_id = p_uid;
  END IF;

  IF v_used < v_total THEN
    UPDATE public.subscriptions
    SET search_credits_used = v_used + 1
    WHERE user_id = p_uid;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', (v_total - v_used - 1) + v_topup,
      'total', v_total
    );
  ELSIF v_topup > 0 THEN
    UPDATE public.subscriptions
    SET topup_credits = v_topup - 1
    WHERE user_id = p_uid;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_topup - 1, 'total', v_total);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.use_search_credit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.use_search_credit(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.use_search_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.use_search_credit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_search_credit(uuid) TO service_role;
