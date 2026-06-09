import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Inbox, Copy, Check, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNumberMessages } from "@/lib/numbers.functions";
import { extractOTP, detectService } from "@/lib/sms-utils";
import type { SmsMessage } from "@/lib/numbers";

// Polling interval for SMSPool temp numbers (ms)
const SMSPOOL_POLL_INTERVAL = 5_000;
// Max polling time = 20 minutes
const SMSPOOL_MAX_POLL_MS = 20 * 60 * 1000;

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

interface Props {
  numberId: string;
  phoneNumber: string;
  /** "telnyx" = webhook delivered; "smspool" = polling required */
  provider?: string;
}

export function SmsInbox({ numberId, phoneNumber, provider = "telnyx" }: Props) {
  const runGetMessages = useServerFn(getNumberMessages);

  const [messages,    setMessages]    = useState<SmsMessage[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [polling,     setPolling]     = useState(false);
  const [pollExpired, setPollExpired] = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(SMSPOOL_MAX_POLL_MS);

  const pollStartRef = useRef<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load initial messages ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const res = await runGetMessages({ data: { numberId } });
      if (mounted && "messages" in res) setMessages(res.messages as SmsMessage[]);
      setLoading(false);
    };

    load();

    // Supabase realtime — receives both Telnyx (webhook) and SMSPool (poll) inserts
    const channel = supabase
      .channel(`sms-${numberId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sms_messages", filter: `number_id=eq.${numberId}` },
        (payload) => {
          if (mounted) {
            setMessages((prev) => [payload.new as SmsMessage, ...prev]);
            if (provider === "smspool") stopPolling();
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [numberId]);

  // ── SMSPool polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (provider !== "smspool") return;
    startPolling();
    return () => stopPolling();
  }, [numberId, provider]);

  const startPolling = () => {
    if (pollTimerRef.current) return; // already polling
    pollStartRef.current = Date.now();
    setPolling(true);
    setTimeLeft(SMSPOOL_MAX_POLL_MS);

    // Countdown timer (updates every second for display)
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - (pollStartRef.current ?? Date.now());
      const remaining = Math.max(0, SMSPOOL_MAX_POLL_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) stopPolling(true);
    }, 1000);

    // Poll every 5 seconds via the REST endpoint
    const doPoll = async () => {
      const elapsed = Date.now() - (pollStartRef.current ?? Date.now());
      if (elapsed >= SMSPOOL_MAX_POLL_MS) { stopPolling(true); return; }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch(`/api/smspool/poll/${numberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { status: string; sms?: string };

        if (data.status === "received") {
          // Realtime will add the message; just stop polling
          stopPolling();
        } else if (data.status === "expired") {
          stopPolling(true);
        }
      } catch { /* network error — keep polling */ }
    };

    pollTimerRef.current = setInterval(doPoll, SMSPOOL_POLL_INTERVAL);
    doPoll(); // poll immediately
  };

  const stopPolling = (expired = false) => {
    if (pollTimerRef.current)  { clearInterval(pollTimerRef.current);  pollTimerRef.current  = null; }
    if (countdownRef.current)  { clearInterval(countdownRef.current);  countdownRef.current  = null; }
    setPolling(false);
    if (expired) setPollExpired(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="space-y-3">
      {/* SMSPool polling indicator */}
      {provider === "smspool" && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
          pollExpired
            ? "border-muted bg-muted/30"
            : "border-amber-200/60 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-900/10"
        }`}>
          <div className="flex items-center gap-2">
            {polling ? (
              <Loader2 className="size-4 animate-spin text-amber-500" />
            ) : (
              <Clock className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {pollExpired ? "Number expired" : polling ? "Waiting for SMS…" : "Stopped"}
            </span>
          </div>
          {polling && !pollExpired && (
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
              {minutesLeft}:{String(secondsLeft).padStart(2, "0")} left
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Inbox className="size-8 opacity-40" />
          <p className="text-sm">No messages yet for {phoneNumber}</p>
          <p className="text-xs">
            {provider === "smspool"
              ? "SMS will appear here automatically when received."
              : "Incoming SMS will appear here in real time."}
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const otp     = extractOTP(msg.body);
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
        })
      )}
    </div>
  );
}
