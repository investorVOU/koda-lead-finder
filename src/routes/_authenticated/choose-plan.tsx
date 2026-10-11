import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { SupportChat } from "@/components/support/SupportChat";
import { WelcomeEmailSync } from "@/components/auth/WelcomeEmailSync";
import { PlanActivationEnrollmentSync } from "@/components/marketing/PlanActivationEnrollmentSync";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCheckout } from "@/lib/billing.functions";
import { PLANS, formatNgn } from "@/lib/billing";
import { trackPlanSkipped } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({ meta: [{ title: "Start building & earning — Kodarai" }] }),
  component: ChoosePlanPage,
});

function ChoosePlanPage() {
  const runCheckout = useServerFn(createCheckout);
  const [busy, setBusy] = useState(false);
  const [exampleLeadOpen, setExampleLeadOpen] = useState(false);

  const starterPlan = PLANS.find((plan) => plan.id === "starter");
  const starterPrice = formatNgn(starterPlan?.ngn ?? 1000);

  const handleStarterCheckout = async () => {
    if (!starterPlan) return;

    setBusy(true);

    const response = await runCheckout({
      data: {
        kind: "subscription",
        id: starterPlan.id,
        cycle: "monthly",
        renewalMode: "manual",
        origin: window.location.origin,
      },
    });

    if ("error" in response) {
      toast.error(response.message);
      setBusy(false);
      return;
    }

    window.location.href = response.url!;
  };

  const showExampleLead = (position: "top" | "bottom") => {
    trackPlanSkipped(position);
    setExampleLeadOpen(true);
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-hero)] px-4 py-10 sm:py-12">
      <WelcomeEmailSync />
      <PlanActivationEnrollmentSync />

      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5 rounded-full px-5 font-semibold"
            onClick={() => showExampleLead("top")}
          >
            See an example lead
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            Starter plan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Start Building. Start Earning.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Kodarai helps you build websites, digital products, and other client-ready solutions for
            businesses so you can deliver work and get paid.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-primary/20 bg-card p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Starter
              </p>
              <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {starterPrice}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              30-day access
            </div>
          </div>

          <p className="mt-4 text-base text-muted-foreground">
            Your {starterPrice} starter plan includes the tools to find business opportunities, generate client
            work, and manage your pipeline.
          </p>

          <ul className="mt-5 space-y-3">
            {[
              "60 lead searches each month",
              "50 Studio credits each month",
              "Kodarai Studio & Website Builder",
              "AI website scripts and cold-call scripts",
              "Save leads and manage your pipeline",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-foreground/90">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            variant="hero"
            size="lg"
            className="mt-6 w-full"
            onClick={handleStarterCheckout}
            disabled={busy}
          >
            {busy ? "Preparing checkout..." : `Pay ${starterPrice} & Start Earning`}
            {!busy && <ArrowRight className="ml-2 size-4" />}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            One-time payment, no automatic renewal. Pay securely with the available Paystack payment methods.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <p className="font-semibold">What does {starterPrice} get me?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Access to Kodarai’s lead finder, Studio builder, and the tools you need to create work
              you can sell to local businesses.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <p className="font-semibold">Is this a get-rich plan?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No. It’s a practical toolkit for finding clients, building solutions, and delivering work
              professionally.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <p className="font-semibold">How does payment work?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You pay the real Starter plan through the existing Paystack checkout and start using
              Kodarai immediately.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="font-medium">Not ready yet?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            See the kind of business opportunity you can unlock first.
          </p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => showExampleLead("bottom")}
          >
            See an example lead first
          </Button>
        </div>
      </div>
      <Dialog open={exampleLeadOpen} onOpenChange={setExampleLeadOpen}>
        <DialogContent className="max-w-xl overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pr-8 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Example lead · illustrative
            </p>
            <DialogTitle className="text-2xl">Here&apos;s a business you could pitch</DialogTitle>
            <DialogDescription>
              Starter reveals real leads like this, then gives you the tools to create a sample website and pitch.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">Glow Hair Studio</p>
                <p className="mt-1 text-sm text-muted-foreground">Lekki, Lagos · Salon</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                No website found
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              4.8 rating · 126 reviews · A local business that could benefit from a simple booking website.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border bg-muted/35 p-3">
              <div>
                <p className="font-semibold">Contact details</p>
                <p className="text-sm text-muted-foreground">Phone and business profile</p>
              </div>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Unlock with Starter
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-muted/35 p-3">
              <div>
                <p className="font-semibold">Website sample</p>
                <p className="text-sm text-muted-foreground">Create a personalised website to show them</p>
              </div>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Unlock with Starter
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-muted/35 p-3">
              <div>
                <p className="font-semibold">WhatsApp pitch</p>
                <p className="text-sm text-muted-foreground">Generate a message to start the conversation</p>
              </div>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Unlock with Starter
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
            You choose who to contact, agree your price directly with the business, and deliver the work.
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleStarterCheckout}
            disabled={busy}
          >
            {busy ? "Preparing checkout..." : `Activate Starter for ${starterPrice}`}
            {!busy && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </DialogContent>
      </Dialog>
      <SupportChat />
    </div>
  );
}
