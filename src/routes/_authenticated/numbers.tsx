import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  // Render
  return (
    <DashboardShell>
      <div className="flex h-full min-h-0 flex-col gap-5">

        {/* Compact page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Virtual Numbers
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Buy virtual numbers for WhatsApp, Telegram, surveys, app sign-ups,
              OTP verification, and more.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "WhatsApp",
                "Telegram",
                "Surveys",
                "App sign-ups",
                "OTP verification",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Not sure which number works for your service?
              </span>{" "}
              Click the live chat button and type{" "}
              <span className="font-semibold text-primary">"human"</span>{" "}
              to speak with our team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WalletWidget balance={balance} fxRate={fxRate} />

            <Button
              variant="hero"
              className="gap-2"
              onClick={() => setBuyOpen(true)}
            >
              <Plus className="size-4" />
              Buy a number
            </Button>
          </div>
        </div>

        {/* Main workspace */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => setBuyOpen(true)}
              >
                <Plus className="size-4" />
                Add number
              </Button>
            </div>

            {/* Mobile horizontal list / Desktop vertical list */}
            <div className="flex gap-2 overflow-x-auto p-3 lg:max-h-[calc(100vh-260px)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">

              {loading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 min-w-[210px] animate-pulse rounded-xl bg-muted lg:min-w-0"
                    />
                  ))}
                </>
              )}

              {!loading &&
                numbers.map((num) => {
                  const country = NUMBER_COUNTRIES.find(
                    (c) => c.code === num.country_code
                  );

                  const flag = country?.flag ?? String.fromCodePoint(0x1f310);
                  const isActive = selectedTab === num.id;
                  const dot = statusDot(num.status, num.expires_at);
                  const price = priceLabel(num);
                  const label = num.label ?? shortNumber(num.phone_number);

                  return (
                    <button
                      key={num.id}
                      onClick={() => {
                        setSelectedTab(num.id);
                        setSubTab("inbox");
                      }}
                      className={`flex min-w-[210px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:min-w-0 ${
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className={`size-2 shrink-0 rounded-full ${dot}`} />

                      <span className="shrink-0 text-lg leading-none">
                        {flag}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            isActive ? "text-foreground" : ""
                          }`}
                        >
                          {label}
                        </p>

                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-[11px] text-muted-foreground">
                            {num.phone_number}
                          </span>

                          {price && (
                            <span className="shrink-0 text-[10px] font-medium text-primary">
                              {price}
                            </span>
                          )}
                        </div>
                      </div>

                      {num.auto_renew && (
                        <span className="shrink-0 text-xs text-primary">
                          ↻
                        </span>
                      )}
                    </button>
                  );
                })}

              {!loading && numbers.length > 0 && (
                <div className="mx-1 hidden border-t border-border lg:block" />
              )}

              <button
                onClick={() => setSelectedTab(TAB_ALL_SMS)}
                className={`flex min-w-[180px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:min-w-0 ${
                  selectedTab === TAB_ALL_SMS
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="size-4 shrink-0" />

                <span className="flex-1">All messages</span>

                {messages.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSelectedTab(TAB_TEMP)}
                className={`flex min-w-[180px] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:min-w-0 ${
                  selectedTab === TAB_TEMP
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Zap className="size-4 shrink-0" />
                <span>Temporary orders</span>
              </button>
            </div>
          </aside>

          {/* Main panel */}
          <main className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

            {/* No numbers */}
            {!loading && numbers.length === 0 && !selectedTab && (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Phone className="size-6 text-primary" />
                </div>

                <h2 className="mt-5 text-lg font-semibold">
                  No numbers yet
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Get a number for WhatsApp, Telegram, surveys, app registrations, or one-time verification codes.
                </p>

                <Button
                  variant="hero"
                  className="mt-5 gap-2"
                  onClick={() => setBuyOpen(true)}
                >
                  <Plus className="size-4" />
                  Get your first number
                </Button>
              </div>
            )}

            {/* Selected virtual number */}
            {!loading && selectedNumber && (
              <div className="flex min-h-[520px] flex-col">

                {/* Number header */}
                <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                      {NUMBER_COUNTRIES.find(
                        (c) => c.code === selectedNumber.country_code
                      )?.flag ?? String.fromCodePoint(0x1f310)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-base font-bold sm:text-lg">
                          {selectedNumber.phone_number}
                        </p>

                        {selectedNumber.label && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {selectedNumber.label}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {selectedNumber.status === "active" ? (
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <CheckCircle2 className="size-3" />
                            Active
                          </span>
                        ) : selectedNumber.status === "pending_payment" ? (
                          <span className="flex items-center gap-1 font-medium text-amber-500">
                            <Clock className="size-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-medium text-zinc-400">
                            <Clock className="size-3" />
                            Expired
                          </span>
                        )}

                        {selectedNumber.expires_at &&
                          selectedNumber.status === "active" && (
                            <span>
                              Expires{" "}
                              {new Date(
                                selectedNumber.expires_at
                              ).toLocaleDateString()}
                            </span>
                          )}

                        {selectedNumber.auto_renew && (
                          <span className="text-primary">
                            Auto-renew on
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="text-sm font-bold text-primary">
                      {priceLabel(selectedNumber)}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {selectedNumber.number_type ?? "Number"}
                    </p>
                  </div>
                </div>

                {/* Number navigation */}
                <div className="overflow-x-auto border-b border-border px-2 sm:px-4">
                  <div className="flex min-w-max">
                    {subTabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        className={`relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors ${
                          subTab === t.id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.icon}
                        {t.label}

                        {subTab === t.id && (
                          <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number content */}
                <div className="min-h-0 flex-1 p-4 sm:p-5">
                  {subTab === "inbox" && (
                    <SmsInbox
                      numberId={selectedNumber.id}
                      phoneNumber={selectedNumber.phone_number}
                      provider={selectedNumber.provider ?? "telnyx"}
                    />
                  )}

                  {subTab === "send" &&
                    selectedNumber.provider === "telnyx" && (
                      <OutboundSMS
                        numberId={selectedNumber.id}
                        fromNumber={selectedNumber.phone_number}
                      />
                    )}

                  {subTab === "templates" &&
                    selectedNumber.provider === "telnyx" && (
                      <SMSTemplates />
                    )}

                  {subTab === "analytics" && (
                    <NumberAnalytics numberId={selectedNumber.id} />
                  )}

                  {subTab === "settings" && (
                    <NumberSettings
                      number={selectedNumber}
                      fxRate={fxRate}
                      onUpdated={(updates) =>
                        handleNumberUpdated(selectedNumber.id, updates)
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* All messages */}
            {!loading && selectedTab === TAB_ALL_SMS && (
              <div className="min-h-[520px]">

                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h2 className="font-semibold text-foreground">
                    All messages
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Messages received across all your virtual numbers.
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={msgSearch}
                        onChange={(e) => {
                          setMsgSearch(e.target.value);

                          if (!e.target.value) {
                            setSearchResults(null);
                          }
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSearch()
                        }
                        className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSearch}
                      disabled={searching || !msgSearch}
                    >
                      {searching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={exporting}
                      className="gap-2"
                    >
                      {exporting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}

                      <span className="hidden sm:inline">CSV</span>
                    </Button>
                  </div>

                  {searchResults !== null && (
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {searchResults.length} result
                        {searchResults.length !== 1 ? "s" : ""} for "
                        {msgSearch}"
                      </span>

                      <button
                        onClick={() => {
                          setSearchResults(null);
                          setMsgSearch("");
                        }}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <X className="size-3" />
                        Clear
                      </button>
                    </div>
                  )}

                  {msgsLoading && (
                    <div className="mt-5 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-24 animate-pulse rounded-xl bg-muted"
                        />
                      ))}
                    </div>
                  )}

                  {!msgsLoading && displayedMessages.length === 0 && (
                    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                      <MessageSquare className="size-9 text-muted-foreground/30" />

                      <p className="mt-3 font-medium">
                        {searchResults !== null
                          ? "No messages match your search"
                          : "No messages yet"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {searchResults !== null
                          ? "Try another keyword."
                          : "Incoming SMS will appear here."}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 divide-y divide-border">
                    {displayedMessages.map((msg: any) => {
                      const otp = extractOTP(msg.body);

                      const numPhone =
                        msg.virtual_numbers?.phone_number ?? msg.to_number;

                      const flag =
                        NUMBER_COUNTRIES.find(
                          (c) =>
                            c.code ===
                            msg.virtual_numbers?.country_code
                        )?.flag ?? String.fromCodePoint(0x1f310);

                      return (
                        <div key={msg.id} className="py-4 first:pt-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <MessageSquare
                                  className={`size-4 ${
                                    msg.direction === "outbound"
                                      ? "text-emerald-500"
                                      : "text-primary"
                                  }`}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-mono text-sm font-semibold">
                                  {msg.from_number}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {msg.direction === "outbound"
                                    ? "sent to"
                                    : "to"}{" "}
                                  {flag} {numPhone}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {msg.number_id && (
                                <button
                                  onClick={() => {
                                    setSelectedTab(msg.number_id);
                                    setSubTab("inbox");
                                  }}
                                  className="text-muted-foreground hover:text-primary"
                                  title="Open inbox"
                                >
                                  <ChevronRight className="size-4" />
                                </button>
                              )}

                              <span className="hidden text-xs text-muted-foreground sm:inline">
                                {new Date(
                                  msg.received_at
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {msg.body}
                          </p>

                          {otp && (
                            <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                                  OTP detected
                                </p>

                                <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.2em] text-primary">
                                  {otp}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(otp);
                                  toast.success("OTP copied!");
                                  pushOTPHistory(
                                    otp,
                                    numPhone ?? "SMS"
                                  );
                                }}
                              >
                                Copy OTP
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!msgsLoading &&
                    messages.length > 0 &&
                    !searchResults && (
                      <button
                        onClick={loadMessages}
                        className="mt-4 w-full py-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Refresh messages
                      </button>
                    )}
                </div>
              </div>
            )}

            {/* Temporary orders */}
            {!loading && selectedTab === TAB_TEMP && (
              <div className="min-h-[520px]">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h2 className="font-semibold text-foreground">
                    Temporary orders
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    One-time SMS verification numbers and active OTP orders.
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  <SMSPoolOrders onRefreshNumbers={loadNumbers} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <OTPHistory />

      <BuyNumberDialog
        open={buyOpen}
        onOpenChange={(o) => {
          setBuyOpen(o);

          if (!o) {
            loadNumbers();
          }
        }}
      />
    </DashboardShell>
  );
}