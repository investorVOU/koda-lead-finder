import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Lightbulb,
  PenLine,
  Workflow,
  Youtube,
  Sparkles,
  ArrowRight,
  Bot,
  Database,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({ meta: [{ title: "Studio — Kodarai" }] }),
  component: StudioPage,
});

const TOOLS = [
  {
    id: "channel-review",
    title: "Channel Review",
    description: "Analyze a YouTube channel, content strategy, titles and growth opportunities.",
    icon: Youtube,
    href: "/studio/channel-review",
  },
  {
    id: "ideas",
    title: "Video Ideas",
    description: "Find fresh video ideas, hooks, angles and titles for your niche.",
    icon: Lightbulb,
    href: "/studio/ideas",
  },
  {
    id: "scraper",
    title: "AI Scraper",
    description: "Research channels, videos, competitors and content patterns.",
    icon: Search,
    href: "/studio/scraper",
  },
  {
    id: "content",
    title: "Content Studio",
    description: "Create scripts, stories, hooks, titles, descriptions and more.",
    icon: PenLine,
    href: "/studio/content",
  },
  {
    id: "automation",
    title: "AI Automations",
    description: "Build repeatable AI workflows that handle research and content tasks.",
    icon: Workflow,
    href: "/studio/automations",
  },
  {
    id: "research",
    title: "My Research",
    description: "Keep your saved channels, videos, ideas, research and generated content.",
    icon: Database,
    href: "/studio/research",
  },
];

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Studio
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Your AI workspace for researching content, finding ideas,
                creating videos and building automations.
              </p>
            </div>
          </div>
        </div>

        {/* Quick tools */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">AI Tools</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick a tool and get to work.
              </p>
            </div>
          </div>

          {/* 2 columns on mobile */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.id} {...tool} />
            ))}
          </div>
        </section>

        {/* Creator workflow */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="size-4 text-primary" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                A simple creator workflow
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Research what is working, discover opportunities, generate
                ideas and turn them into content.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <WorkflowStep
              number="01"
              title="Research"
              description="Find channels, videos and patterns."
            />

            <WorkflowStep
              number="02"
              title="Analyze"
              description="Understand what is working."
            />

            <WorkflowStep
              number="03"
              title="Create"
              description="Turn insights into ideas and scripts."
            />

            <WorkflowStep
              number="04"
              title="Automate"
              description="Build workflows for repetitive work."
            />
          </div>
        </section>

        {/* Coming soon / positioning */}
        <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
              <Sparkles className="size-4 text-primary" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                Built for AI creators
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                KodarAI Studio is becoming a workspace for AI YouTubers,
                automation builders and creators — from research to finished
                content.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function ToolCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group block h-full rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-sm sm:p-4"
    >
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-9">
        <Icon className="size-4 sm:size-4" />
      </div>

      <div className="mt-3">
        <h3 className="text-xs font-semibold leading-tight sm:text-sm">
          {title}
        </h3>

        <p className="mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
          {description}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-primary opacity-80 transition-transform group-hover:translate-x-0.5 sm:text-xs">
        Open
        <ArrowRight className="size-3" />
      </div>
    </Link>
  );
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <span className="text-[10px] font-bold text-primary">{number}</span>

      <h3 className="mt-1 text-xs font-semibold">{title}</h3>

      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
