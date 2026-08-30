ALTER TABLE public.support_conversations
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN visitor_token_hash text;

ALTER TABLE public.support_conversations
  ADD CONSTRAINT support_conversations_owner_or_visitor_check
  CHECK ((user_id IS NOT NULL) <> (visitor_token_hash IS NOT NULL));

CREATE UNIQUE INDEX support_conversations_visitor_token_hash_key
  ON public.support_conversations (visitor_token_hash)
  WHERE visitor_token_hash IS NOT NULL;
