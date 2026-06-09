import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Phone, Search, Wallet, CreditCard, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { searchAvailableNumbers, buyNumberFromWallet, initiateNumberPurchase } from "@/lib/numbers.functions";
import { getWalletData, initiateWalletTopUp } from "@/lib/wallet.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AvailableNumber = { phoneNumber: string; friendlyName: string; region?: string; locality?: string };
type Tab = "wallet" | "card";

const TOP_UP_PRESETS = [1000, 2500, 5000, 10000];

export function BuyNumberDialog({ open, onOpenChange }: Props) {
  const runSearch      = useServerFn(searchAvailableNumbers);
  const runWalletBuy   = useServerFn(buyNumberFromWallet);
  const runCardBuy     = useServerFn(initiateNumberPurchase);
  const runGetWallet   = useServerFn(getWalletData);
  const runTopUp       = useServerFn(initiateWalletTopUp);

  const [country,      setCountry]      = useState("US");
  const [tab,          setTab]          = useState<Tab>("wallet");
  const [cardProvider, setCardProvider] = useState<"stripe" | "paystack">("stripe");
  const [searching,    setSearching]    = useState(false);
  const [buying,       setBuying]       = useState<string | null>(null);
  const [toppingUp,    setToppingUp]    = useState(false);
  const [results,      setResults]      = useState<AvailableNumber[]>([]);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [topUpAmount,  setTopUpAmount]  = useState(5000);
  const [fxRate,       setFxRate]       = useState(1600);

  const selectedCountry = NUMBER_COUNTRIES.find((c) => c.code === country)!;

  useEffect(() => {
    if (!open) return;
    runGetWallet().then((res) => {
      setBalance(res.balance);
      setFxRate(res.fxRate);
    });
  }, [open]);

  const search = async () => {
    setResults([]);
    setSearching(true);
    const res = await runSearch({ data: { country, type: "local" } });
    setSearching(false);
    if ("error" in res) { toast.error(res.message); return; }
    setResults(res.numbers);
  };

  const buyFromWallet = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    const res = await runWalletBuy({ data: { phoneNumber, country } });
    setBuying(null);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number activated!");
    setBalance((b) => b !== null ? b - selectedCountry.ngn : b);
    onOpenChange(false);
  };

  const buyWithCard = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    const res = await runCardBuy({
      data: { phoneNumber, country, provider: cardProvider, origin: window.location.origin },
    });
    setBuying(null);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  const topUp = async (provider: "stripe" | "paystack") => {
    setToppingUp(true);
    const res = await runTopUp({ data: { amountNgn: topUpAmount, provider, origin: window.location.origin } });
    setToppingUp(false);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  const hasEnough = balance !== null && balance >= selectedCountry.ngn;
  const usdEquiv  = (topUpAmount / fxRate).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Get a virtual number</DialogTitle>
          <DialogDescription>
            Pick a country and browse available numbers. Billed monthly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Wallet balance banner */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="size-4 text-primary" />
              <span className="font-medium">Wallet balance</span>
            </div>
            <span className="font-mono font-bold text-foreground">
              {balance === null ? "…" : `₦${balance.toLocaleString()}`}
            </span>
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name} — ₦{c.ngn.toLocaleString()}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment method tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTab("wallet")}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${tab === "wallet" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <Wallet className="size-4" /> Pay from wallet
            </button>
            <button
              onClick={() => setTab("card")}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${tab === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <CreditCard className="size-4" /> Pay with card
            </button>
          </div>

          {/* Wallet tab: top-up if insufficient */}
          {tab === "wallet" && !hasEnough && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Need ₦{selectedCountry.ngn.toLocaleString()} — top up your wallet first
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TOP_UP_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTopUpAmount(p)}
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

          {/* Card tab: provider select */}
          {tab === "card" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pay with</label>
              <Select value={cardProvider} onValueChange={(v) => setCardProvider(v as "stripe" | "paystack")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Card (USD ~${(selectedCountry.ngn / fxRate).toFixed(2)}/mo)</SelectItem>
                  <SelectItem value="paystack">Paystack (₦{selectedCountry.ngn.toLocaleString()}/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full" variant="outline" onClick={search} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {searching ? "Searching..." : "Search available numbers"}
          </Button>

          {results.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((n) => {
                const isBuying = buying === n.phoneNumber;
                return (
                  <div
                    key={n.phoneNumber}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">{n.phoneNumber}</p>
                      {(n.locality || n.region) && (
                        <p className="text-xs text-muted-foreground">
                          {[n.locality, n.region].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => tab === "wallet" ? buyFromWallet(n.phoneNumber) : buyWithCard(n.phoneNumber)}
                      disabled={!!buying || (tab === "wallet" && !hasEnough)}
                    >
                      {isBuying ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
                      {tab === "wallet"
                        ? `₦${selectedCountry.ngn.toLocaleString()}`
                        : cardProvider === "paystack"
                          ? `₦${selectedCountry.ngn.toLocaleString()}/mo`
                          : `$${selectedCountry.usd}/mo`}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {results.length === 0 && !searching && (
            <p className="text-center text-xs text-muted-foreground">
              Search to see available numbers in {selectedCountry.flag} {selectedCountry.name}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
