import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Youtube,
  Lightbulb,
  PenLine,
  ArrowRight,
  Check,
  X,
} from "lucide-react";

import { LiveNotification } from "@/components/LiveNotification";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [{ title: "Welcome to Kodarai" }],
  }),
  component: WelcomePage,
});

const FEATURES = [
  {
    icon: Search,
    title: "Find high-rated businesses without websites",
    text: "See them, estimate the deal, and close them fast.",
  },
  {
    icon: Youtube,
    title: "Grow your channel",
    text: "See what's working and what to make next.",
  },
  {
    icon: Lightbulb,
    title: "Never run out of ideas",
    text: "Titles, hooks and angles in seconds.",
  },
  {
    icon: PenLine,
    title: "Skip the blank page",
    text: "Full scripts, ready to record.",
  },
];

const COMPARISON = [
  {
    without: "Find a business that needs a website, then figure out how to build one",
    with: "Find the business and build the website with AI",
  },
  {
    without: "Learn HTML, CSS, React and web design before you can sell",
    with: "Describe what you want and let AI handle the starting point",
  },
  {
    without: "Spend hours searching for businesses to contact",
    with: "Find dozens of potential clients in a single search",
  },
  {
    without: "Guess which businesses are worth approaching",
    with: "Research businesses and prioritize better opportunities",
  },
  {
    without: "Write every cold message from scratch",
    with: "Create personalized outreach faster",
  },
  {
    without: "Close a client and then scramble to build the site",
    with: "Build the site, preview it and have something to show your prospect",
  },
  {
    without: "Use one tool for leads, another for websites and another for content",
    with: "Find, build and create from one workspace",
  },
  {
    without: "Spend hours researching what to post on YouTube",
    with: "Find topics, titles, hooks and scripts in minutes",
  },
];

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 pb-32 pt-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Everything to grow, in one place
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Find clients. Grow your channel. Create faster.
        </p>

        <div className="mt-8 space-y-3 text-left">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />

              <div>
                <p className="text-sm font-semibold">
                  {f.title}
                </p>

                <p className="text-xs text-muted-foreground">
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-2 border-b border-border text-left">
            <p className="p-2.5 text-[11px] font-semibold text-muted-foreground">
              Without Kodarai
            </p>

            <p className="border-l border-border bg-primary/[0.04] p-2.5 text-[11px] font-semibold text-primary">
              With Kodarai
            </p>
          </div>

          {COMPARISON.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 text-left ${
                i < COMPARISON.length - 1
                  ? "border-b border-border"
                  : ""
              }`}
            >
              <div className="flex gap-1.5 p-2.5">
                <X className="mt-0.5 size-3 shrink-0 text-muted-foreground" />

                <p className="text-[11px] leading-snug text-muted-foreground">
                  {row.without}
                </p>
              </div>

              <div className="flex gap-1.5 border-l border-border bg-primary/[0.04] p-2.5">
                <Check className="mt-0.5 size-3 shrink-0 text-primary" />

                <p className="text-[11px] leading-snug">
                  {row.with}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Setup takes less than 2 minutes.
        </p>
      </div>

      {/* Live activity notifications */}
      <LiveNotification />

      {/* Floating CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="mx-auto w-full max-w-md px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding" })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
