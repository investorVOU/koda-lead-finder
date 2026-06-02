DROP FUNCTION IF EXISTS public.use_search_credit();

CREATE OR REPLACE FUNCTION public.use_search_credit(p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  v_total int;
  v_used int;
BEGIN
  IF p_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id) VALUES (p_uid) RETURNING * INTO sub;
  END IF;

  v_total := sub.search_credits_total;
  v_used := sub.search_credits_used;

  IF now() >= sub.credits_reset_at THEN
    v_used := 0;
    UPDATE public.subscriptions
      SET search_credits_used = 0, credits_reset_at = now() + interval '1 month'
      WHERE user_id = p_uid;
  END IF;

  IF v_used >= v_total THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'total', v_total);
  END IF;

  UPDATE public.subscriptions SET search_credits_used = v_used + 1 WHERE user_id = p_uid;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_total - v_used - 1, 'total', v_total);
END; $$;

REVOKE ALL ON FUNCTION public.use_search_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_search_credit(uuid) TO service_role;