import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone, Plus, MessageSquare, Search, Download, Zap,
  CheckCircle2, Clock, ChevronRight, BarChart3, Settings2,
  Send, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BuyNumberDialog } from "@/components/numbers/BuyNumberDialog";
import { SmsInbox } from "@/components/numbers/SmsInbox";
import { OutboundSMS } from "@/components/numbers/OutboundSMS";
import { SMSTemplates } from "@/components/numbers/SMSTemplates";
import { NumberAnalytics } from "@/components/numbers/NumberAnalytics";
import { NumberSettings } from "@/components/numbers/NumberSettings";
import { SMSPoolOrders } from "@/components/numbers/SMSPoolOrders";
import { WalletWidget } from "@/components/numbers/WalletWidget";
import { OTPHistory, pushOTPHistory } from "@/components/numbers/OTPHistory";
import { getUserNumbers, getAllMessages } from "@/lib/numbers.functions";
import { searchMessages, exportMessages } from "@/lib/numbers-extra.functions";
import { getWalletData } from "@/lib/wallet.functions";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { extractOTP } from "@/lib/sms-utils";
import type { VirtualNumber } from "@/lib/numbers";

export const Route = createFileRoute("/_authenticated/numbers")({
  head: () => ({ meta: [{ title: "Virtual Numbers — Kodarai" }] }),
  component: NumbersPage,
});

type SubTab = "inbox" | "send" | "templates" | "analytics" | "settings";

// Special tab IDs (not real number IDs)
const TAB_ALL_SMS  = "__all_sms__";
const TAB_TEMP     = "__temp_orders__";

// Shorten a phone number for display in a tab
function shortNumber(phone: string): string {
  if (phone === "pending") return "pending";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 7 ? `…${digits.slice(-7)}` : phone;
}

function statusDot(status: string, expiresAt: string | null) {
  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
  if (status === "active" && !expired) return "bg-emerald-500";
  if (status === "pending_payment")    return "bg-amber-400";
  return "bg-zinc-400";
}

function priceLabel(num: VirtualNumber): string {
  if (num.provider === "smspool" && num.monthly_ngn <= 500) return "₦150";
  if (num.monthly_ngn) return `₦${Math.round(num.monthly_ngn).toLocaleString()}/mo`;
  return "";
}

