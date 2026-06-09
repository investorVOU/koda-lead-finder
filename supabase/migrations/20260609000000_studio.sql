-- ── Kodarai Studio module ─────────────────────────────────────────────────────
-- AI-powered website builder for client sites.
-- Files are stored as a JSON blob in studio_projects.files_json (no object
-- storage needed for MVP — works well for small sites).

-- Projects
CREATE TABLE IF NOT EXISTS public.studio_projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL DEFAULT 'Untitled Project',
  description text,
  template    text        NOT NULL DEFAULT 'blank',
  files_json  text        NOT NULL DEFAULT '{}',
  deployment_url text,
  status      text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'building', 'live', 'error')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_projects_owner" ON public.studio_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat messages per project
CREATE TABLE IF NOT EXISTS public.studio_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  file_changes text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_messages_owner" ON public.studio_messages
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.studio_projects WHERE user_id = auth.uid()
    )
  );

-- Version snapshots per project
CREATE TABLE IF NOT EXISTS public.studio_snapshots (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  files_json  text        NOT NULL DEFAULT '{}',
  files_count int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_snapshots_owner" ON public.studio_snapshots
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.studio_projects WHERE user_id = auth.uid()
    )
  );
