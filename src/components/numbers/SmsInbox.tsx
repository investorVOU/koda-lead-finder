import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Inbox, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNumberMessages } from "@/lib/numbers.functions";
import type { SmsMessage } from "@/lib/numbers";

const OTP_PATTERNS = [
  /\b(\d{4,8})\b/,
  /code[:\s]+(\d{4,8})/i,
  /OTP[:\s]+(\d{4,8})/i,
  /verification code[:\s]+(\d{4,8})/i,
  /(?:is|:)\s*(\d{4,8})/i,
];

function extractOTP(body: string): string | null {
  for (const pattern of OTP_PATTERNS) {
    const match = body.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const SERVICE_SENDERS: Record<string, string> = {
  "+14155238886": "WhatsApp",
  "+16505551234": "Instagram",
  "+12025551234": "Facebook",
  "+18005551234": "Google",
  "+447903561234": "WhatsApp UK",
};

function detectService(sender: string): string | null {
  return SERVICE_SENDERS[sender] ?? null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy OTP"}
    </button>
  );
}

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
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
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
    <div className="space-y-3">
      {messages.map((msg) => {
        const otp = extractOTP(msg.body);
        const service = detectService(msg.from_number);
        return (
          <div key={msg.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 shrink-0 text-primary" />
                <span className="font-mono text-sm font-semibold">{msg.from_number}</span>
                {service && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {service}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.received_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground">{msg.body}</p>
            {otp && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">OTP detected</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-primary">{otp}</p>
                </div>
                <CopyButton text={otp} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
