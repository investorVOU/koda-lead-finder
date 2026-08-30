import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Briefcase, Youtube, Lightbulb, PenLine, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome to Kodarai" }] }),
  component: WelcomePage,
});

const FEATURES = [
  { icon: Briefcase, title: "Find clients", text: "Businesses without a website, ready to pitch." },
  { icon: Youtube, title: "Grow your channel", text: "See what's working and what to make next." },
  { icon: Lightbulb, title: "Never run out of ideas", text: "Titles, hooks and angles in seconds." },
  { icon: PenLine, title: "Skip the blank page", text: "Full scripts, ready to record." },
];

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Everything to grow, in one place
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find clients. Grow your channel. Create faster.
        </p>

        <div className="mt-8 space-y-3 text-left">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding" })}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get started
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
