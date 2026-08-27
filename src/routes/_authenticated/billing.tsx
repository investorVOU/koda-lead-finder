import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, ReceiptText, CreditCard, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { PLANS, PACKS, PLAN_LABELS, formatNgn } from "@/lib/billing";
import { createCheckout, cancelSubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing & Plans — Kodarai" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const { data: sub } = useSubscription(user?.id);
  const queryClient = useQueryClient();

  const runCheckout = useServerFn(createCheckout);
  const runCancel = useServerFn(cancelSubscription);

  const [busy, setBusy] = useState<string | null>(null);

  // Toast + refresh after returning from a provider checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      toast.success("Payment received — your leads will appear in a moment.");
      if (user) {
        // Webhook fulfillment is near-instant; refetch a couple of times.
        const refetch = () => queryClient.invalidateQueries();
        refetch();
        const t = setTimeout(refetch, 2500);
        window.history.replaceState({}, "", "/billing");
        return () => clearTimeout(t);
      }
    } else if (status === "cancel") {
      toast.info("Checkout canceled.");
      window.history.replaceState({}, "", "/billing");
    }
  }, [queryClient, user]);

  const checkout = async (
    kind: "subscription" | "pack",
    id: string,
    key: string,
  ) => {
    setBusy(key);
    const res = await runCheckout({
      data: { provider: "paystack", kind, id, origin: window.location.origin },
    });
    if ("error" in res) {
      toast.error(res.message);
      setBusy(null);
      return;
    }
    window.location.href = res.url!;
  };

  const isActive = sub?.status === "active" || sub?.status === "canceling";

  const cancel = async () => {
    setBusy("cancel");
    const res = await runCancel();
    setBusy(null);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    toast.success("Subscription will end at the close of your billing period.");
    queryClient.invalidateQueries();
  };

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing & Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe for monthly leads, or buy a one-time lead pack — pay via Paystack.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/invoices">
            <ReceiptText className="size-4" /> Invoices & history
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <CreditMeter />
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 font-display text-xl font-bold">{PLAN_LABELS[sub?.plan ?? "none"]}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              Status: {sub?.status ?? "inactive"}
            </p>
            {isActive && sub?.status !== "canceling" && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={cancel}
                  disabled={busy !== null}
                >
                  {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Cancel subscription
                </Button>
              </div>
            )}
            {sub?.status === "canceling" && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Ends on {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "period end"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-10">
          {/* Subscriptions */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="size-5 text-primary" /> Monthly plans
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {PLANS.map((p) => {
                const current = sub?.plan === p.id && isActive;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-2xl border bg-card p-6 ${
                      p.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      {current && (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="font-display text-3xl font-bold">{formatNgn(p.ngn)}</span>
                      <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.credits} leads / month
                    </p>

                    <ul className="mt-4 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      <Button
                        variant={p.highlight ? "hero" : "outline"}
                        className="w-full"
                        disabled={current || busy !== null}
                        onClick={() => checkout("subscription", p.id, p.id + "paystack")}
                      >
                        {busy === p.id + "paystack" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          `Subscribe · ${formatNgn(p.ngn)}`
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Credit packs */}
          <section>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Zap className="size-5 text-primary" /> One-time lead packs
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              No subscription. Top-up leads never expire — perfect to test the waters.
            </p>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {PACKS.map((p) => (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-2xl border bg-card p-6 ${
                    p.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                  }`}
                >
                  {p.highlight && (
                    <span className="mb-2 w-fit rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Best value
                    </span>
                  )}
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-display text-2xl font-bold">{formatNgn(p.ngn)}</span>
                    <span className="mb-0.5 text-sm text-muted-foreground">= {p.credits} leads</span>
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="hero"
                      className="w-full"
                      disabled={busy !== null}
                      onClick={() => checkout("pack", p.id, p.id + "paystack")}
                    >
                      {busy === p.id + "paystack" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        `Buy · ${formatNgn(p.ngn)}`
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </DashboardShell>
  );
}
