-- Meta Pixel ID is managed from /internal/marketing alongside Google Analytics.
-- A pixel ID is public once rendered to visitors; the table itself stays private.
ALTER TABLE public.marketing_adsense_settings
  ADD COLUMN IF NOT EXISTS meta_pixel_id text;

ALTER TABLE public.marketing_adsense_settings
  DROP CONSTRAINT IF EXISTS marketing_adsense_settings_meta_pixel_id_check;

ALTER TABLE public.marketing_adsense_settings
  ADD CONSTRAINT marketing_adsense_settings_meta_pixel_id_check
  CHECK (meta_pixel_id IS NULL OR meta_pixel_id ~ '^[0-9]{10,20}$');
