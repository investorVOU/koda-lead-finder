import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, Plus, Trash2, Clock, CheckCircle2, MessageSquare, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BuyNumberDialog } from "@/components/numbers/BuyNumberDialog";
import { SmsInbox } from "@/components/numbers/SmsInbox";
import { getUserNumbers, releaseNumber, getAllMessages } from "@/lib/numbers.functions";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { extractOTP } from "@/lib/sms-utils";
import type { VirtualNumber } from "@/lib/numbers";

export const Route = createFileRoute("/_authenticated/numbers")({
  head: () => ({ meta: [{ title: "Virtual Numbers — Kodarai" }] }),
  component: NumbersPage,
});

type Tab = "numbers" | "messages";

function CopyOTP({ otp }: { otp: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(otp); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy OTP"}
    </button>
  );
}

function NumbersPage() {
  const navigate = useNavigate();
  const runGetNumbers = useServerFn(getUserNumbers);
  const runRelease    = useServerFn(releaseNumber);
  const runGetAllMsgs = useServerFn(getAllMessages);

  const [tab,        setTab]        = useState<Tab>("numbers");
  const [numbers,    setNumbers]    = useState<VirtualNumber[]>([]);
  const [messages,   setMessages]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [msgsLoading,setMsgsLoading]= useState(false);
  const [buyOpen,    setBuyOpen]    = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [releasing,  setReleasing]  = useState<string | null>(null);

  const { status, wallet } = Route.useSearch() as { status?: string; wallet?: string };
  useEffect(() => {
    if (status === "success") {
      toast.success("Payment confirmed! Your number is being activated.");
      navigate({ to: "/numbers", replace: true });
    } else if (status === "cancel") {
      toast.info("Number purchase cancelled.");
      navigate({ to: "/numbers", replace: true });
    } else if (wallet === "funded") {
      toast.success("Wallet topped up successfully!");
      navigate({ to: "/numbers", replace: true });
    }
  }, [status, wallet]);

  const loadNumbers = async () => {
    setLoading(true);
    const res = await runGetNumbers();
    if ("numbers" in res) setNumbers(res.numbers as VirtualNumber[]);
    setLoading(false);
  };

  const loadMessages = async () => {
    setMsgsLoading(true);
    const res = await runGetAllMsgs();
    if ("messages" in res) setMessages(res.messages);
    setMsgsLoading(false);
  };

  useEffect(() => { loadNumbers(); }, []);

  useEffect(() => {
    if (tab === "messages" && messages.length === 0) loadMessages();
  }, [tab]);

  const handleRelease = async (numberId: string, phoneNumber: string) => {
    if (!confirm(`Release ${phoneNumber}? This cannot be undone.`)) return;
    setReleasing(numberId);
    const res = await runRelease({ data: { numberId } });
    setReleasing(null);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number released.");
    loadNumbers();
  };

  const countryFlag = (code: string) =>
    NUMBER_COUNTRIES.find((c) => c.code === code)?.flag ?? "🌐";

  const activeNumbers = numbers.filter((n) => n.status === "active");

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Virtual Numbers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real phone numbers for SMS, WhatsApp, and client calls.
            </p>
          </div>
          <Button variant="hero" onClick={() => setBuyOpen(true)}>
            <Plus className="size-4" /> Buy a number
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            onClick={() => setTab("numbers")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${tab === "numbers" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Phone className="size-4" /> Numbers
            {numbers.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {numbers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("messages")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${tab === "messages" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageSquare className="size-4" /> SMS Received
            {messages.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        {/* ── NUMBERS TAB ── */}
        {tab === "numbers" && (
          <>
            {!loading && numbers.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="size-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">No numbers yet</h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Rent a number in 50+ countries to receive SMS for verifications, WhatsApp, or client calls.
                </p>
                <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                  <span>🇺🇸 ₦1,600/mo</span>
                  <span>🇬🇧 ₦1,600/mo</span>
                  <span>🇨🇦 ₦1,600/mo</span>
                  <span>🇦🇺 ₦2,400/mo</span>
                  <span>🇩🇪 ₦2,400/mo</span>
                  <span>+ more countries</span>
                </div>
                <Button variant="hero" className="mt-2" onClick={() => setBuyOpen(true)}>
                  <Plus className="size-4" /> Get your first number
                </Button>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            )}

            <div className="space-y-3">
              {numbers.map((num) => (
                <div key={num.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{countryFlag(num.country_code)}</span>
                      <div>
                        <p className="font-mono text-base font-bold">{num.phone_number}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {num.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="size-3" /> Active
                            </span>
                          ) : num.status === "expired" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                              <Clock className="size-3" /> Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                              <Clock className="size-3" /> Pending
                            </span>
                          )}
                          {num.expires_at && num.status === "active" && (
                            <span className="text-xs text-muted-foreground">
                              · Expires {new Date(num.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(num.status === "active" || num.status === "expired") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpanded(expanded === num.id ? null : num.id)}
                        >
                          <MessageSquare className="size-4" />
                          {expanded === num.id ? "Hide inbox" : "View inbox"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleRelease(num.id, num.phone_number)}
                        disabled={releasing === num.id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {expanded === num.id && (num.status === "active" || num.status === "expired") && (
                    <div className="border-t border-border px-5 py-4">
                      <SmsInbox
                        numberId={num.id}
                        phoneNumber={num.phone_number}
                        provider={(num as VirtualNumber).provider ?? "telnyx"}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" && (
          <>
            {msgsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            )}

            {!msgsLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
                <MessageSquare className="size-10 text-muted-foreground/30" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  {activeNumbers.length === 0
                    ? "Buy a number first — incoming SMS will appear here."
                    : "Incoming SMS will appear here in real time."}
                </p>
              </div>
            )}

            {!msgsLoading && messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((msg: any) => {
                  const otp = extractOTP(msg.body);
                  const numPhone = msg.virtual_numbers?.phone_number ?? msg.to_number;
                  const numFlag  = countryFlag(msg.virtual_numbers?.country_code ?? "");
                  return (
                    <div key={msg.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-4 shrink-0 text-primary" />
                          <div>
                            <p className="font-mono text-sm font-semibold">{msg.from_number}</p>
                            <p className="text-xs text-muted-foreground">
                              to {numFlag} {numPhone}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
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
                          <CopyOTP otp={otp} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!msgsLoading && messages.length > 0 && (
              <button
                onClick={loadMessages}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Refresh
              </button>
            )}
          </>
        )}
      </div>

      <BuyNumberDialog open={buyOpen} onOpenChange={(o) => { setBuyOpen(o); if (!o) loadNumbers(); }} />
    </DashboardShell>
  );
}
