CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 180),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 80),
  location text NOT NULL CHECK (char_length(location) BETWEEN 1 AND 120),
  last_run_at timestamptz,
  last_result_place_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.saved_searches FROM anon, authenticated;
GRANT ALL ON TABLE public.saved_searches TO service_role;

CREATE INDEX saved_searches_user_updated_at_idx
  ON public.saved_searches (user_id, updated_at DESC);

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
