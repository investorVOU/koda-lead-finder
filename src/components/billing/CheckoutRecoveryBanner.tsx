import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCheckout } from "@/lib/billing.functions";
import { getPendingCheckout } from "@/lib/checkout-recovery.functions";
import { formatNgn } from "@/lib/billing";
import { trackCheckoutStarted } from "@/lib/analytics";

type PendingCheckout = {
  kind: "subscription" | "pack";
  planId: string;
  cycle: "monthly" | "annually";
  renewalMode: "manual" | "auto";
  amount: number;
  currency: string;
};

/** Gives a returning signed-in user one clear way to resume an unfinished payment. */
export function CheckoutRecoveryBanner() {
  const loadPendingCheckout = useServerFn(getPendingCheckout);
  const runCheckout = useServerFn(createCheckout);
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPendingCheckout()
      .then((result) => {
        if (active) setPending(result as PendingCheckout | null);
      })
      .catch(() => {
        // Recovery UI is optional and must never interrupt the dashboard.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadPendingCheckout]);

  const resume = async () => {
    if (!pending || busy) return;
    setBusy(true);
    const response = await runCheckout({
      data: {
        kind: pending.kind,
        id: pending.planId,
        cycle: pending.kind === "subscription" ? pending.cycle : undefined,
        renewalMode: pending.kind === "subscription" ? pending.renewalMode : undefined,
        origin: window.location.origin,
      },
    });
    if ("error" in response || !response.url) {
      toast.error("error" in response ? response.message : "Could not start checkout.");
      setBusy(false);
      return;
    }
    trackCheckoutStarted({ plan: pending.planId, currency: pending.currency, value: pending.amount });
    window.location.href = response.url;
  };

  if (loading || !pending) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">Your setup is almost ready</p>
        <p className="mt-0.5 text-muted-foreground">
          You started a secure Paystack checkout for {formatNgn(pending.amount)}. Complete it when you&apos;re ready.
        </p>
      </div>
      <Button variant="hero" className="shrink-0" disabled={busy} onClick={resume}>
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
        Continue payment
      </Button>
    </div>
  );
}
