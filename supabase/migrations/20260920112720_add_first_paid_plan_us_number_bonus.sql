-- One-time, non-wallet entitlement granted from the trusted paid-plan webhook.
-- This table is service-only: browser clients can read their status only through
-- authenticated server functions and cannot grant, redeem, or revoke a bonus.
CREATE TABLE public.user_promotional_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL CHECK (entitlement_type IN ('first_paid_plan_us_number')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'redeemed', 'revoked')),
  source_subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  source_payment_id uuid REFERENCES public.payment_history(id) ON DELETE SET NULL,
  number_order_id uuid REFERENCES public.virtual_numbers(id) ON DELETE RESTRICT,
  claim_locked_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement_type),
  CHECK (
    (status <> 'redeemed' OR (redeemed_at IS NOT NULL AND number_order_id IS NOT NULL))
    AND (status <> 'revoked' OR revoked_at IS NOT NULL)
  )
);

CREATE INDEX user_promotional_entitlements_user_status_idx
  ON public.user_promotional_entitlements (user_id, status);

ALTER TABLE public.user_promotional_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_promotional_entitlements FROM anon, authenticated;
GRANT ALL ON TABLE public.user_promotional_entitlements TO service_role;

CREATE TRIGGER user_promotional_entitlements_updated_at
  BEFORE UPDATE ON public.user_promotional_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The following service-role-only RPCs make the provider call safe across
-- repeated requests and concurrent browser tabs. A lock is not a redemption:
-- only complete_number_bonus_claim marks the entitlement redeemed.
CREATE OR REPLACE FUNCTION public.acquire_number_bonus_claim(
  p_user_id uuid,
  p_entitlement_type text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.user_promotional_entitlements
  SET claim_locked_at = now()
  WHERE user_id = p_user_id
    AND entitlement_type = p_entitlement_type
    AND status = 'available'
    AND NOT (metadata ? 'provider_order_id')
    AND (claim_locked_at IS NULL OR claim_locked_at < now() - interval '15 minutes')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_number_bonus_claim(
  p_entitlement_id uuid,
  p_number_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_promotional_entitlements
  SET status = 'redeemed',
      number_order_id = p_number_order_id,
      redeemed_at = now(),
      claim_locked_at = NULL
  WHERE id = p_entitlement_id
    AND status = 'available'
    AND claim_locked_at IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_number_bonus_claim(
  p_entitlement_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_promotional_entitlements
  SET claim_locked_at = NULL
  WHERE id = p_entitlement_id
    AND status = 'available';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_number_bonus_claim(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_number_bonus_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_number_bonus_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_number_bonus_claim(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_number_bonus_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_number_bonus_claim(uuid) TO service_role;