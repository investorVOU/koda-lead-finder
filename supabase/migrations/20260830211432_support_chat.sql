-- Personal support chat. Browser clients can only read their own conversation;
-- customer and agent writes are authenticated in server functions.
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'human', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'bot', 'agent')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_conversation_created_at_idx
  ON public.support_messages (conversation_id, created_at);
CREATE INDEX support_conversations_updated_at_idx
  ON public.support_conversations (updated_at DESC);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_messages FROM anon, authenticated;
GRANT SELECT ON TABLE public.support_conversations TO authenticated;
GRANT SELECT ON TABLE public.support_messages TO authenticated;
GRANT ALL ON TABLE public.support_conversations TO service_role;
GRANT ALL ON TABLE public.support_messages TO service_role;

CREATE POLICY "support users can view their conversation"
  ON public.support_conversations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "support users can view their messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_conversations conversation
      WHERE conversation.id = support_messages.conversation_id
        AND conversation.user_id = (SELECT auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
