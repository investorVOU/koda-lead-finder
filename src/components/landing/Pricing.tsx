import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Cycle = "monthly" | "annual";

const plans = [
  {
    name: "Free Trial",
    tagline: "Try it risk-free",
    monthly: 0,
    annual: 0,
    naira: "₦0",
    cta: "Start free trial",
    variant: "outline" as const,
    features: ["7-day trial", "20 searches", "AI website prompts", "Cold call scripts"],
  },
  {
    name: "Pro",
    tagline: "For active freelancers",
    monthly: 29,
    annual: 23,
    naira: "₦45,000",
    cta: "Get Pro",
    variant: "hero" as const,
    highlight: true,
    features: [
      "200 searches / month",
      "Unlimited AI prompts",
      "Cold call scripts",
      "Lead pipeline & notes",
      "Save & export leads",
    ],
  },
  {
    name: "Max",
    tagline: "For agencies & power users",
    monthly: 59,
    annual: 47,
    naira: "₦90,000",
    cta: "Get Max",
    variant: "outline" as const,
    features: [
      "500 searches / month",
      "Everything in Pro",
      "Priority features",
      "Bulk lead export",
      "Priority support",
    ],
  },
];

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <section id="pricing" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Simple, global pricing</h2>
          <p className="mt-4 text-muted-foreground">
            Pay in USD with Stripe or in Naira with Paystack. Cancel anytime.
          </p>

          <div className="mt-7 inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                cycle === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Annual <span className="text-xs opacity-80">–20%</span>
            </button>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {plans.map((p) => {
            const price = cycle === "monthly" ? p.monthly : p.annual;
            return (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-card p-7 ${
                  p.highlight
                    ? "border-primary shadow-[var(--shadow-lg)] lg:-translate-y-3"
                    : "border-border"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>

                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold">${price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.monthly === 0 ? "Free for 7 days" : `${p.naira} / month in Naira`}
                </p>

                <Button variant={p.variant} size="lg" className="mt-6 w-full">
                  {p.cta}
                </Button>

                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
