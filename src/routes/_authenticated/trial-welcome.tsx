import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/trial-welcome")({
  head: () => ({ meta: [{ title: "You're in! — Kodarai" }] }),
  component: TrialWelcomePage,
});

function TrialWelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-md text-center">

        {/* Celebration emoji */}
        <div className="text-6xl">🎉</div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          You're in, {firstName}!
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your free trial is active for the next 3 days.
        </p>

        {/* Trial perks */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-border bg-card p-4">
            <Search className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">2 searches</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Find real leads now</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Sparkles className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">AI tools</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Prompts & scripts</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Clock className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">3 days free</p>
            <p className="mt-0.5 text-xs text-muted-foreground">No card needed</p>
          </div>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="mt-8 w-full"
          onClick={() => navigate({ to: "/dashboard" })}
        >
          Start finding clients <ArrowRight className="size-4" />
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          Trial ends in 3 days · upgrade anytime to keep your leads
        </p>
      </div>
    </div>
  );
}
