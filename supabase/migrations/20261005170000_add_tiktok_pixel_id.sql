-- TikTok Pixel ID is managed from /internal/marketing alongside other public tracking pixels.
-- A pixel ID is public once rendered to visitors; the table itself stays private.
ALTER TABLE public.marketing_adsense_settings
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text;

ALTER TABLE public.marketing_adsense_settings
  DROP CONSTRAINT IF EXISTS marketing_adsense_settings_tiktok_pixel_id_check;

ALTER TABLE public.marketing_adsense_settings
  ADD CONSTRAINT marketing_adsense_settings_tiktok_pixel_id_check
  CHECK (tiktok_pixel_id IS NULL OR tiktok_pixel_id ~ '^[A-Za-z0-9]{10,40}$');
