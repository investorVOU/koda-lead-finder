import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, ChevronDown, Loader2, Plus } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { initiateWalletTopUp } from "@/lib/wallet.functions";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

interface Props {
  balance: number | null;
  fxRate?: number;
}

const PRESETS = [1000, 2500, 5000, 10000];

export function WalletWidget({ balance, fxRate = 1600 }: Props) {
  const runTopUp = useServerFn(initiateWalletTopUp);

  const [open,         setOpen]         = useState(false);
  const [preset,       setPreset]       = useState<number | null>(5000);
  const [customVal,    setCustomVal]    = useState("");
  const [toppingUp,    setToppingUp]    = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Final amount: custom input takes priority over preset when non-empty
  const finalAmount = customVal.trim()
    ? parseInt(customVal.replace(/[^0-9]/g, ""), 10) || 0
    : (preset ?? 0);

  const isValid   = finalAmount >= 500 && finalAmount <= 500_000;
  const usdEquiv  = finalAmount > 0 ? (finalAmount / fxRate).toFixed(2) : "0.00";
  const captchaOk = !HCAPTCHA_SITE_KEY || !!captchaToken;

  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  const topUp = async (provider: "stripe" | "paystack") => {
    if (!isValid) {
      toast.error("Enter an amount between ₦500 and ₦500,000");
      return;
    }
    if (!captchaOk) {
      toast.error("Please complete the security check first");
      return;
    }
    setToppingUp(true);
    const res = await runTopUp({
      data: {
        amountNgn:    finalAmount,
        provider,
        captchaToken: captchaToken ?? undefined,
      },
    });
    setToppingUp(false);
    resetCaptcha();
    if ("error" in res) { toast.error(res.message); return; }
    if ("url" in res) window.location.href = res.url;
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm hover:bg-accent"
      >
        <Wallet className="size-4 text-primary" />
        <span className="font-mono font-bold">
          {balance === null ? "…" : `₦${balance.toLocaleString()}`}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">· Top up</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Current balance</p>
            <p className="mt-0.5 font-mono text-2xl font-bold">
              {balance === null ? "…" : `₦${balance.toLocaleString()}`}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Top up amount</p>

            {/* Preset chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setCustomVal(""); }}
                  className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                    preset === p && !customVal
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  ₦{p >= 1000 ? `${p / 1000}k` : p}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                ₦
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Custom amount…"
                value={customVal}
                onChange={(e) => {
                  setCustomVal(e.target.value);
                  setPreset(null);
                }}
                className="w-full rounded-xl border border-border bg-background py-2 pl-7 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* USD equivalent */}
            {finalAmount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                ≈ ${usdEquiv} USD at current rate
                {!isValid && finalAmount > 0 && (
                  <span className="ml-1 text-destructive">
                    {finalAmount < 500 ? "(min ₦500)" : "(max ₦500,000)"}
                  </span>
                )}
              </p>
            )}
          </div>

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

          {/* Pay buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => topUp("paystack")}
              disabled={toppingUp || !isValid || !captchaOk}
            >
              {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Paystack (₦)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => topUp("stripe")}
              disabled={toppingUp || !isValid || !captchaOk}
            >
              {toppingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Card (USD)
            </Button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground">
            🔒 Secured by Stripe &amp; Paystack
          </p>
        </div>
      )}
    </div>
  );
}
