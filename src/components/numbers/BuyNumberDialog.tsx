import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Phone, Search, Wallet, CreditCard, Plus, ArrowLeft, MapPin,
  Clock, Zap,
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
} from "@/lib/numbers.functions";
import { getWalletData, initiateWalletTopUp } from "@/lib/wallet.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AvailableNumber = { phoneNumber: string; friendlyName: string; region?: string; locality?: string; monthlyCostUsd?: number };
type Step = "type" | "search" | "pay" | "temp";
type NumberType = "persistent" | "temp";

const TOP_UP_PRESETS = [1000, 2500, 5000, 10000];

const SMSPOOL_COUNTRIES = [
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
];

const SMSPOOL_SERVICES = [
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

export function BuyNumberDialog({ open, onOpenChange }: Props) {
  const runSearch    = useServerFn(searchAvailableNumbers);
  const runWalletBuy = useServerFn(buyNumberFromWallet);
  const runCardBuy   = useServerFn(initiateNumberPurchase);
  const runGetWallet = useServerFn(getWalletData);
  const runTopUp     = useServerFn(initiateWalletTopUp);
  const runTempBuy   = useServerFn(requestTempNumber);

  const [step,         setStep]         = useState<Step>("type");
  const [numType,      setNumType]      = useState<NumberType>("persistent");

  // Persistent (Telnyx) state
  const [country,      setCountry]      = useState("US");
  const [searching,    setSearching]    = useState(false);
  const [results,      setResults]      = useState<AvailableNumber[]>([]);
  const [selected,     setSelected]     = useState<AvailableNumber | null>(null);
  const [payMethod,    setPayMethod]    = useState<"wallet" | "card">("wallet");
  const [cardProvider, setCardProvider] = useState<"stripe" | "paystack">("stripe");
  const [buying,       setBuying]       = useState(false);

  // SMSPool temp state
  const [tempCountry,  setTempCountry]  = useState("US");
  const [tempService,  setTempService]  = useState("any");
  const [tempBuying,   setTempBuying]   = useState(false);

  // Wallet
  const [toppingUp,    setToppingUp]    = useState(false);
  const [topUpAmount,  setTopUpAmount]  = useState(5000);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [fxRate,       setFxRate]       = useState(1600);

  const selectedCountry = NUMBER_COUNTRIES.find((c) => c.code === country)!;

  useEffect(() => {
    if (!open) {
      setStep("type"); setResults([]); setSelected(null);
      return;
    }
    runGetWallet().then((res) => { setBalance(res.balance); setFxRate(res.fxRate); });
  }, [open]);

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
    const res = await runWalletBuy({ data: { phoneNumber: selected.phoneNumber, country } });
    setBuying(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number activated! It will appear in your list.");
    setBalance((b) => b !== null ? b - selectedCountry.ngn : b);
    onOpenChange(false);
  };

  const buyWithCard = async () => {
    if (!selected) return;
    setBuying(true);
    const res = await runCardBuy({
      data: { phoneNumber: selected.phoneNumber, country, provider: cardProvider, origin: window.location.origin },
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
    toast.success(`Temp number ready: ${"phoneNumber" in res ? res.phoneNumber : ""} — SMS will appear in your inbox!`);
    setBalance((b) => b !== null ? b - SMSPOOL_APPROX_PRICE_NGN : b);
    onOpenChange(false);
  };

  const topUp = async (provider: "stripe" | "paystack") => {
    setToppingUp(true);
    const res = await runTopUp({ data: { amountNgn: topUpAmount, provider, origin: window.location.origin } });
    setToppingUp(false);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  const hasEnough        = balance !== null && balance >= selectedCountry.ngn;
  const hasTempBalance   = balance !== null && balance >= SMSPOOL_APPROX_PRICE_NGN;
  const usdEquiv         = (topUpAmount / fxRate).toFixed(2);
  const usdPrice         = (selectedCountry.ngn / fxRate).toFixed(2);
  const tempUsdPrice     = SMSPOOL_APPROX_PRICE_USD.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {(step === "pay" || (step === "temp" && numType === "temp")) && (
            <button
              onClick={() => setStep(step === "pay" ? "search" : "type")}
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Back
            </button>
          )}
          <DialogTitle>
            {step === "type"   ? "Get a virtual number" :
             step === "search" ? "Find a persistent number" :
             step === "pay"    ? "Complete your purchase" :
                                 "Get a temp OTP number"}
          </DialogTitle>
          <DialogDescription>
            {step === "type"   ? "Choose between a monthly rental or a one-time OTP number." :
             step === "search" ? "Monthly rental via Telnyx — receive unlimited SMS." :
             step === "pay"    ? `Activate ${selected?.phoneNumber} — ₦${selectedCountry.ngn.toLocaleString()}/month` :
                                 "One-time use. Expires after 20 min or first SMS received."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP: Type selector ── */}
        {step === "type" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => { setNumType("persistent"); setStep("search"); }}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Persistent Number</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Monthly rental. Keep receiving SMS indefinitely.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-xs font-bold text-primary">
                <Clock className="size-3" /> from ₦1,500/month
              </div>
            </button>

            <button
              onClick={() => { setNumType("temp"); setStep("temp"); }}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Zap className="size-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold">Temp / OTP Number</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Single use. Expires after 20 min or first SMS.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <Zap className="size-3" /> ~₦{SMSPOOL_APPROX_PRICE_NGN} / use
              </div>
            </button>
          </div>
        )}

        {/* ── STEP: Search (Telnyx persistent) ── */}
        {step === "search" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <Select value={country} onValueChange={(v) => { setCountry(v); setResults([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NUMBER_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" variant="outline" onClick={search} disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {searching ? "Searching…" : `Search numbers in ${selectedCountry.flag} ${selectedCountry.name}`}
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
                      <p className="text-sm font-bold text-primary">₦{selectedCountry.ngn.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">~${usdPrice}/mo</p>
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
                <p className="font-bold text-primary">₦{selectedCountry.ngn.toLocaleString()}/mo</p>
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
                  Wallet needs ₦{selectedCountry.ngn.toLocaleString()} — top up first
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
                  <SelectItem value="paystack">Paystack — ₦{selectedCountry.ngn.toLocaleString()}/mo</SelectItem>
                  <SelectItem value="stripe">Card (USD) — ~${usdPrice}/mo</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant="hero"
              className="w-full"
              disabled={buying || (payMethod === "wallet" && !hasEnough)}
              onClick={payMethod === "wallet" ? buyFromWallet : buyWithCard}
            >
              {buying ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
              {buying ? "Activating…" :
               payMethod === "wallet" ? `Pay ₦${selectedCountry.ngn.toLocaleString()} from wallet` :
               cardProvider === "paystack" ? `Pay ₦${selectedCountry.ngn.toLocaleString()} via Paystack` :
               `Pay ~$${usdPrice} via card`}
            </Button>
          </div>
        )}

        {/* ── STEP: Temp (SMSPool) ── */}
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
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <Select value={tempCountry} onValueChange={setTempCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMSPOOL_COUNTRIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Service</label>
              <Select value={tempService} onValueChange={setTempService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMSPOOL_SERVICES.map((s) => (
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

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cost: ₦{SMSPOOL_APPROX_PRICE_NGN} (~${tempUsdPrice})</span>
              <span>via SMSPool</span>
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={tempBuying || !hasTempBalance}
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
      </DialogContent>
    </Dialog>
  );
}
