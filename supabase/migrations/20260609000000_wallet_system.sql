-- Wallet balance on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Number purchase/topup transactions log
CREATE TABLE IF NOT EXISTS public.number_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,           -- 'topup' | 'purchase' | 'renewal' | 'refund'
  amount      numeric(12,2) NOT NULL,  -- positive = credit, negative = debit (NGN)
  provider    text,
  number      text,
  balance_before numeric(12,2),
  balance_after  numeric(12,2),
  description text,
  reference   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.number_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.number_transactions
  FOR ALL USING (auth.uid() = user_id);

-- FX rate cache
CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency_pair text PRIMARY KEY,   -- e.g. 'USD_NGN'
  rate          numeric(12,4) NOT NULL,
  fetched_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed default rate (fallback if live fetch fails)
INSERT INTO public.fx_rates (currency_pair, rate) VALUES ('USD_NGN', 1600)
  ON CONFLICT (currency_pair) DO NOTHING;

-- Function: credit wallet atomically
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id   uuid,
  p_amount    numeric,
  p_type      text,
  p_provider  text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before numeric;
  v_after  numeric;
BEGIN
  SELECT wallet_balance INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  v_after := COALESCE(v_before, 0) + p_amount;
  UPDATE public.profiles SET wallet_balance = v_after WHERE id = p_user_id;
  INSERT INTO public.number_transactions
    (user_id, type, amount, provider, balance_before, balance_after, description, reference)
  VALUES
    (p_user_id, p_type, p_amount, p_provider, v_before, v_after, p_description, p_reference);
END; $$;

-- Function: debit wallet atomically (returns false if insufficient)
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id   uuid,
  p_amount    numeric,
  p_type      text,
  p_number    text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before numeric;
  v_after  numeric;
BEGIN
  SELECT wallet_balance INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF COALESCE(v_before, 0) < p_amount THEN RETURN false; END IF;
  v_after := v_before - p_amount;
  UPDATE public.profiles SET wallet_balance = v_after WHERE id = p_user_id;
  INSERT INTO public.number_transactions
    (user_id, type, amount, number, balance_before, balance_after, description)
  VALUES
    (p_user_id, p_type, -p_amount, p_number, v_before, v_after, p_description);
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.credit_wallet TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet TO service_role;
