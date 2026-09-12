-- Marketing-owned social proof. These rows are deliberately private at the
-- Data API; the public site receives only published rows through server code.
CREATE TABLE public.marketing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 120),
  role text CHECK (char_length(role) <= 160),
  location text CHECK (char_length(location) <= 120),
  photo_path text CHECK (char_length(photo_path) <= 500),
  review_text text NOT NULL CHECK (char_length(review_text) <= 2_000),
  rating smallint NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketing_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 120),
  location text CHECK (char_length(location) <= 120),
  avatar_path text CHECK (char_length(avatar_path) <= 500),
  headline text NOT NULL CHECK (char_length(headline) <= 180),
  description text CHECK (char_length(description) <= 1_000),
  proof_image_path text NOT NULL CHECK (char_length(proof_image_path) <= 500),
  secondary_image_path text CHECK (char_length(secondary_image_path) <= 500),
  proof_alt text CHECK (char_length(proof_alt) <= 250),
  result_type text NOT NULL DEFAULT 'other' CHECK (result_type IN (
    'client_won', 'payment_received', 'website_sold', 'positive_reply', 'recurring_client', 'other'
  )),
  result_amount numeric(12, 2) CHECK (result_amount IS NULL OR result_amount >= 0),
  currency text CHECK (currency IS NULL OR char_length(currency) BETWEEN 3 AND 12),
  quote text CHECK (char_length(quote) <= 1_000),
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_reviews FROM anon, authenticated;
REVOKE ALL ON public.marketing_proofs FROM anon, authenticated;
GRANT ALL ON public.marketing_reviews TO service_role;
GRANT ALL ON public.marketing_proofs TO service_role;

CREATE INDEX marketing_reviews_published_order_idx
  ON public.marketing_reviews (is_published, is_featured DESC, display_order, created_at DESC);
CREATE INDEX marketing_proofs_published_order_idx
  ON public.marketing_proofs (is_published, is_featured DESC, display_order, created_at DESC);

CREATE TRIGGER marketing_reviews_updated_at
  BEFORE UPDATE ON public.marketing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER marketing_proofs_updated_at
  BEFORE UPDATE ON public.marketing_proofs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Screenshots can contain private messages. Keep source objects private and
-- serve them only via short-lived signed URLs after a record is published.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-proof',
  'social-proof',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
