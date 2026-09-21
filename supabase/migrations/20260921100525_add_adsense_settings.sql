-- Founder-managed public-site integrations. Values here are public only when
-- rendered to visitors; the table remains private at the Data API.
CREATE TABLE public.marketing_adsense_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  is_enabled boolean NOT NULL DEFAULT false,
  publisher_id text,
  landing_ad_slot text,
  google_analytics_measurement_id text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (publisher_id IS NULL OR publisher_id ~ '^ca-pub-[0-9]{10,20}$'),
  CHECK (landing_ad_slot IS NULL OR landing_ad_slot ~ '^[0-9]{6,20}$'),
  CHECK (google_analytics_measurement_id IS NULL OR google_analytics_measurement_id ~ '^G-[A-Z0-9]{6,20}$')
);

ALTER TABLE public.marketing_adsense_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_adsense_settings FROM anon, authenticated;
GRANT ALL ON public.marketing_adsense_settings TO service_role;

CREATE TRIGGER marketing_adsense_settings_updated_at
  BEFORE UPDATE ON public.marketing_adsense_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Anonymous, daily-deduplicated landing visitors for the founder dashboard.
-- No IP address, email, full referrer URL, or browser fingerprint is stored.
CREATE TABLE public.marketing_visitor_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_hash char(64) NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'direct' CHECK (char_length(source) <= 80),
  medium text CHECK (char_length(medium) <= 80),
  campaign text CHECK (char_length(campaign) <= 160),
  landing_path text NOT NULL CHECK (landing_path ~ '^/' AND char_length(landing_path) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_hash, visit_date)
);

ALTER TABLE public.marketing_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_visitor_sessions FROM anon, authenticated;
GRANT ALL ON public.marketing_visitor_sessions TO service_role;

CREATE INDEX marketing_visitor_sessions_date_source_idx
  ON public.marketing_visitor_sessions (visit_date DESC, source);