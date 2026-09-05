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

function formatPhoneNumber(phone: string, countryCode?: string): string {
  const raw = String(phone ?? "").trim();

  if (!raw || raw === "pending") return raw;

  const digits = raw.replace(/\D/g, "");

  if (
    (countryCode === "US" || countryCode === "CA") &&
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (
    (countryCode === "US" || countryCode === "CA") &&
    digits.length === 10
  ) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return raw.startsWith("+") ? raw : `+${digits}`;
}

function statusDot(status: string, expiresAt: string | null) {
  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
  if (status === "active" && !expired) return "bg-emerald-500";
  if (status === "pending_payment")    return "bg-amber-400";
  return "bg-zinc-400";
}

function expiryCountdown(expiresAt: string | null, nowMs: number): string {
  if (!expiresAt) return "";

  const expiryMs = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryMs)) return "";

  const diff = expiryMs - nowMs;

  if (diff <= 0) return "";

  const totalSeconds = Math.ceil(diff / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const [nowMs,        setNowMs]        = useState(() => Date.now());

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

  // Keep expiration countdowns live across My Numbers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
      <style>{`
        @keyframes numbersTicker {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        .numbers-ticker-track {
          animation: numbersTicker 30s linear infinite;
          will-change: transform;
        }

        .numbers-ticker:hover .numbers-ticker-track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .numbers-ticker-track {
            animation: none;
          }
        }
      `}</style>

      <div className="flex min-h-full flex-col gap-6">

        {/* Top header */}
        <section className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Virtual Numbers
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Buy virtual numbers for WhatsApp, Telegram, surveys, app sign-ups,
              OTP verification, and more.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WalletWidget balance={balance} fxRate={fxRate} />

            <Button
              variant="hero"
              className="h-11 gap-2 px-5 shadow-sm"
              onClick={() => setBuyOpen(true)}
            >
              <Plus className="size-4" />
              Buy a number
            </Button>
          </div>
        </section>

        {/* Popular uses ticker */}
        <section className="numbers-ticker relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center">

            <div className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-r border-border bg-card px-4">
              <span className="size-2 rounded-full bg-red-500" />

              <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-red-500">
                Popular Uses
              </span>
            </div>

            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent" />

              <div className="numbers-ticker-track flex w-max items-center">
                {[
                  "WhatsApp verification",
                  "Telegram verification",
                  "Survey sign-ups",
                  "App registrations",
                  "OTP verification",
                  "Social media accounts",
                  "Dating apps",
                  "Marketplace accounts",
                  "Email verification",
                  "Online services",
                  "WhatsApp verification",
                  "Telegram verification",
                  "Survey sign-ups",
                  "App registrations",
                  "OTP verification",
                  "Social media accounts",
                  "Dating apps",
                  "Marketplace accounts",
                  "Email verification",
                  "Online services",
                ].map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex h-12 shrink-0 items-center"
                  >
                    <span className="whitespace-nowrap px-5 text-sm font-medium text-foreground">
                      {item}
                    </span>

                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Human support notice */}
        <section className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-4 sm:items-center sm:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="size-4 text-primary" />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">
              Not sure which number works for your service?
            </span>{" "}
            Click the live chat button and type{" "}
            <span className="font-bold text-primary">
              "human"
            </span>{" "}
            to speak with our team.
          </p>
        </section>

        {/* Main navigation */}
        <nav className="overflow-x-auto border-b border-border">
          <div className="flex min-w-max items-center gap-1">

            <button
              onClick={() => {
                if (numbers.length > 0) {
                  setSelectedTab(numbers[0].id);
                  setSubTab("inbox");
                } else {
                  setSelectedTab(null);
                }
              }}
              className={`relative flex h-13 items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                selectedTab !== TAB_ALL_SMS &&
                selectedTab !== TAB_TEMP
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="size-4" />
              My Numbers

              {selectedTab !== TAB_ALL_SMS &&
                selectedTab !== TAB_TEMP && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
            </button>

            <button
              onClick={() => setSelectedTab(TAB_ALL_SMS)}
              className={`relative flex h-13 items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                selectedTab === TAB_ALL_SMS
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="size-4" />
              SMS

              {selectedTab === TAB_ALL_SMS && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setSelectedTab(TAB_TEMP)}
              className={`relative flex h-13 items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                selectedTab === TAB_TEMP
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-4" />
              Verification Orders

              {selectedTab === TAB_TEMP && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>

            {selectedNumber && (
              <button
                onClick={() => setSubTab("settings")}
                className={`relative flex h-13 items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                  subTab === "settings"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="size-4" />
                Settings
              </button>
            )}
          </div>
        </nav>

        {/* Large main panel */}
        <section className="min-h-[520px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

          {/* Loading */}
          {loading && (
            <div className="flex min-h-[520px] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}

          {/* Empty */}
          {!loading && numbers.length === 0 && !selectedTab && (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-16 text-center">

              <div className="relative flex size-24 items-center justify-center rounded-full bg-primary/[0.06]">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-background shadow-sm">
                  <Phone className="size-7 text-primary" />
                </div>

                <span className="absolute -right-1 top-3 text-lg font-bold text-primary/50">
                  +
                </span>

                <span className="absolute -left-1 bottom-4 text-lg font-bold text-primary/40">
                  +
                </span>
              </div>

              <h2 className="mt-7 text-xl font-bold tracking-tight text-foreground">
                No virtual numbers yet
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Get a number for WhatsApp, Telegram, surveys, app registrations,
                social media accounts, or one-time verification codes.
              </p>

              <Button
                variant="hero"
                className="mt-6 gap-2 px-5"
                onClick={() => setBuyOpen(true)}
              >
                <Plus className="size-4" />
                Buy a number
              </Button>
            </div>
          )}

          {/* Selected number */}
          {!loading && selectedNumber && (
            <div>
              <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                    {NUMBER_COUNTRIES.find(
                      (c) =>
                        c.code.toUpperCase() ===
                        String(selectedNumber.country_code ?? "")
                          .trim()
                          .toUpperCase()
                    )?.flag ??
                      (() => {
                        const code = String(
                          selectedNumber.country_code ?? ""
                        )
                          .trim()
                          .toUpperCase();

                        return /^[A-Z]{2}$/.test(code)
                          ? String.fromCodePoint(
                              ...[...code].map(
                                (char) => 127397 + char.charCodeAt(0)
                              )
                            )
                          : String.fromCodePoint(0x1f310);
                      })()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-lg font-bold">
                        {formatPhoneNumber(
                          selectedNumber.phone_number,
                          selectedNumber.country_code
                        )}
                      </p>

                      {selectedNumber.label && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          {selectedNumber.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">

                      {selectedNumber.status === "pending_payment" ? (
                        <span className="flex items-center gap-1 font-semibold text-amber-500">
                          <Clock className="size-3.5" />
                          Pending
                        </span>
                      ) : selectedNumber.status === "released" ||
                        (selectedNumber.expires_at &&
                          new Date(selectedNumber.expires_at).getTime() <= nowMs) ? (
                        <span className="flex items-center gap-1 font-semibold text-zinc-400">
                          <Clock className="size-3.5" />
                          Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 className="size-3.5" />
                          Active
                        </span>
                      )}

                      {selectedNumber.expires_at &&
                        new Date(selectedNumber.expires_at).getTime() > nowMs &&
                        selectedNumber.status !== "pending_payment" &&
                        selectedNumber.status !== "released" && (
                          <>
                            <span className="text-border">•</span>
                            <span className="font-medium">
                              Expires in{" "}
                              {expiryCountdown(selectedNumber.expires_at, nowMs)}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  {selectedNumber.status === "active" && (
                    <p className="font-bold text-primary">
                      {priceLabel(selectedNumber)}
                    </p>
                  )}

                  <p
                    className={`text-xs capitalize text-muted-foreground ${
                      selectedNumber.status === "active" ? "mt-0.5" : ""
                    }`}
                  >
                    {selectedNumber.number_type ?? "Virtual number"}
                  </p>
                </div>
              </div>

              {/* Number-specific navigation */}
              <div className="overflow-x-auto border-b border-border px-3">
                <div className="flex min-w-max">
                  {subTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSubTab(tab.id)}
                      className={`relative flex h-12 items-center gap-2 px-4 text-sm font-medium transition-colors ${
                        subTab === tab.id
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}

                      {subTab === tab.id && (
                        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {subTab === "inbox" && (
                  <SmsInbox
                    numberId={selectedNumber.id}
                    phoneNumber={formatPhoneNumber(
                          selectedNumber.phone_number,
                          selectedNumber.country_code
                        )}
                    provider={selectedNumber.provider ?? "telnyx"}
                  />
                )}

                {subTab === "send" &&
                  selectedNumber.provider === "telnyx" && (
                    <OutboundSMS
                      numberId={selectedNumber.id}
                      fromNumber={formatPhoneNumber(
                          selectedNumber.phone_number,
                          selectedNumber.country_code
                        )}
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
            <div>
              <div className="border-b border-border px-5 py-5">
                <h2 className="text-lg font-bold">
                  All Messages
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  View SMS received across all your virtual numbers.
                </p>
              </div>

              <div className="p-4 sm:p-6">

                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={msgSearch}
                      onChange={(e) => {
                        setMsgSearch(e.target.value)

                        if (!e.target.value) {
                          setSearchResults(null)
                        }
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearch()
                      }
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
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
                  >
                    {exporting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </div>

                {searchResults !== null && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {searchResults.length} result
                      {searchResults.length !== 1 ? "s" : ""} for "{msgSearch}"
                    </span>

                    <button
                      onClick={() => {
                        setSearchResults(null)
                        setMsgSearch("")
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
                  <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                    <MessageSquare className="size-10 text-muted-foreground/25" />

                    <p className="mt-3 font-semibold">
                      {searchResults !== null
                        ? "No messages match your search"
                        : "No messages yet"}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Incoming SMS will appear here.
                    </p>
                  </div>
                )}

                <div className="mt-5 divide-y divide-border">
                  {displayedMessages.map((msg: any) => {
                    const otp = extractOTP(msg.body)

                    const numPhone =
                      msg.virtual_numbers?.phone_number ??
                      msg.to_number

                    const flag =
                      NUMBER_COUNTRIES.find(
                        (c) =>
                          c.code ===
                          msg.virtual_numbers?.country_code
                      )?.flag ?? String.fromCodePoint(0x1f310)

                    return (
                      <div
                        key={msg.id}
                        className="py-5 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-4">

                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
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

                              <p className="mt-1 truncate text-xs text-muted-foreground">
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
                                  setSelectedTab(msg.number_id)
                                  setSubTab("inbox")
                                }}
                                className="text-muted-foreground hover:text-primary"
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

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                          {msg.body}
                        </p>

                        {otp && (
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                OTP detected
                              </p>

                              <p className="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-primary">
                                {otp}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(otp)
                                toast.success("OTP copied!")

                                pushOTPHistory(
                                  otp,
                                  numPhone ?? "SMS"
                                )
                              }}
                            >
                              Copy OTP
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Temporary verification orders */}
          {!loading && selectedTab === TAB_TEMP && (
            <div>
              <div className="border-b border-border px-5 py-5">
                <h2 className="text-lg font-bold">
                  Verification Orders
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Track temporary numbers and one-time verification orders.
                </p>
              </div>

              <div className="p-4 sm:p-6">
                <SMSPoolOrders onRefreshNumbers={loadNumbers} />
              </div>
            </div>
          )}
        </section>
      </div>

      <OTPHistory />

      <BuyNumberDialog
        open={buyOpen}
        onOpenChange={(open) => {
          setBuyOpen(open)

          if (!open) {
            loadNumbers()
          }
        }}
      />
    </DashboardShell>
  )
}