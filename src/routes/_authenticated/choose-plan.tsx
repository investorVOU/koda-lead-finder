import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing";
import { Logo } from "@/components/landing/Logo";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({ meta: [{ title: "Choose your plan — Kodarai" }] }),
  component: ChoosePlanPage,
});

function ChoosePlanPage() {
  const navigate = useNavigate();

  const goToBilling = () => navigate({ to: "/billing" });

  return (
    <div className="min-h-screen bg-[image:var(--gradient-hero)] px-4 py-12">
      <div className="mx-auto max-w-5xl">

        {/* Logo */}
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose your plan</h1>
          <p className="mt-2 text-muted-foreground">Unlock the full pipeline right away.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm ${
                plan.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
              }`}
            >
              {plan.highlight && (
                <span className="mb-2 inline-flex items-center gap-1 self-start rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Zap className="size-3" /> Most popular
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold">${plan.usd}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-3.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.highlight ? "hero" : "outline"}
                onClick={goToBilling}
              >
                Get {plan.name}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