function NumbersPage() {
  const navigate = useNavigate();

  const runGetNumbers  = useServerFn(getUserNumbers);
  const runGetAllMsgs  = useServerFn(getAllMessages);
  const runSearch      = useServerFn(searchMessages);
  const runExport      = useServerFn(exportMessages);
  const runGetWallet   = useServerFn(getWalletData);

  // Core state
  const [numbers,      setNumbers]      = useState<VirtualNumber[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedTab,  setSelectedTab]  = useState<string | null>(null);
  const [subTab,       setSubTab]       = useState<SubTab>("inbox");
  const [buyOpen,      setBuyOpen]      = useState(false);

  // Wallet
  const [balance,      setBalance]      = useState<number | null>(null);
  const [fxRate,       setFxRate]       = useState(1600);

  // All SMS
  const [messages,     setMessages]     = useState<any[]>([]);
  const [msgsLoading,  setMsgsLoading]  = useState(false);
  const [msgSearch,    setMsgSearch]    = useState("");
  const [searching,    setSearching]    = useState(false);
  const [searchResults,setSearchResults]= useState<any[] | null>(null);
  const [exporting,    setExporting]    = useState(false);

  // Horizontal tab scroll ref
  const tabsRef = useRef<HTMLDivElement>(null);

  // URL params
  const { status, wallet: walletParam } = Route.useSearch() as { status?: string; wallet?: string };
  useEffect(() => {
    if (status === "success") {
      toast.success("Payment confirmed! Your number is being activated.");
      navigate({ to: "/numbers", replace: true });
    } else if (status === "cancel") {
      toast.info("Number purchase cancelled.");
      navigate({ to: "/numbers", replace: true });
    } else if (walletParam === "funded") {
      toast.success("Wallet topped up!");
      navigate({ to: "/numbers", replace: true });
      // Refresh balance
      runGetWallet().then((r) => { setBalance(r.balance); setFxRate(r.fxRate); });
    }
  }, [status, walletParam]);

  // Load wallet + numbers on mount
  useEffect(() => {
    runGetWallet().then((r) => { setBalance(r.balance); setFxRate(r.fxRate); });
    loadNumbers();
  }, []);

  const loadNumbers = async () => {
    setLoading(true);
    const res = await runGetNumbers();
    if ("numbers" in res) {
      const nums = (res.numbers ?? []) as VirtualNumber[];
      setNumbers(nums);
      // Auto-select first number if nothing selected yet
      if (nums.length > 0 && !selectedTab) {
        setSelectedTab(nums[0].id);
      }
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    setMsgsLoading(true);
    const res = await runGetAllMsgs();
    if ("messages" in res) setMessages(res.messages ?? []);
    setMsgsLoading(false);
  };

  // Load messages when all-SMS tab is opened
  useEffect(() => {
    if (selectedTab === TAB_ALL_SMS && messages.length === 0) loadMessages();
  }, [selectedTab]);

  const handleSearch = async () => {
    if (!msgSearch.trim()) { setSearchResults(null); return; }
    setSearching(true);
    const res = await runSearch({ data: { query: msgSearch.trim() } });
    setSearching(false);
    if ("messages" in res) setSearchResults(res.messages);
  };

  const handleExport = async () => {
    setExporting(true);
    const res = await runExport({ data: {} });
    setExporting(false);
    if ("error" in res || !res.csv) { toast.error("Export failed"); return; }
    const blob = new Blob([res.csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `sms-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const handleNumberUpdated = (id: string, updates: Partial<VirtualNumber>) => {
    setNumbers((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
  };

  const handleNumberDeleted = (id: string) => {
    setNumbers((prev) => {
      const next = prev.filter((n) => n.id !== id);
      // Switch to next number or all-sms
      if (selectedTab === id) setSelectedTab(next[0]?.id ?? TAB_ALL_SMS);
      return next;
    });
  };

  const selectedNumber = numbers.find((n) => n.id === selectedTab) ?? null;

  const allSubTabs: Array<{ id: SubTab; label: string; icon: React.ReactNode; hide?: boolean }> = [
    { id: "inbox"     as SubTab, label: "Inbox",     icon: <MessageSquare className="size-3.5" /> },
    { id: "send"      as SubTab, label: "Send",      icon: <Send className="size-3.5" />,        hide: selectedNumber?.provider !== "telnyx" || selectedNumber?.status !== "active" },
    { id: "templates" as SubTab, label: "Templates", icon: <Zap className="size-3.5" />,         hide: selectedNumber?.provider !== "telnyx" },
    { id: "analytics" as SubTab, label: "Analytics", icon: <BarChart3 className="size-3.5" /> },
    { id: "settings"  as SubTab, label: "Settings",  icon: <Settings2 className="size-3.5" /> },
  ];
  const subTabs = allSubTabs.filter((t) => !t.hide);

  const displayedMessages = searchResults ?? messages;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DashboardShell>
      <div className="flex h-full flex-col gap-4">

        {/* ── Page header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Virtual Numbers</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Real phone numbers for SMS, WhatsApp, and client calls.
            </p>
          </div>
          <WalletWidget balance={balance} fxRate={fxRate} />
        </div>

        {/* ── Number tab bar ───────────────────────────────────────────────────── */}
        <div className="relative">
          <div
            ref={tabsRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Individual number tabs */}
            {numbers.map((num) => {
              const country   = NUMBER_COUNTRIES.find((c) => c.code === num.country_code);
              const flag      = country?.flag ?? "🌐";
              const isActive  = selectedTab === num.id;
              const dot       = statusDot(num.status, num.expires_at);
              const price     = priceLabel(num);
              const label     = num.label ?? shortNumber(num.phone_number);

              return (
                <button
                  key={num.id}
                  onClick={() => {
                    setSelectedTab(num.id);
                    setSubTab("inbox");
                  }}
                  className={`group flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {/* Status dot */}
                  <span className={`size-2 shrink-0 rounded-full ${dot}`} />

                  {/* Flag + label */}
                  <span className="text-base leading-none">{flag}</span>
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-semibold ${isActive ? "text-foreground" : ""}`} style={{ maxWidth: "9rem" }}>
                      {label}
                    </p>
                    {price && (
                      <p className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {price}
                      </p>
                    )}
                  </div>

                  {/* Auto-renew indicator */}
                  {num.auto_renew && (
                    <span className="shrink-0 text-[10px] text-primary">↻</span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            {numbers.length > 0 && (
              <div className="mx-1 h-8 w-px shrink-0 bg-border" />
            )}

            {/* All SMS tab */}
            <button
              onClick={() => setSelectedTab(TAB_ALL_SMS)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                selectedTab === TAB_ALL_SMS
                  ? "border-primary bg-primary/5 text-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <MessageSquare className="size-3.5" /> All SMS
              {messages.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {messages.length}
                </span>
              )}
            </button>

            {/* Temp orders tab */}
            <button
              onClick={() => setSelectedTab(TAB_TEMP)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                selectedTab === TAB_TEMP
                  ? "border-amber-400 bg-amber-50/60 text-amber-800 shadow-sm dark:bg-amber-900/20 dark:text-amber-300"
                  : "border-border bg-card text-muted-foreground hover:border-amber-300 hover:text-foreground"
              }`}
            >
              <Zap className="size-3.5" /> Temp
            </button>

            {/* Buy button */}
            <Button
              variant="hero"
              size="sm"
              className="ml-1 shrink-0 gap-1.5"
              onClick={() => setBuyOpen(true)}
            >
              <Plus className="size-3.5" /> Buy number
            </Button>
          </div>
        </div>

        {/* ── Main content area ────────────────────────────────────────────────── */}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        )}

        {/* Empty state — no numbers yet */}
        {!loading && numbers.length === 0 && !selectedTab && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Phone className="size-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No numbers yet</h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Get a virtual number in 50+ countries — receive SMS, WhatsApp OTPs, and client calls.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              <span>🇺🇸 ₦{Math.round(1.00 * fxRate).toLocaleString()}/mo</span>
              <span>🇬🇧 ₦{Math.round(1.00 * fxRate).toLocaleString()}/mo</span>
              <span>🇩🇪 ₦{Math.round(1.50 * fxRate).toLocaleString()}/mo</span>
              <span>🇦🇺 ₦{Math.round(1.50 * fxRate).toLocaleString()}/mo</span>
              <span>⚡ ₦150 one-time</span>
            </div>
            <Button variant="hero" onClick={() => setBuyOpen(true)}>
              <Plus className="size-4" /> Get your first number
            </Button>
          </div>
        )}

        {/* ── Selected: a real virtual number ──────────────────────────────────── */}
        {!loading && selectedNumber && (
          <div className="flex flex-col gap-3">
            {/* Number header */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {NUMBER_COUNTRIES.find((c) => c.code === selectedNumber.country_code)?.flag ?? "🌐"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-bold">{selectedNumber.phone_number}</p>
                    {selectedNumber.label && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {selectedNumber.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {selectedNumber.status === "active" ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3" /> Active
                      </span>
                    ) : selectedNumber.status === "pending_payment" ? (
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Clock className="size-3" /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-400 font-medium">
                        <Clock className="size-3" /> Expired
                      </span>
                    )}
                    {selectedNumber.expires_at && selectedNumber.status === "active" && (
                      <span>· Expires {new Date(selectedNumber.expires_at).toLocaleDateString()}</span>
                    )}
                    {selectedNumber.auto_renew && (
                      <span className="text-primary">· Auto-renew on</span>
                    )}
                    {selectedNumber.call_forward_enabled && selectedNumber.call_forward_to && (
                      <span>· Forwarding to {selectedNumber.call_forward_to}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-primary">{priceLabel(selectedNumber)}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedNumber.provider}</p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
              {subTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                    subTab === t.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Sub-tab content */}
            <div className="rounded-2xl border border-border bg-card p-5">
              {subTab === "inbox" && (
                <SmsInbox
                  numberId={selectedNumber.id}
                  phoneNumber={selectedNumber.phone_number}
                  provider={selectedNumber.provider ?? "telnyx"}
                />
              )}
              {subTab === "send" && selectedNumber.provider === "telnyx" && (
                <OutboundSMS
                  numberId={selectedNumber.id}
                  fromNumber={selectedNumber.phone_number}
                />
              )}
              {subTab === "templates" && selectedNumber.provider === "telnyx" && (
                <SMSTemplates />
              )}
              {subTab === "analytics" && (
                <NumberAnalytics numberId={selectedNumber.id} />
              )}
              {subTab === "settings" && (
                <NumberSettings
                  number={selectedNumber}
                  fxRate={fxRate}
                  onUpdated={(updates) => handleNumberUpdated(selectedNumber.id, updates)}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Selected: All SMS ────────────────────────────────────────────────── */}
        {!loading && selectedTab === TAB_ALL_SMS && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search all messages…"
                  value={msgSearch}
                  onChange={(e) => {
                    setMsgSearch(e.target.value);
                    if (!e.target.value) setSearchResults(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching || !msgSearch}>
                {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                CSV
              </Button>
            </div>

            {searchResults !== null && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{msgSearch}"
                </span>
                <button
                  onClick={() => { setSearchResults(null); setMsgSearch(""); }}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <X className="size-3" /> Clear
                </button>
              </div>
            )}

            {msgsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}

            {!msgsLoading && displayedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
                <MessageSquare className="size-10 text-muted-foreground/30" />
                <p className="font-medium">
                  {searchResults !== null ? "No messages match your search" : "No messages yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchResults !== null
                    ? "Try a different keyword"
                    : "Incoming SMS will appear here in real time."}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {displayedMessages.map((msg: any) => {
                const otp      = extractOTP(msg.body);
                const numPhone = msg.virtual_numbers?.phone_number ?? msg.to_number;
                const flag     = NUMBER_COUNTRIES.find(
                  (c) => c.code === msg.virtual_numbers?.country_code,
                )?.flag ?? "🌐";

                return (
                  <div key={msg.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          className={`size-4 shrink-0 ${
                            msg.direction === "outbound" ? "text-emerald-500" : "text-primary"
                          }`}
                        />
                        <div>
                          <p className="font-mono text-sm font-semibold">{msg.from_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {msg.direction === "outbound" ? "sent to" : "to"} {flag} {numPhone}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Jump to number */}
                        {msg.number_id && (
                          <button
                            onClick={() => {
                              setSelectedTab(msg.number_id);
                              setSubTab("inbox");
                            }}
                            className="text-xs text-muted-foreground hover:text-primary"
                            title="Open in inbox"
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.received_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-foreground">{msg.body}</p>

                    {otp && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">
                            OTP detected
                          </p>
                          <p className="font-mono text-2xl font-bold tracking-widest text-primary">{otp}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(otp);
                            toast.success("OTP copied!");
                            pushOTPHistory(otp, numPhone ?? "SMS");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          Copy OTP
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!msgsLoading && messages.length > 0 && !searchResults && (
              <button
                onClick={loadMessages}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                ↻ Refresh
              </button>
            )}
          </div>
        )}

        {/* ── Selected: Temp Orders ─────────────────────────────────────────────── */}
        {!loading && selectedTab === TAB_TEMP && (
          <SMSPoolOrders onRefreshNumbers={loadNumbers} />
        )}
      </div>

      {/* Floating OTP history tray */}
      <OTPHistory />

      <BuyNumberDialog
        open={buyOpen}
        onOpenChange={(o) => {
          setBuyOpen(o);
          if (!o) loadNumbers();
        }}
      />
    </DashboardShell>
  );
}
