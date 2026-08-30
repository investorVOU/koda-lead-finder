import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Lightbulb,
  Menu,
  PenLine,
  Radar,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [{ title: "Welcome to Kodarai" }],
  }),
  component: WelcomePage,
});

type Feature = {
  icon: typeof Search;
  title: string;
  description: string;
  outcome: string;
};

const features: Feature[] = [
  {
    icon: BarChart3,
    title: "Channel Review",
    description:
      "Analyze a YouTube channel, identify what's performing, spot patterns and uncover opportunities.",
    outcome: "Know what to make next instead of guessing.",
  },
  {
    icon: Lightbulb,
    title: "Video Ideas",
    description:
      "Turn a niche, topic or channel into specific video concepts, hooks, angles and opportunities.",
    outcome: "Never start with a blank page again.",
  },
  {
    icon: Search,
    title: "Research",
    description:
      "Research topics, competitors, markets and opportunities without jumping between countless tabs.",
    outcome: "Get from question to useful information faster.",
  },
  {
    icon: PenLine,
    title: "Content Studio",
    description:
      "Turn ideas and research into scripts, hooks, titles, stories and complete pieces of content.",
    outcome: "Move from idea to finished content faster.",
  },
  {
    icon: Radar,
    title: "Scraper",
    description:
      "Collect useful information from the web and turn scattered data into something you can actually work with.",
    outcome: "Spend less time copying and organizing information.",
  },
  {
    icon: Zap,
    title: "Automations",
    description:
      "Build repeatable workflows around the work you do again and again.",
    outcome: "Spend more time creating and less time doing repetitive tasks.",
  },
];

function WelcomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function continueToOnboarding() {
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-sm">
              <Radar className="size-5" />
            </div>

            <span className="text-lg font-bold tracking-tight">
              Kodarai
            </span>
          </div>

          <button
            type="button"
            onClick={continueToOnboarding}
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            Continue setup
            <ChevronRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="flex size-9 items-center justify-center rounded-lg border border-border sm:hidden"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border px-4 py-3 sm:hidden">
            <button
              type="button"
              onClick={continueToOnboarding}
              className="flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Continue setup
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)] opacity-70" />

          <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Welcome to Kodarai
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop juggling tools.
              <br />
              <span className="text-primary">
                Start turning opportunities into action.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Kodarai brings research, content intelligence, ideas,
              creation and automation into one workspace — so you can
              spend less time figuring out what to do and more time
              actually doing it.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={continueToOnboarding}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 sm:w-auto"
              >
                Let's get you set up
                <ArrowRight className="size-4" />
              </button>

              <a
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
              >
                See what you get
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                One workspace
              </span>

              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                AI-powered workflows
              </span>

              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Built for creators & businesses
              </span>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-border bg-card/50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                The problem
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Your time disappears into the work around the work.
              </h2>

              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                Finding ideas. Researching competitors. Checking what
                performs. Opening another AI tool. Copying information.
                Writing. Rewriting. Organizing everything.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <ProblemCard
                icon={Clock3}
                title="Hours disappear"
                description="A simple content idea can turn into hours of research and preparation."
              />

              <ProblemCard
                icon={Target}
                title="Too much guessing"
                description="Without useful signals, it's easy to create content nobody was looking for."
              />

              <ProblemCard
                icon={TrendingUp}
                title="Disconnected tools"
                description="One tool for research, another for writing, another for analysis and another for automation."
              />
            </div>
          </div>
        </section>

        {/* Value proposition */}
        <section>
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  The Kodarai approach
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  One workflow from research to execution.
                </h2>

                <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                  Kodarai is designed around the actual process of
                  getting useful work done — not around giving you
                  another collection of disconnected AI buttons.
                </p>

                <div className="mt-7 space-y-4">
                  <Step
                    number="01"
                    title="Discover"
                    description="Find information, trends, competitors and opportunities."
                  />

                  <Step
                    number="02"
                    title="Understand"
                    description="Turn raw information into useful insights and decisions."
                  />

                  <Step
                    number="03"
                    title="Create"
                    description="Turn those insights into ideas, scripts and content."
                  />

                  <Step
                    number="04"
                    title="Repeat"
                    description="Build workflows and automations around the things you do repeatedly."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <Radar className="size-4 text-primary" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        Your workflow
                      </p>
                      <p className="text-xs text-muted-foreground">
                        From opportunity to execution
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <WorkflowItem
                      icon={Search}
                      title="Research"
                      text="Find useful information"
                    />

                    <WorkflowItem
                      icon={BarChart3}
                      title="Analyze"
                      text="Understand what's working"
                    />

                    <WorkflowItem
                      icon={Lightbulb}
                      title="Generate"
                      text="Turn insights into opportunities"
                    />

                    <WorkflowItem
                      icon={FileText}
                      title="Create"
                      text="Turn opportunities into content"
                    />

                    <WorkflowItem
                      icon={Zap}
                      title="Automate"
                      text="Reduce repetitive work"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-y border-border bg-muted/20"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Inside Kodarai
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Everything you need to move faster.
              </h2>

              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                Each part of the Studio solves a different piece of
                the workflow. Together, they give you a much more
                complete system.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section>
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Why it can make sense
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Think about what your time is actually worth.
              </h2>

              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                The question isn't just “How much does Kodarai cost?”
                It's also “How much time, attention and money am I
                already spending trying to piece this together?”
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-2 border-b border-border">
                <div className="p-4 sm:p-5">
                  <p className="text-sm font-semibold">
                    Without a unified workflow
                  </p>
                </div>

                <div className="border-l border-border bg-primary/[0.03] p-4 sm:p-5">
                  <p className="text-sm font-semibold text-primary">
                    With Kodarai
                  </p>
                </div>
              </div>

              <ComparisonRow
                left="Jump between research, analytics, writing and AI tools"
                right="Keep the workflow in one workspace"
              />

              <ComparisonRow
                left="Spend time searching for what might work"
                right="Use data and context to find opportunities"
              />

              <ComparisonRow
                left="Start from scratch whenever you create"
                right="Turn research and ideas into content"
              />

              <ComparisonRow
                left="Manually repeat the same tasks"
                right="Build repeatable workflows and automations"
              />

              <ComparisonRow
                left="Pay for several disconnected tools"
                right="Put more of the workflow under one platform"
                last
              />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-muted-foreground">
              Kodarai isn't about promising that every piece of work
              will suddenly become effortless. It's about reducing
              unnecessary friction and giving you better tools to
              make decisions and execute.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-y border-border bg-card/50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Built for people who execute
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Kodarai fits different kinds of work.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AudienceCard
                title="Creators"
                description="Find ideas, understand what performs and create more consistently."
              />

              <AudienceCard
                title="Agencies"
                description="Research clients, competitors and markets without rebuilding the process every time."
              />

              <AudienceCard
                title="Marketers"
                description="Turn research and signals into practical campaigns and content."
              />

              <AudienceCard
                title="Businesses"
                description="Use research, intelligence and automation to reduce repetitive work."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)] opacity-60" />

          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to see what Kodarai can do for you?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Let's personalize your workspace first. It'll only take
              a moment, and then you'll be ready to choose the plan
              that fits how you want to use Kodarai.
            </p>

            <button
              type="button"
              onClick={continueToOnboarding}
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 sm:w-auto"
            >
              Continue to setup
              <ArrowRight className="size-4" />
            </button>

            <p className="mt-4 text-xs text-muted-foreground">
              No need to figure everything out right now. We'll guide
              you through the next step.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProblemCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 pt-0.5 text-[10px] font-bold tracking-widest text-primary">
        {number}
      </span>

      <div>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function WorkflowItem({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Search;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-3.5 text-primary" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {text}
        </p>
      </div>

      <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-4.5 text-primary" />
      </div>

      <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {feature.description}
      </p>

      <div className="mt-5 flex items-start gap-2 border-t border-border pt-4">
        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />

        <p className="text-xs font-medium leading-5">
          {feature.outcome}
        </p>
      </div>
    </div>
  );
}

function ComparisonRow({
  left,
  right,
  last = false,
}: {
  left: string;
  right: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="flex gap-2 p-4 sm:p-5">
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          <X className="size-3.5" />
        </span>

        <p className="text-xs leading-5 text-muted-foreground">
          {left}
        </p>
      </div>

      <div className="flex gap-2 border-l border-border bg-primary/[0.03] p-4 sm:p-5">
        <span className="mt-0.5 shrink-0 text-primary">
          <Check className="size-3.5" />
        </span>

        <p className="text-xs leading-5">{right}</p>
      </div>
    </div>
  );
}

function AudienceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
        <Target className="size-3.5 text-primary" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
