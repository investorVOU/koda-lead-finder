-- Conversion onboarding state belongs to the account, not subscription state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS product_tour_state text NOT NULL DEFAULT 'not_started'
    CHECK (product_tour_state IN ('not_started', 'in_progress', 'completed', 'skipped')),
  ADD COLUMN IF NOT EXISTS product_tour_updated_at timestamptz;

-- A public website sample is deliberately an opt-in projection of a Studio project.
CREATE TABLE IF NOT EXISTS public.studio_demo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS studio_demo_links_owner_project_idx
  ON public.studio_demo_links (user_id, project_id);

CREATE TABLE IF NOT EXISTS public.studio_demo_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_link_id uuid NOT NULL REFERENCES public.studio_demo_links(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_demo_views_link_time_idx
  ON public.studio_demo_views (demo_link_id, viewed_at DESC);

ALTER TABLE public.studio_demo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_demo_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_demo_links, public.studio_demo_views FROM anon, authenticated;
GRANT ALL ON public.studio_demo_links, public.studio_demo_views TO service_role;

CREATE TRIGGER studio_demo_links_updated_at
  BEFORE UPDATE ON public.studio_demo_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
