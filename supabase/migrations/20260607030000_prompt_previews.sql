CREATE TABLE public.prompt_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  business_name text NOT NULL,
  prompt_content text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prompt_previews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_previews TO authenticated;
GRANT ALL ON public.prompt_previews TO service_role;

ALTER TABLE public.prompt_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read previews" ON public.prompt_previews
  FOR SELECT USING (true);
CREATE POLICY "own preview insert" ON public.prompt_previews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own preview update" ON public.prompt_previews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own preview delete" ON public.prompt_previews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER prompt_previews_updated_at
  BEFORE UPDATE ON public.prompt_previews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.increment_preview_views(p_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE prompt_previews SET views = views + 1 WHERE slug = p_slug;
$$;
GRANT EXECUTE ON FUNCTION public.increment_preview_views(text) TO anon, authenticated;
