import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Phone, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { searchAvailableNumbers, initiateNumberPurchase } from "@/lib/numbers.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AvailableNumber = { phoneNumber: string; friendlyName: string; region?: string; locality?: string };

export function BuyNumberDialog({ open, onOpenChange }: Props) {
  const runSearch   = useServerFn(searchAvailableNumbers);
  const runPurchase = useServerFn(initiateNumberPurchase);

  const [country,   setCountry]   = useState("US");
  const [provider,  setProvider]  = useState<"stripe" | "paystack">("stripe");
  const [searching, setSearching] = useState(false);
  const [buying,    setBuying]    = useState<string | null>(null);
  const [results,   setResults]   = useState<AvailableNumber[]>([]);

  const selectedCountry = NUMBER_COUNTRIES.find((c) => c.code === country)!;

  const search = async () => {
    setResults([]);
    setSearching(true);
    const res = await runSearch({ data: { country, type: "local" } });
    setSearching(false);
    if ("error" in res) { toast.error(res.message); return; }
    setResults(res.numbers);
  };

  const buy = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    const res = await runPurchase({
      data: { phoneNumber, country, provider, origin: window.location.origin },
    });
    setBuying(null);
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) { window.location.href = res.url; }
  };

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
          {/* Country + payment method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pay with</label>
              <Select value={provider} onValueChange={(v) => setProvider(v as "stripe" | "paystack")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Card (USD ${selectedCountry.usd}/mo)</SelectItem>
                  <SelectItem value="paystack">Paystack (₦{selectedCountry.ngn.toLocaleString()}/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" variant="outline" onClick={search} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {searching ? "Searching..." : "Search available numbers"}
          </Button>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((n) => (
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
                    onClick={() => buy(n.phoneNumber)}
                    disabled={!!buying}
                  >
                    {buying === n.phoneNumber ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Phone className="size-3.5" />
                    )}
                    {provider === "paystack"
                      ? `₦${selectedCountry.ngn.toLocaleString()}/mo`
                      : `$${selectedCountry.usd}/mo`}
                  </Button>
                </div>
              ))}
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
