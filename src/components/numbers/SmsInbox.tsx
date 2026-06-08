import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getNumberMessages } from "@/lib/numbers.functions";
import type { SmsMessage } from "@/lib/numbers";

export function SmsInbox({ numberId, phoneNumber }: { numberId: string; phoneNumber: string }) {
  const runGetMessages = useServerFn(getNumberMessages);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const res = await runGetMessages({ data: { numberId } });
      if (mounted && "messages" in res) setMessages(res.messages as SmsMessage[]);
      setLoading(false);
    };

    load();

    // Supabase Realtime — new inbound SMS
    const channel = supabase
      .channel(`sms-${numberId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sms_messages", filter: `number_id=eq.${numberId}` },
        (payload) => {
          if (mounted) setMessages((prev) => [payload.new as SmsMessage, ...prev]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [numberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        Loading messages…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <Inbox className="size-8 opacity-40" />
        <p className="text-sm">No messages yet for {phoneNumber}</p>
        <p className="text-xs">Incoming SMS will appear here in real time</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div key={msg.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 shrink-0 text-primary" />
              <span className="font-mono text-sm font-semibold">{msg.from_number}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(msg.received_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-foreground">{msg.body}</p>
        </div>
      ))}
    </div>
  );
}
