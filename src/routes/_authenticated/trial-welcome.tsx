import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/trial-welcome")({
  head: () => ({ meta: [{ title: "Welcome to Kodarai — Free Trial" }] }),
  component: TrialWelcomePage,
});

function TrialWelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-lg text-center">

        {/* Icon */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-lg)]">
          <Sparkles className="size-8" />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome, {firstName}!
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your free trial is active. Here's what you get for the next 3 days:
        </p>

        {/* Trial perks */}
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <Search className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">250 searches</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Find leads in any city worldwide</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Sparkles className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">AI tools included</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Prompts, call scripts & proposals</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Clock className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">3 days free</p>
            <p className="mt-0.5 text-xs text-muted-foreground">No card required to start</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate({ to: "/onboarding" })}
            className="w-full sm:w-auto"
          >
            Set up your profile <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full sm:w-auto"
          >
            Skip to dashboard
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          After your trial, plans start from{" "}
          <Link to="/billing" className="underline underline-offset-2 hover:text-foreground">
            $2 / month
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
