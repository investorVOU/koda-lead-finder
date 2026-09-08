-- This RPC is invoked only by the server's service-role client. Keeping it as
-- SECURITY INVOKER avoids a privileged function in the exposed public schema.
ALTER FUNCTION public.renew_due_virtual_number(uuid, timestamptz)
  SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.renew_due_virtual_number(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_due_virtual_number(uuid, timestamptz)
  TO service_role;
