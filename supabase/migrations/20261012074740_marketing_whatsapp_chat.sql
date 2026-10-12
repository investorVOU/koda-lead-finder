-- A public click-to-chat number is configured only by the internal marketing admin.
-- The settings table remains private; the app exposes this one value through a
-- deliberately small server function for the authenticated plan page.
ALTER TABLE public.marketing_adsense_settings
  ADD COLUMN IF NOT EXISTS whatsapp_business_number text;

ALTER TABLE public.marketing_adsense_settings
  DROP CONSTRAINT IF EXISTS marketing_adsense_settings_whatsapp_business_number_check;

ALTER TABLE public.marketing_adsense_settings
  ADD CONSTRAINT marketing_adsense_settings_whatsapp_business_number_check
  CHECK (
    whatsapp_business_number IS NULL
    OR whatsapp_business_number ~ '^\+[1-9][0-9]{7,14}$'
  );
