-- Upgrade okediv413@gmail.com to pro plan for testing
UPDATE public.subscriptions s
SET plan                 = 'pro',
    status               = 'active',
    search_credits_total = 9999,
    search_credits_used  = 0,
    updated_at           = now()
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = s.user_id
  AND u.email = 'okediv413@gmail.com';
