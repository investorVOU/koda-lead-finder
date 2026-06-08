-- Fix activate_free_trial: give 250 credits (full Pro experience for 3 days)
CREATE OR REPLACE FUNCTION public.activate_free_trial()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  UPDATE public.subscriptions
  SET
    plan                 = 'trial',
    status               = 'trialing',
    search_credits_total = 250,
    search_credits_used  = 0,
    credits_reset_at     = now() + interval '3 days',
    trial_ends_at        = now() + interval '3 days'
  WHERE user_id = v_uid;
END; $$;

GRANT EXECUTE ON FUNCTION public.activate_free_trial() TO authenticated;

-- Fix use_search_credit: block searches when trial has expired, auto-downgrade to 0
CREATE OR REPLACE FUNCTION public.use_search_credit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  sub   public.subscriptions%ROWTYPE;
  v_total int;
  v_used  int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id) VALUES (v_uid) RETURNING * INTO sub;
  END IF;

  -- Trial expired: downgrade to free (0 credits) and block
  IF sub.plan = 'trial' AND sub.trial_ends_at IS NOT NULL AND now() > sub.trial_ends_at THEN
    UPDATE public.subscriptions
    SET plan = 'free', status = 'expired', search_credits_total = 0, search_credits_used = 0
    WHERE user_id = v_uid;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'trial_expired');
  END IF;

  v_total := sub.search_credits_total;
  v_used  := sub.search_credits_used;

  -- Monthly reset (for paid plans)
  IF now() >= sub.credits_reset_at THEN
    v_used := 0;
    UPDATE public.subscriptions
    SET search_credits_used = 0, credits_reset_at = now() + interval '1 month'
    WHERE user_id = v_uid;
  END IF;

  IF v_used >= v_total THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'total', v_total);
  END IF;

  UPDATE public.subscriptions SET search_credits_used = v_used + 1 WHERE user_id = v_uid;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_total - v_used - 1, 'total', v_total);
END; $$;

REVOKE ALL ON FUNCTION public.use_search_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_search_credit() TO authenticated;
