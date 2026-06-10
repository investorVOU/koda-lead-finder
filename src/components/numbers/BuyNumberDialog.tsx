import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { toast } from "sonner";
import {
  Loader2, Phone, Search, Wallet, CreditCard, Plus, ArrowLeft, MapPin,
  Clock, Zap, ChevronDown, Copy, Check, CheckCircle2, MessageSquare,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NUMBER_COUNTRIES, SMSPOOL_APPROX_PRICE_NGN, SMSPOOL_APPROX_PRICE_USD } from "@/lib/numbers";
import {
  searchAvailableNumbers,
  buyNumberFromWallet,
  initiateNumberPurchase,
  requestTempNumber,
  pollTempNumber,
  listSMSPoolCountries,
  listSMSPoolServices,
} from "@/lib/numbers.functions";
import { buyRentalSMSPool } from "@/lib/numbers-extra.functions";
import { getWalletData, initiateWalletTopUp } from "@/lib/wallet.functions";
import { extractOTP } from "@/lib/sms-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AvailableNumber = { phoneNumber: string; friendlyName: string; region?: string; locality?: string; monthlyCostUsd?: number };
type Step = "type" | "search" | "pay" | "temp" | "temp-wait" | "rental-smspool";
type NumberType = "rental" | "temp" | "rental-smspool";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;
const TOP_UP_PRESETS = [1000, 2500, 5000, 10000];

// Fallback lists shown immediately while the API loads
const FALLBACK_SMS_COUNTRIES = [
  { id: "US", name: "🇺🇸 United States" },
  { id: "GB", name: "🇬🇧 United Kingdom" },
  { id: "CA", name: "🇨🇦 Canada" },
  { id: "NG", name: "🇳🇬 Nigeria" },
  { id: "IN", name: "🇮🇳 India" },
  { id: "RU", name: "🇷🇺 Russia" },
  { id: "ID", name: "🇮🇩 Indonesia" },
  { id: "PH", name: "🇵🇭 Philippines" },
  { id: "UA", name: "🇺🇦 Ukraine" },
  { id: "VN", name: "🇻🇳 Vietnam" },
  { id: "BR", name: "🇧🇷 Brazil" },
  { id: "MX", name: "🇲🇽 Mexico" },
  { id: "FR", name: "🇫🇷 France" },
  { id: "DE", name: "🇩🇪 Germany" },
  { id: "PL", name: "🇵🇱 Poland" },
];

