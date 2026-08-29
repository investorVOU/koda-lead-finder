import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Clapperboard,
  Code2,
  FileText,
  Lightbulb,
  MessageSquareText,
  PlaySquare,
  Search,
  Sparkles,
  WandSparkles,
  Workflow,
  Youtube,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [{ title: "Creator Studio — Kodarai" }],
  }),
  component: StudioPage,
});

type ToolCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  badge?: string;
  disabled?: boolean;
};

function ToolCard({
  title,
  description,
  icon: Icon,
  href,
  badge,
  disabled = false,
}: ToolCardProps) {
  const content = (
    <div
      className={`group relative h-full rounded-2xl border border-border bg-card p-5 transition-all ${
        disabled
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      }`}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}

      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">{title}</h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>

      {!disabled && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary">
          Open tool
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  return (
    <Link to={href as never} className="block h-full">
      {content}
    </Link>
  );
}

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 size-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative p-6 sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              Creator Studio
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your AI workspace for researching, planning, creating, and
              automating content. Turn an idea into videos, scripts, stories,
              and repeatable workflows.
            </p>
          </div>
        </section>

        {/* YouTube */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Youtube className="size-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">YouTube & Content Research</h2>
              <p className="text-xs text-muted-foreground">
                Find opportunities before you start creating.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Channel Review"
              description="Analyze a YouTube channel, identify what is working, what is weak, and where the biggest content opportunities are."
              icon={PlaySquare}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Video Ideas"
              description="Generate specific video concepts based on a niche, audience, channel, trend, or competitor."
              icon={Lightbulb}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Competitor Research"
              description="Study competing channels and uncover topics, formats, hooks, and gaps worth attacking."
              icon={Search}
              badge="Coming soon"
              disabled
            />
          </div>
        </section>

        {/* Content creation */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Clapperboard className="size-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Content Creation</h2>
              <p className="text-xs text-muted-foreground">
                Go from idea to finished content faster.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Scripts & Stories"
              description="Create long-form YouTube scripts, documentary stories, faceless videos, storytelling content, and narrative concepts."
              icon={FileText}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Titles & Hooks"
              description="Generate attention-grabbing titles, opening hooks, angles, and variations designed around the actual topic."
              icon={MessageSquareText}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Content Repurposer"
              description="Turn one piece of content into Shorts, tweets, captions, posts, hooks, clips, and new video ideas."
              icon={WandSparkles}
              badge="Coming soon"
              disabled
            />
          </div>
        </section>

        {/* Automation */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">AI Automation</h2>
              <p className="text-xs text-muted-foreground">
                Find and design workflows that remove repetitive work.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Automation Ideas"
              description="Describe a repetitive task and discover practical AI automation workflows you could build."
              icon={Bot}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Research & Scrapers"
              description="Design research workflows for collecting, organizing, filtering, and summarizing useful public information."
              icon={Search}
              badge="Coming soon"
              disabled
            />

            <ToolCard
              title="Workflow Builder"
              description="Turn an automation idea into a structured workflow with inputs, steps, AI actions, and outputs."
              icon={Workflow}
              badge="Coming soon"
              disabled
            />
          </div>
        </section>

        {/* Website builder */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Website Builder</h2>
              <p className="text-xs text-muted-foreground">
                Keep the existing AI website builder available as one Studio
                tool.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToolCard
              title="New Website Project"
              description="Create a client website from a prompt using the existing Kodarai website-building workflow."
              icon={Code2}
              href="/studio/new"
            />

            <ToolCard
              title="My Website Projects"
              description="Open and continue working on websites you've already created."
              icon={Code2}
              href="/studio/projects"
              badge="Coming soon"
              disabled
            />
          </div>
        </section>

        {/* Bottom message */}
        <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
          <Sparkles className="mx-auto size-5 text-primary" />

          <h3 className="mt-2 text-sm font-semibold">
            More creator tools are coming
          </h3>

          <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
            Kodarai Studio is becoming a complete AI workspace for creators,
            researchers, agencies, and automation builders — not just a
            website generator.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
