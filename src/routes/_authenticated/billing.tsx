import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, ReceiptText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { PLAN_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — KodaRai" }] }),
  component: BillingPage,
});

type Cycle = "monthly" | "annual";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    monthly: 29,
    annual: 23,
    naira: "₦45,000",
    credits: "200 searches / month",
    features: ["Unlimited AI prompts", "Cold call scripts", "Lead pipeline", "Save & export"],
  },
  {
    id: "max",
    name: "Max",
    monthly: 59,
    annual: 47,
    naira: "₦90,000",
    credits: "500 searches / month",
    features: ["Everything in Pro", "Priority features", "Bulk export", "Priority support"],
    highlight: true,
  },
];

function BillingPage() {
  const { user } = useAuth();
  const { data: sub } = useSubscription(user?.id);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (planId: string, provider: "stripe" | "paystack") => {
    setBusy(planId + provider);
    // Checkout wiring (Stripe / Paystack) is connected in the next step.
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    toast.info("Payment checkout is being set up — coming next.");
  };

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, credits, and invoices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <CreditMeter />
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 font-display text-xl font-bold">{PLAN_LABELS[sub?.plan ?? "trial"]}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">Status: {sub?.status ?? "trialing"}</p>
          </div>
        </div>

        <div>
          <div className="mb-5 inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${cycle === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Annual <span className="text-xs opacity-80">–20%</span>
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {PLANS.map((p) => {
              const price = cycle === "monthly" ? p.monthly : p.annual;
              const current = sub?.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-card p-6 ${p.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {current && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="font-display text-3xl font-bold">${price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.naira} / month · {p.credits}</p>

                  <ul className="mt-4 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 space-y-2">
                    <Button
                      variant="hero"
                      className="w-full"
                      disabled={current || busy !== null}
                      onClick={() => checkout(p.id, "stripe")}
                    >
                      {busy === p.id + "stripe" ? <Loader2 className="size-4 animate-spin" /> : "Pay with Card (Stripe)"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={current || busy !== null}
                      onClick={() => checkout(p.id, "paystack")}
                    >
                      {busy === p.id + "paystack" ? <Loader2 className="size-4 animate-spin" /> : "Pay with Paystack (₦)"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-5 text-muted-foreground" />
              <h3 className="font-semibold">Invoices & history</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your invoices will appear here once you subscribe to a paid plan.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
