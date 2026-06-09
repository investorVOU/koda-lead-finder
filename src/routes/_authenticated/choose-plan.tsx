import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, FREE_PLAN } from "@/lib/billing";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({ meta: [{ title: "Choose your plan — Kodarai" }] }),
  component: ChoosePlanPage,
});

function ChoosePlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const activateFree = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("activate_free_trial");
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", user.id);
      if (profileError) {
        setBusy(false);
        toast.error(profileError.message);
        return;
      }
    }

    setBusy(false);
    navigate({ to: "/trial-welcome" });
  };

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
          <p className="mt-2 text-muted-foreground">Start free or unlock the full pipeline right away.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Free trial card */}
          <div className="flex flex-col rounded-2xl border-2 border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Free trial</p>
            <p className="mt-2 text-3xl font-bold">$0</p>
            <p className="mt-1 text-sm text-muted-foreground">{FREE_PLAN.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {FREE_PLAN.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-3.5 shrink-0 text-primary" /> {f}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-3.5 shrink-0 text-primary" /> 250 searches for 3 days
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-3.5 shrink-0 text-primary" /> Drops to free (0 searches) after
              </li>
            </ul>
            <Button
              className="mt-6 w-full"
              variant="outline"
              onClick={activateFree}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Start free trial"}
            </Button>
          </div>

          {/* Paid plans */}
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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Free trial gives you 250 searches for 3 days · no card required · upgrade anytime
        </p>
      </div>
    </div>
  );
}
