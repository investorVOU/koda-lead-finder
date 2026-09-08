-- Atomically renew a monthly virtual number from the customer's wallet.
-- The row locks make concurrent scheduler runs safe: only one can debit and
-- move the same expiry forward.
CREATE OR REPLACE FUNCTION public.renew_due_virtual_number(
  p_number_id uuid,
  p_due_before timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_number public.virtual_numbers%ROWTYPE;
  v_balance numeric;
  v_new_expiry timestamptz;
BEGIN
  SELECT * INTO v_number
  FROM public.virtual_numbers
  WHERE id = p_number_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_number.provider <> 'telnyx'
     OR v_number.status <> 'active'
     OR NOT v_number.auto_renew
     OR v_number.expires_at IS NULL
     OR v_number.expires_at > p_due_before THEN
    RETURN jsonb_build_object('status', 'not_due');
  END IF;

  IF COALESCE(v_number.monthly_ngn, 0) <= 0 THEN
    UPDATE public.virtual_numbers
    SET auto_renew = false
    WHERE id = v_number.id;

    RETURN jsonb_build_object(
      'status', 'invalid_price',
      'user_id', v_number.user_id,
      'phone_number', v_number.phone_number
    );
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_number.user_id
  FOR UPDATE;

  IF COALESCE(v_balance, 0) < v_number.monthly_ngn THEN
    UPDATE public.virtual_numbers
    SET auto_renew = false
    WHERE id = v_number.id;

    RETURN jsonb_build_object(
      'status', 'insufficient_funds',
      'user_id', v_number.user_id,
      'phone_number', v_number.phone_number,
      'amount_ngn', v_number.monthly_ngn
    );
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - v_number.monthly_ngn
  WHERE id = v_number.user_id;

  INSERT INTO public.number_transactions (
    user_id,
    type,
    amount,
    number,
    balance_before,
    balance_after,
    description
  ) VALUES (
    v_number.user_id,
    'renewal',
    -v_number.monthly_ngn,
    v_number.phone_number,
    v_balance,
    v_balance - v_number.monthly_ngn,
    'Monthly virtual number renewal'
  );

  v_new_expiry := GREATEST(v_number.expires_at, now()) + interval '1 month';

  UPDATE public.virtual_numbers
  SET expires_at = v_new_expiry,
      status = 'active'
  WHERE id = v_number.id;

  RETURN jsonb_build_object(
    'status', 'renewed',
    'user_id', v_number.user_id,
    'phone_number', v_number.phone_number,
    'amount_ngn', v_number.monthly_ngn,
    'expires_at', v_new_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_due_virtual_number(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_due_virtual_number(uuid, timestamptz)
  TO service_role;
