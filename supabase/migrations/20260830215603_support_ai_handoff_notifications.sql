ALTER TABLE public.support_conversations
  ADD COLUMN human_requested_at timestamptz,
  ADD COLUMN agent_replied_at timestamptz,
  ADD COLUMN contact_email text,
  ADD COLUMN contact_email_requested_at timestamptz;

CREATE INDEX support_conversations_human_requested_at_idx
  ON public.support_conversations (human_requested_at DESC)
  WHERE human_requested_at IS NOT NULL;

CREATE TABLE public.support_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_push_subscriptions_user_id_idx
  ON public.support_push_subscriptions (user_id);

ALTER TABLE public.support_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_push_subscriptions FROM anon, authenticated;
GRANT ALL ON TABLE public.support_push_subscriptions TO service_role;
