import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { initiateWalletTopUp } from "@/lib/wallet.functions";

interface Props {
  balance: number | null;
  fxRate?: number;
}

const PRESETS = [500, 1000, 2500, 5000, 10000];

export function WalletWidget({ balance, fxRate = 1600 }: Props) {
  const runTopUp = useServerFn(initiateWalletTopUp);

  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | null>(1000);
  const [customVal, setCustomVal] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const finalAmount = customVal.trim()
    ? parseInt(customVal.replace(/[^0-9]/g, ""), 10) || 0
    : (preset ?? 0);

  const isValid = finalAmount >= 500 && finalAmount <= 500_000;

  const usdEquiv = finalAmount > 0 ? (finalAmount / fxRate).toFixed(2) : "0.00";

  const topUp = async () => {
    if (!isValid) {
      toast.error("Enter an amount between NGN 500 and NGN 500,000");
      return;
    }

    try {
      setToppingUp(true);

      const res = await runTopUp({
        data: {
          amountNgn: finalAmount,
          provider: "paystack",
        },
      });

      if ("error" in res) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      if ("url" in res) {
        window.location.href = res.url;
      }
    } catch {
      toast.error("Unable to start payment. Please try again.");
    } finally {
      setToppingUp(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-accent sm:px-4"
      >
        <Wallet className="size-4 shrink-0 text-primary" />

        <span className="min-w-0 truncate font-mono font-bold">
          {balance === null ? "..." : `NGN ${balance.toLocaleString()}`}
        </span>

        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">· Top up</span>

        <ChevronDown
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="
            fixed
            left-3
            right-3
            top-20
            z-50
            max-h-[calc(100dvh-6rem)]
            overflow-y-auto
            rounded-2xl
            border
            border-border
            bg-card
            p-4
            shadow-2xl

            sm:absolute
            sm:left-auto
            sm:right-0
            sm:top-full
            sm:mt-2
            sm:w-72
            sm:max-h-none
            sm:overflow-visible
          "
        >
          <div className="space-y-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Current balance</p>

              <p className="mt-0.5 break-words font-mono text-2xl font-bold">
                {balance === null ? "..." : `NGN ${balance.toLocaleString()}`}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Top up amount</p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setPreset(amount);
                      setCustomVal("");
                    }}
                    className={`min-w-0 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      preset === amount && !customVal
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    NGN {amount >= 1000 ? `${amount / 1000}k` : amount}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  NGN
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Custom amount"
                  value={customVal}
                  onChange={(event) => {
                    setCustomVal(event.target.value);
                    setPreset(null);
                  }}
                  className="w-full min-w-0 rounded-xl border border-border bg-background py-2 pl-12 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {finalAmount > 0 && (
                <p className="break-words text-[11px] text-muted-foreground">
                  Approx. ${usdEquiv} USD at current rate
                  {!isValid && (
                    <span className="ml-1 text-destructive">
                      {finalAmount < 500 ? "(minimum NGN 500)" : "(maximum NGN 500,000)"}
                    </span>
                  )}
                </p>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={topUp}
              disabled={toppingUp || !isValid}
            >
              {toppingUp ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Pay
            </Button>

            <p className="text-center text-[10px] text-muted-foreground">
              Secure payment powered by Paystack
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
