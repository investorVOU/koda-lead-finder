-- Microsoft Clarity project ID, managed from /internal/marketing next to the Meta Pixel.
ALTER TABLE public.marketing_adsense_settings
  ADD COLUMN IF NOT EXISTS clarity_project_id text;

ALTER TABLE public.marketing_adsense_settings
  DROP CONSTRAINT IF EXISTS marketing_adsense_settings_clarity_project_id_check;

ALTER TABLE public.marketing_adsense_settings
  ADD CONSTRAINT marketing_adsense_settings_clarity_project_id_check
  CHECK (clarity_project_id IS NULL OR clarity_project_id ~ '^[a-z0-9]{6,20}$');
