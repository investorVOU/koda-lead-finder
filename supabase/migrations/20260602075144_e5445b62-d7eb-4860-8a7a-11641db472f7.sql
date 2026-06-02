-- Pin search_path on trigger helper
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Trigger-only functions must not be callable via the API
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Credit consumption: only signed-in users may call it
REVOKE ALL ON FUNCTION public.use_search_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_search_credit() TO authenticated;