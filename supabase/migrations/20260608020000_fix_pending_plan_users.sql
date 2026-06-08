-- Retroactively activate trial for users who signed up but never reached choose-plan.
-- These users have status='pending_plan' and 0 credits because the onboarded redirect
-- was sending them to /trial-welcome before they could click "Start free trial".
UPDATE public.subscriptions
SET
  plan                 = 'trial',
  status               = 'trialing',
  search_credits_total = 250,
  search_credits_used  = 0,
  credits_reset_at     = now() + interval '3 days',
  trial_ends_at        = now() + interval '3 days',
  updated_at           = now()
WHERE
  status = 'pending_plan'
  AND search_credits_total = 0;
