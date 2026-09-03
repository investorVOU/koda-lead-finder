-- Extend the existing Studio project model for Kodarai's lead-to-website flow.
-- Files deliberately remain in files_json so legacy Studio projects continue to work.

ALTER TABLE public.studio_projects
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.saved_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS business_details_json text NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme_json text NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS vercel_project_id text,
  ADD COLUMN IF NOT EXISTS vercel_project_name text,
  ADD COLUMN IF NOT EXISTS vercel_deployment_id text,
  ADD COLUMN IF NOT EXISTS vercel_url text,
  ADD COLUMN IF NOT EXISTS deployment_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS deployment_error text,
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS domain_status text,
  ADD COLUMN IF NOT EXISTS domain_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Bring legacy project state into the explicit website lifecycle.
UPDATE public.studio_projects
SET status = CASE status
  WHEN 'building' THEN 'generating'
  WHEN 'live' THEN 'published'
  WHEN 'error' THEN 'failed'
  ELSE status
END
WHERE status IN ('building', 'live', 'error');

ALTER TABLE public.studio_projects
  DROP CONSTRAINT IF EXISTS studio_projects_status_check;

ALTER TABLE public.studio_projects
  ADD CONSTRAINT studio_projects_status_check
  CHECK (status IN ('draft', 'generating', 'ready', 'publishing', 'published', 'failed'));

ALTER TABLE public.studio_projects
  DROP CONSTRAINT IF EXISTS studio_projects_generation_status_check;

ALTER TABLE public.studio_projects
  ADD CONSTRAINT studio_projects_generation_status_check
  CHECK (generation_status IN ('idle', 'generating', 'ready', 'failed'));

ALTER TABLE public.studio_projects
  DROP CONSTRAINT IF EXISTS studio_projects_deployment_status_check;

ALTER TABLE public.studio_projects
  ADD CONSTRAINT studio_projects_deployment_status_check
  CHECK (deployment_status IN ('not_started', 'preparing', 'uploading', 'building', 'ready', 'error'));

CREATE UNIQUE INDEX IF NOT EXISTS studio_projects_slug_unique
  ON public.studio_projects (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS studio_projects_user_lead_idx
  ON public.studio_projects (user_id, lead_id);
