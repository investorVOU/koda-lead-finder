-- Browser push subscriptions and the delivery log for lead follow-up reminders.
-- Both tables are service-only: users manage their own device through authenticated
-- server functions, never through the public Data API.
CREATE TABLE public.follow_up_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.follow_up_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  push_subscription_id uuid NOT NULL REFERENCES public.follow_up_push_subscriptions(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.saved_leads(id) ON DELETE CASCADE,
  notification_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (push_subscription_id, lead_id, notification_date)
);

ALTER TABLE public.follow_up_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_push_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.follow_up_push_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.follow_up_push_deliveries FROM anon, authenticated;
GRANT ALL ON TABLE public.follow_up_push_subscriptions TO service_role;
GRANT ALL ON TABLE public.follow_up_push_deliveries TO service_role;

CREATE INDEX follow_up_push_subscriptions_user_id_idx
  ON public.follow_up_push_subscriptions (user_id);
CREATE INDEX follow_up_push_deliveries_lead_date_idx
  ON public.follow_up_push_deliveries (lead_id, notification_date DESC);
CREATE INDEX saved_leads_follow_up_at_idx
  ON public.saved_leads (follow_up_at)
  WHERE follow_up_at IS NOT NULL;

CREATE TRIGGER follow_up_push_subscriptions_updated_at
  BEFORE UPDATE ON public.follow_up_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
