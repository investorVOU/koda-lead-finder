-- New users start with 0 credits and status=pending_plan until they pick a plan
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
    'trial',
    'pending_plan',
    0,
    0,
    now() + interval '3 days',
    NULL
  );
  RETURN NEW;
END; $$;

-- activate_free_trial: called when user selects free plan on choose-plan page
CREATE OR REPLACE FUNCTION public.activate_free_trial()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  UPDATE public.subscriptions
  SET
    plan             = 'trial',
    status           = 'trialing',
    search_credits_total = 2,
    search_credits_used  = 0,
    credits_reset_at = now() + interval '3 days',
    trial_ends_at    = now() + interval '3 days'
  WHERE user_id = v_uid;
END; $$;

GRANT EXECUTE ON FUNCTION public.activate_free_trial() TO authenticated;
