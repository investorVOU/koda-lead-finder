import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Check, Sparkles, Target, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { WelcomeEmailSync } from "@/components/auth/WelcomeEmailSync";
import { PlanActivationEnrollmentSync } from "@/components/marketing/PlanActivationEnrollmentSync";
import { createCheckout } from "@/lib/billing.functions";
import { PLANS, formatNgn } from "@/lib/billing";
import { trackPlanSkipped } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({ meta: [{ title: "Start building & earning — Kodarai" }] }),
  component: ChoosePlanPage,
});

function ChoosePlanPage() {
  const navigate = useNavigate();
  const runCheckout = useServerFn(createCheckout);
  const [busy, setBusy] = useState(false);

  const starterPlan = PLANS.find((plan) => plan.id === "starter");

  const handleStarterCheckout = async () => {
    if (!starterPlan) return;

    setBusy(true);

    const response = await runCheckout({
      data: {
        kind: "subscription",
        id: starterPlan.id,
        cycle: "monthly",
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

  return (
    <div className="min-h-screen bg-[image:var(--gradient-hero)] px-4 py-10 sm:py-12">
      <WelcomeEmailSync />
      <PlanActivationEnrollmentSync />

      <div className="mx-auto max-w-5xl">
        <div className="flex justify-center">
          <Logo />
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

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { icon: Target, title: "Find a client", text: "Identify businesses that need help." },
            { icon: Sparkles, title: "Build with Kodarai", text: "Create the site or product with AI." },
            { icon: Check, title: "Deliver", text: "Package the work for your client." },
            { icon: Wallet, title: "Get paid", text: "Turn your work into revenue." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <p className="mt-3 text-base font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-primary/20 bg-card p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Starter
              </p>
              <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {formatNgn(starterPlan?.ngn ?? 500)}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              Monthly access
            </div>
          </div>

          <p className="mt-4 text-base text-muted-foreground">
            Your ₦500 starter plan includes the tools to find business opportunities, generate client
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
            {busy ? "Preparing checkout..." : "Pay ₦500 & Start Earning"}
            {!busy && <ArrowRight className="ml-2 size-4" />}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout via Paystack. Real Starter plan. No fake promises or guaranteed income.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <p className="font-semibold">What does ₦500 get me?</p>
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
            You can still explore Kodarai first and come back when you’re ready.
          </p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => {
              trackPlanSkipped();
              navigate({ to: "/dashboard" });
            }}
          >
            I&apos;ll do this later
          </Button>
        </div>
      </div>
    </div>
  );
}
