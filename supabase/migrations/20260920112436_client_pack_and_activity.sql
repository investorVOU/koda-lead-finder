-- The Client Pack stores only user-authored/generated sales materials. Business
-- details remain owned by saved_leads and website details by studio_projects.
CREATE TABLE public.client_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.saved_leads(id) ON DELETE CASCADE,
  studio_project_id uuid REFERENCES public.studio_projects(id) ON DELETE SET NULL,
  whatsapp_message text NOT NULL DEFAULT '',
  call_script text NOT NULL DEFAULT '',
  prepared_by text NOT NULL DEFAULT '',
  proposal_price text NOT NULL DEFAULT '',
  proposal_currency text NOT NULL DEFAULT '',
  delivery_days integer,
  proposal_note text NOT NULL DEFAULT '',
  included_items text[] NOT NULL DEFAULT ARRAY[]::text[],
  proposal_share_token text UNIQUE,
  proposal_shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_packs_delivery_days_check CHECK (delivery_days IS NULL OR delivery_days BETWEEN 1 AND 365),
  CONSTRAINT client_packs_included_items_check CHECK (included_items <@ ARRAY['mobile_friendly', 'contact_button', 'location_map']::text[]),
  UNIQUE (user_id, lead_id)
);
CREATE INDEX client_packs_user_lead_idx ON public.client_packs (user_id, lead_id);
CREATE INDEX client_packs_share_token_idx ON public.client_packs (proposal_share_token) WHERE proposal_share_token IS NOT NULL;

CREATE TABLE public.client_pack_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.saved_leads(id) ON DELETE CASCADE,
  client_pack_id uuid REFERENCES public.client_packs(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('message_copied', 'whatsapp_opened', 'call_script_copied', 'demo_copied', 'proposal_downloaded', 'proposal_shared', 'follow_up_started')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_pack_activities_user_action_time_idx ON public.client_pack_activities (user_id, action, created_at DESC);
CREATE INDEX client_pack_activities_user_lead_time_idx ON public.client_pack_activities (user_id, lead_id, created_at DESC);

ALTER TABLE public.client_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pack_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_packs, public.client_pack_activities FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_packs, public.client_pack_activities TO authenticated;
CREATE POLICY "Users can read their own client packs" ON public.client_packs FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create their own client packs" ON public.client_packs FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own client packs" ON public.client_packs FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own client packs" ON public.client_packs FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can read their own client pack activity" ON public.client_pack_activities FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create their own client pack activity" ON public.client_pack_activities FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER client_packs_updated_at BEFORE UPDATE ON public.client_packs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();