import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Youtube,
  PenLine,
  Workflow,
  TrendingUp,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Kodarai" }] }),
  component: WelcomePage,
});

interface Step {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: TrendingUp,
    title: "Welcome to KodarAI",
    body: (
      <p className="text-sm leading-relaxed text-muted-foreground">
        KodarAI is a set of AI tools built for Nigerians making money online —
        whether that's finding real clients, growing a YouTube channel, or
        producing content faster. Not a general chatbot. Tools built around
        actual work you do.
      </p>
    ),
  },
  {
    id: "leads",
    icon: Search,
    title: "Lead Finder",
    body: (
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>Find real local businesses that don't have a website yet.</p>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            See an estimated deal value before you reach out
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            AI-written cold call scripts and email sequences
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Track every lead in a built-in pipeline
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "creator",
    icon: Youtube,
    title: "Creator Studio",
    body: (
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>Turn real channel data into a content plan instead of guessing.</p>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Channel Review: see what's actually working, and what to make next
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Ideas: titles, hooks and angles grounded in your niche
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Content Studio: full scripts, ready to record
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "automation",
    icon: Workflow,
    title: "Automations",
    body: (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Chain tools together into repeatable workflows — new lead in, pitch
        out. Video published, Shorts and captions generated. Coming soon as
        Studio grows.
      </p>
    ),
  },
  {
    id: "value",
    icon: PenLine,
    title: "Is it worth it?",
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          One client from Lead Finder, or one video that actually performs
          from Creator Studio, generally covers your subscription many times
          over. Compare that to:
        </p>
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
          <div className="flex justify-between">
            <span>Hiring a VA to research leads/channels manually</span>
            <span className="font-medium">₦[X]/week</span>
          </div>
          <div className="flex justify-between">
            <span>One freelance scriptwriter, per script</span>
            <span className="font-medium">₦[X]</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 font-semibold text-foreground">
            <span>KodarAI, unlimited use</span>
            <span>₦[your price]/month</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/80">
          Fill in real numbers you can defend — don't ship placeholders.
        </p>
      </div>
    ),
  },
];

function WelcomePage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function next() {
    if (isLast) {
      navigate({ to: "/onboarding" });
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function skip() {
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <step.icon className="size-6 text-primary" />
          <h1 className="mt-4 text-lg font-bold tracking-tight">
            {step.title}
          </h1>
          <div className="mt-3">{step.body}</div>

          <div className="mt-6 flex items-center justify-between">
            {!isLast ? (
              <button
                type="button"
                onClick={skip}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Skip
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isLast ? "Continue" : "Next"}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