const FALLBACK_SMS_SERVICES = [
  { id: "any",       name: "Any (cheapest)" },
  { id: "whatsapp",  name: "WhatsApp" },
  { id: "telegram",  name: "Telegram" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook",  name: "Facebook" },
  { id: "twitter",   name: "X / Twitter" },
  { id: "google",    name: "Google" },
  { id: "microsoft", name: "Microsoft / Outlook" },
  { id: "tiktok",    name: "TikTok" },
  { id: "snapchat",  name: "Snapchat" },
  { id: "uber",      name: "Uber" },
];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function BuyNumberDialog({ open, onOpenChange }: Props) {
  const runSearch           = useServerFn(searchAvailableNumbers);
  const runWalletBuy        = useServerFn(buyNumberFromWallet);
  const runCardBuy          = useServerFn(initiateNumberPurchase);
  const runGetWallet        = useServerFn(getWalletData);
  const runTopUp            = useServerFn(initiateWalletTopUp);
  const runTempBuy          = useServerFn(requestTempNumber);
  const runPollTemp         = useServerFn(pollTempNumber);
  const runSMSPoolCountries = useServerFn(listSMSPoolCountries);
  const runSMSPoolServices  = useServerFn(listSMSPoolServices);
  const runRentalSMSPool    = useServerFn(buyRentalSMSPool);

  const [step,         setStep]         = useState<Step>("type");
  const [numType,      setNumType]      = useState<NumberType>("rental");

  // Rental (Telnyx) state
  const [country,      setCountry]      = useState("US");
  const [countrySearch, setCountrySearch] = useState("");
  const [searching,    setSearching]    = useState(false);
  const [results,      setResults]      = useState<AvailableNumber[]>([]);
  const [selected,     setSelected]     = useState<AvailableNumber | null>(null);
  const [payMethod,    setPayMethod]    = useState<"wallet" | "card">("wallet");
  const [cardProvider, setCardProvider] = useState<"stripe" | "paystack">("stripe");
  const [buying,       setBuying]       = useState(false);

  // SMSPool temp state — order
  const [tempCountry,  setTempCountry]  = useState("US");
  const [tempService,  setTempService]  = useState("any");
  const [tempBuying,   setTempBuying]   = useState(false);
  // Pre-seeded with fallbacks so the dropdowns are usable immediately
  const [smsCountries, setSmsCountries] = useState<Array<{ id: string; name: string }>>(FALLBACK_SMS_COUNTRIES);
  const [smsServices,  setSmsServices]  = useState<Array<{ id: string; name: string }>>(FALLBACK_SMS_SERVICES);
  const [loadingSMS,   setLoadingSMS]   = useState(false);

  const [smsPoolDays,    setSmsPoolDays]    = useState(7);
  const [rentalBuying,   setRentalBuying]   = useState(false);

  // SMSPool temp state — post-purchase (polling)
  const [tempResult,   setTempResult]   = useState<{ numberId: string; phoneNumber: string; orderId: string } | null>(null);
  const [tempSms,      setTempSms]      = useState<string | null>(null);
  const [timeLeft,     setTimeLeft]     = useState(20 * 60);
  const [tempExpired,  setTempExpired]  = useState(false);
  // Refs so interval callbacks always read current value without re-creating timers
  const expiredRef  = useRef(false);
  const smsRef      = useRef<string | null>(null);

  // hCaptcha — for payment flows
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Wallet
  const [toppingUp,    setToppingUp]    = useState(false);
  const [topUpAmount,  setTopUpAmount]  = useState(5000);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [fxRate,       setFxRate]       = useState(1600);

  // Derived
  const filteredCountries = NUMBER_COUNTRIES.filter((c) =>
    countrySearch === "" ||
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase()),
  );
  const selectedCountry = NUMBER_COUNTRIES.find((c) => c.code === country) ?? NUMBER_COUNTRIES[0];

  // Use actual price from Telnyx search result when a number is selected;
  // fall back to the static country table estimate before search.
  const actualUsd  = selected?.monthlyCostUsd ?? selectedCountry.usd;
  const ngnPrice   = Math.round(actualUsd * fxRate);
  const usdPrice   = actualUsd.toFixed(2);
  const usdEquiv   = (topUpAmount / fxRate).toFixed(2);
  // "from" estimate shown before search (uses static list)
  const fromNgn    = Math.round(selectedCountry.usd * fxRate);
  const hasEnough       = balance !== null && balance >= ngnPrice;
  const hasTempBalance  = balance !== null && balance >= SMSPOOL_APPROX_PRICE_NGN;
  const tempUsdPrice    = SMSPOOL_APPROX_PRICE_USD.toFixed(2);

  // Reset on open/close; load wallet + SMSPool lists
  useEffect(() => {
    if (!open) {
      setStep("type");
      setResults([]);
      setSelected(null);
      setCountrySearch("");
      setTempResult(null);
      setTempSms(null);
      smsRef.current = null;
      expiredRef.current = false;
      setTimeLeft(20 * 60);
      setTempExpired(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      return;
    }
    runGetWallet().then((res) => { setBalance(res.balance); setFxRate(res.fxRate); });
  }, [open]);

  // Refresh SMSPool lists + balance when the temp/rental-smspool step first opens.
  // Dropdowns are already usable from the pre-seeded fallbacks above.
  const [smsFetched, setSmsFetched] = useState(false);
  useEffect(() => {
    if ((step !== "temp" && step !== "rental-smspool") || smsFetched) return;
    setSmsFetched(true);
    setLoadingSMS(true);
    Promise.all([
      runSMSPoolCountries(),
      runSMSPoolServices(),
    ])
      .then(([c, s]) => {
        if (c.countries.length > FALLBACK_SMS_COUNTRIES.length) setSmsCountries(c.countries);
        if (s.services.length  > FALLBACK_SMS_SERVICES.length)  setSmsServices(s.services);
      })
      .catch(() => { /* keep fallbacks */ })
      .finally(() => setLoadingSMS(false));
  }, [step, smsFetched]);

  // ── SMS polling + countdown when waiting for temp number ──────────────────────
  useEffect(() => {
    if (step !== "temp-wait" || !tempResult) return;

    expiredRef.current = false;

    // 1-second countdown
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          expiredRef.current = true;
          setTempExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Poll SMSPool inbox every 5 seconds
    const poll = setInterval(async () => {
      if (expiredRef.current || smsRef.current) return;
      try {
        const res = await runPollTemp({ data: { numberId: tempResult.numberId } });
        if ("status" in res) {
          if (res.status === "received" && "sms" in res) {
            const txt = String(res.sms);
            smsRef.current = txt;
            setTempSms(txt);
          } else if (res.status === "expired") {
            expiredRef.current = true;
            setTempExpired(true);
          }
        }
      } catch { /* network error — retry next tick */ }
    }, 5000);

    return () => { clearInterval(timer); clearInterval(poll); };
  }, [step, tempResult?.numberId]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const search = async () => {
    setResults([]); setSearching(true);
    const res = await runSearch({ data: { country, type: "local" } });
    setSearching(false);
    if ("error" in res) { toast.error(res.message); return; }
    setResults(res.numbers);
  };

  const selectNumber = (n: AvailableNumber) => { setSelected(n); setStep("pay"); };

  const buyFromWallet = async () => {
    if (!selected) return;
    setBuying(true);
    const res = await runWalletBuy({
      data: {
        phoneNumber:  selected.phoneNumber,
        country,
        // Price is looked up server-side — not passed from client
      },
    });
    setBuying(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number activated! It will appear in your list.");
    // Deduct display amount optimistically (server charges actual rate)
    setBalance((b) => b !== null ? b - ngnPrice : b);
    onOpenChange(false);
  };

  const buyWithCard = async () => {
    if (!selected) return;
    setBuying(true);
    const res = await runCardBuy({
      data: {
        phoneNumber: selected.phoneNumber,
        country,
        provider:    cardProvider,
        // Origin is derived server-side; price is looked up server-side
      },
    });
    setBuying(false);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  const buyTemp = async () => {
    setTempBuying(true);
    const res = await runTempBuy({ data: { country: tempCountry, service: tempService } });
    setTempBuying(false);
    if ("error" in res) { toast.error(res.message); return; }
    // Transition to the live polling view instead of closing
    setTempResult({
      numberId:    res.numberId,
      phoneNumber: res.phoneNumber,
      orderId:     res.orderId,
    });
    setStep("temp-wait");
    setTimeLeft(20 * 60);
    setBalance((b) => b !== null ? b - SMSPOOL_APPROX_PRICE_NGN : b);
  };

  const autoRetry = async () => {
    // Cancel current order (best-effort) and re-buy
    if (tempResult) {
      // The old order is re-polled by SmsInbox; just start a new purchase
      setStep("temp");
      setTempResult(null);
      setTempSms(null);
      smsRef.current = null;
      expiredRef.current = false;
      setTimeLeft(20 * 60);
      setTempExpired(false);
    }
  };

  const buyRentalPool = async () => {
    setRentalBuying(true);
    const res = await runRentalSMSPool({ data: { country: tempCountry, service: tempService, days: smsPoolDays } });
    setRentalBuying(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success(`Rental number ready: ${res.phoneNumber} — valid for ${smsPoolDays} days!`);
    onOpenChange(false);
  };

  const topUp = async (provider: "stripe" | "paystack") => {
    setToppingUp(true);
    const res = await runTopUp({ data: { amountNgn: topUpAmount, provider } });
    setToppingUp(false);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  const otp = tempSms ? extractOTP(tempSms) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {(step === "pay" || step === "temp" || step === "rental-smspool") && (
            <button
              onClick={() => setStep(step === "pay" ? "search" : "type")}
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Back
            </button>
          )}
          <DialogTitle>
            {step === "type"           ? "Get a virtual number" :
             step === "search"         ? "Find a rental number" :
             step === "pay"            ? "Complete your purchase" :
             step === "temp-wait"      ? "Number ready — waiting for SMS" :
             step === "rental-smspool" ? "SMSPool rental number" :
                                         "Get a temp OTP number"}
          </DialogTitle>
          <DialogDescription>
            {step === "type"           ? "Choose between a monthly rental, one-time OTP, or a multi-day rental." :
             step === "search"         ? "Monthly rental via Telnyx — receive unlimited SMS." :
             step === "pay"            ? `Activate ${selected?.phoneNumber} — ₦${ngnPrice.toLocaleString()}/month` :
             step === "temp-wait"      ? "Use the number below for your verification. SMS will appear automatically." :
             step === "rental-smspool" ? "Rent a number for 1–30 days. Cheaper than Telnyx for short-term use." :
                                         "One-time use. Expires after 20 min or first SMS received."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP: Type selector ── */}
        {step === "type" && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setNumType("rental"); setStep("search"); }}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Rental Number <span className="text-[10px] text-muted-foreground font-normal ml-1">via Telnyx</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Monthly rental — unlimited SMS, 50+ countries.
                </p>
              </div>
              <div className="shrink-0 text-right text-xs font-bold text-primary">
                from ₦{Math.round(1.00 * fxRate).toLocaleString()}/mo
              </div>
            </button>

            <button
              onClick={() => { setNumType("rental-smspool"); setStep("rental-smspool"); }}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <Clock className="size-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Short-term Rental <span className="text-[10px] text-muted-foreground font-normal ml-1">via SMSPool</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  1–30 day rental — ideal for short campaigns.
                </p>
              </div>
              <div className="shrink-0 text-right text-xs font-bold text-emerald-600">
                from ₦{Math.round(0.50 * fxRate).toLocaleString()}/day
              </div>
            </button>

            <button
              onClick={() => { setNumType("temp"); setStep("temp"); }}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-amber-400/60 hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Zap className="size-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Temp / OTP Number <span className="text-[10px] text-muted-foreground font-normal ml-1">via SMSPool</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Single use. Expires after 20 min or first SMS.
                </p>
              </div>
              <div className="shrink-0 text-right text-xs font-bold text-amber-500">
                ~₦{SMSPOOL_APPROX_PRICE_NGN}/use
              </div>
            </button>
          </div>
        )}

        {/* ── STEP: Search (Telnyx rental) ── */}
        {step === "search" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              {/* Searchable country picker */}
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search country…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {countrySearch === "" && (
                    <span className="shrink-0 text-sm">
                      {selectedCountry.flag} {selectedCountry.name}
                    </span>
                  )}
                </div>
                {countrySearch !== "" && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No countries found</p>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => { setCountry(c.code); setCountrySearch(""); setResults([]); }}
                        >
                          <span>{c.flag} {c.name}</span>
                          <span className="text-xs text-muted-foreground">from ₦{c.ngn.toLocaleString()}/mo</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Show current selection when not searching */}
              {countrySearch === "" && (
                <div className="flex flex-wrap gap-1.5">
                  {/* Quick-pick popular countries */}
                  {["US","GB","CA","AU","DE","NG"].map((code) => {
                    const c = NUMBER_COUNTRIES.find((x) => x.code === code);
                    if (!c) return null;
                    return (
                      <button
                        key={code}
                        onClick={() => { setCountry(code); setResults([]); }}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${country === code ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}
                      >
                        {c.flag} {c.code}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCountrySearch(" ")}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40"
                  >
                    <ChevronDown className="size-3" /> more
                  </button>
                </div>
              )}
            </div>

            <Button className="w-full" variant="outline" onClick={search} disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {searching
                ? "Searching…"
                : `Search numbers in ${selectedCountry.flag} ${selectedCountry.name} — from ~₦${fromNgn.toLocaleString()}/mo`}
            </Button>

            {results.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                <p className="text-xs text-muted-foreground">{results.length} numbers found</p>
                {results.map((n) => (
                  <button
                    key={n.phoneNumber}
                    onClick={() => selectNumber(n)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-accent"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">{n.phoneNumber}</p>
                      {(n.locality || n.region) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {[n.locality, n.region].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        ₦{Math.round((n.monthlyCostUsd ?? selectedCountry.usd) * fxRate).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~${(n.monthlyCostUsd ?? selectedCountry.usd).toFixed(2)}/mo
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 && !searching && (
              <p className="text-center text-xs text-muted-foreground">
                Search to see numbers available in {selectedCountry.flag} {selectedCountry.name}
              </p>
            )}
          </div>
        )}

        {/* ── STEP: Pay (Telnyx) ── */}
        {step === "pay" && selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="font-mono text-base font-bold">{selected.phoneNumber}</p>
                {(selected.locality || selected.region) && (
                  <p className="text-xs text-muted-foreground">{[selected.locality, selected.region].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">₦{ngnPrice.toLocaleString()}/mo</p>
                <p className="text-xs text-muted-foreground">~${usdPrice}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-primary" /> Wallet balance
              </div>
              <span className="font-mono font-bold">
                {balance === null ? "…" : `₦${balance.toLocaleString()}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPayMethod("wallet")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${payMethod === "wallet" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                <Wallet className="size-4" /> Wallet
              </button>
              <button
                onClick={() => setPayMethod("card")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${payMethod === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                <CreditCard className="size-4" /> Card
              </button>
            </div>

            {payMethod === "wallet" && !hasEnough && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Wallet needs ₦{ngnPrice.toLocaleString()} — top up first
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TOP_UP_PRESETS.map((p) => (
                    <button key={p} onClick={() => setTopUpAmount(p)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${topUpAmount === p ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                    >
                      ₦{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">~${usdEquiv} USD at current rate</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => topUp("paystack")} disabled={toppingUp}>
                    {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Paystack (₦)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => topUp("stripe")} disabled={toppingUp}>
                    {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Card (USD)
                  </Button>
                </div>
              </div>
            )}

            {payMethod === "card" && (
              <Select value={cardProvider} onValueChange={(v) => setCardProvider(v as "stripe" | "paystack")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paystack">Paystack — ₦{ngnPrice.toLocaleString()}/mo</SelectItem>
                  <SelectItem value="stripe">Card (USD) — ~${usdPrice}/mo</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* hCaptcha — shown only when site key is configured */}
            {HCAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  size="compact"
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <Button
              variant="hero"
              className="w-full"
              disabled={buying || (payMethod === "wallet" && !hasEnough) || (!!HCAPTCHA_SITE_KEY && !captchaToken)}
              onClick={payMethod === "wallet" ? buyFromWallet : buyWithCard}
            >
              {buying ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
              {buying ? "Activating…" :
               payMethod === "wallet" ? `Pay ₦${ngnPrice.toLocaleString()} from wallet` :
               cardProvider === "paystack" ? `Pay ₦${ngnPrice.toLocaleString()} via Paystack` :
               `Pay ~$${usdPrice} via card`}
            </Button>
          </div>
        )}

        {/* ── STEP: Temp (SMSPool) — select country/service ── */}
        {step === "temp" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-900/30 dark:bg-amber-900/10">
              <p className="font-medium text-amber-800 dark:text-amber-400">
                One-time use · Expires in 20 minutes
              </p>
              <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-500">
                Perfect for WhatsApp, Telegram, Instagram, or any verification code.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Country
                {loadingSMS && <Loader2 className="size-3 animate-spin" />}
              </label>
              <Select value={tempCountry} onValueChange={setTempCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {smsCountries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Service</label>
              <Select value={tempService} onValueChange={setTempService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {smsServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-primary" /> Wallet balance
              </div>
              <span className="font-mono font-bold">
                {balance === null ? "…" : `₦${balance.toLocaleString()}`}
              </span>
            </div>

            {!hasTempBalance && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Need ₦{SMSPOOL_APPROX_PRICE_NGN} — top up wallet first
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => topUp("paystack")} disabled={toppingUp}>
                    {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Paystack (₦)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => topUp("stripe")} disabled={toppingUp}>
                    {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Card (USD)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center text-xs text-muted-foreground">
              <span>Cost: ₦{SMSPOOL_APPROX_PRICE_NGN} (~${tempUsdPrice})</span>
            </div>

            {HCAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  size="compact"
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <Button
              variant="hero"
              className="w-full"
              disabled={tempBuying || !hasTempBalance || (!!HCAPTCHA_SITE_KEY && !captchaToken)}
              onClick={buyTemp}
            >
              {tempBuying ? (
                <><Loader2 className="size-4 animate-spin" /> Getting number…</>
              ) : (
                <><Zap className="size-4" /> Get temp number — ₦{SMSPOOL_APPROX_PRICE_NGN}</>
              )}
            </Button>
          </div>
        )}

        {/* ── STEP: SMSPool rental (multi-day) ── */}
        {step === "rental-smspool" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <p className="font-medium text-emerald-800 dark:text-emerald-400">
                Short-term rental via SMSPool
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-500">
                Cheaper than Telnyx for short use. Ideal for 1–30 day campaigns.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Country
                {loadingSMS && <Loader2 className="size-3 animate-spin" />}
              </label>
              <Select value={tempCountry} onValueChange={setTempCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {smsCountries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Service</label>
              <Select value={tempService} onValueChange={setTempService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {smsServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Duration: <span className="font-bold text-foreground">{smsPoolDays} day{smsPoolDays !== 1 ? "s" : ""}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={smsPoolDays}
                onChange={(e) => setSmsPoolDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-primary" /> Wallet balance
              </div>
              <span className="font-mono font-bold">
                {balance === null ? "…" : `₦${balance.toLocaleString()}`}
              </span>
            </div>

            <div className="flex items-center text-xs text-muted-foreground">
              <span>
                Est. cost: ₦{Math.round(smsPoolDays * 1.0 * fxRate).toLocaleString()}
                {" "}(~${(smsPoolDays * 1.0).toFixed(2)})
              </span>
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={rentalBuying || balance === null || balance < Math.round(smsPoolDays * 1.0 * fxRate)}
              onClick={buyRentalPool}
            >
              {rentalBuying ? (
                <><Loader2 className="size-4 animate-spin" /> Renting…</>
              ) : (
                <><Clock className="size-4" /> Rent for {smsPoolDays} day{smsPoolDays !== 1 ? "s" : ""} — ₦{Math.round(smsPoolDays * 1.0 * fxRate).toLocaleString()}</>
              )}
            </Button>
          </div>
        )}

        {/* ── STEP: Temp Wait — live polling for SMS ── */}
        {step === "temp-wait" && tempResult && (
          <div className="space-y-4">
            {/* Number display */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground">Your temp number</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{tempResult.phoneNumber}</p>
              <div className="mt-3 flex justify-center">
                <CopyButton text={tempResult.phoneNumber} label="Copy number" />
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className={`size-4 ${timeLeft < 60 ? "text-destructive" : timeLeft < 300 ? "text-amber-500" : "text-primary"}`} />
                Expires in
              </div>
              <span className={`font-mono text-sm font-bold ${timeLeft < 60 ? "text-destructive" : timeLeft < 300 ? "text-amber-500" : "text-foreground"}`}>
                {formatCountdown(timeLeft)}
              </span>
            </div>

            {/* SMS status — waiting */}
            {!tempSms && !tempExpired && (
              <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-5">
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Waiting for SMS…</p>
                  <p className="text-xs text-muted-foreground">
                    Send a verification to {tempResult.phoneNumber} — it will appear here automatically.
                  </p>
                </div>
              </div>
            )}

            {/* SMS status — expired without SMS */}
            {tempExpired && !tempSms && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm font-medium text-destructive">Number expired — no SMS received</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The number was released. Try again with a different country or service.
                </p>
              </div>
            )}

            {/* SMS status — received! */}
            {tempSms && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">SMS received!</p>
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{tempSms}</p>
                </div>

                {otp && (
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">OTP detected</p>
                      <p className="font-mono text-2xl font-bold tracking-widest text-primary">{otp}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(otp); toast.success("OTP copied!"); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      <Copy className="size-3" /> Copy OTP
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Full SMS history in inbox note */}
            <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5 shrink-0" />
              All received SMS are saved in your inbox under the Numbers page.
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(tempExpired && !tempSms) && (
                <Button variant="outline" className="col-span-2" onClick={autoRetry}>
                  <Zap className="size-4" /> Try again with new number
                </Button>
              )}
              <Button
                variant={tempSms ? "hero" : "outline"}
                className={tempExpired && !tempSms ? "col-span-1" : "col-span-2"}
                onClick={() => onOpenChange(false)}
              >
                {tempSms ? "Done" : "Close — check inbox later"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
