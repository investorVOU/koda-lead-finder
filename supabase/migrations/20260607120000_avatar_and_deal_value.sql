-- Add avatar_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add paid status to lead_status enum (deal_value column already exists)
DO $$ BEGIN
  ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'paid';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
