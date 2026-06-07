ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'paid';

ALTER TABLE public.saved_leads ADD COLUMN IF NOT EXISTS deal_value numeric NOT NULL DEFAULT 0;