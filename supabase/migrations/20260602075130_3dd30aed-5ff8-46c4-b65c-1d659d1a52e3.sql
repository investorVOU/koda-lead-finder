-- Enums
CREATE TYPE public.plan_tier AS ENUM ('trial', 'pro', 'max');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'proposal', 'closed');

-- Helper: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  company text,
  primary_niche text,
  target_location text,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'trialing',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  search_credits_total integer NOT NULL DEFAULT 20,
  search_credits_used integer NOT NULL DEFAULT 0,
  credits_reset_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sub select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SAVED LEADS
CREATE TABLE public.saved_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id text,
  business_name text NOT NULL,
  address text,
  phone text,
  rating numeric(2,1),
  review_count integer DEFAULT 0,
  has_website boolean NOT NULL DEFAULT false,
  website_url text,
  maps_url text,
  category text,
  location text,
  status public.lead_status NOT NULL DEFAULT 'new',
  notes text,
  ai_prompt text,
  call_script text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_leads TO authenticated;
GRANT ALL ON public.saved_leads TO service_role;
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leads select" ON public.saved_leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own leads insert" ON public.saved_leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own leads update" ON public.saved_leads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own leads delete" ON public.saved_leads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER saved_leads_updated_at BEFORE UPDATE ON public.saved_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEARCH LOGS
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text,
  location text,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_logs TO authenticated;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.search_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_search_logs_user_time ON public.search_logs (user_id, created_at DESC);

-- New user trigger: profile + trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic credit consumption with monthly/period reset
CREATE OR REPLACE FUNCTION public.use_search_credit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  sub public.subscriptions%ROWTYPE;
  v_total int;
  v_used int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id) VALUES (v_uid) RETURNING * INTO sub;
  END IF;

  v_total := sub.search_credits_total;
  v_used := sub.search_credits_used;

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