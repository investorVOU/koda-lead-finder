import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Lightbulb,
  PenLine,
  Workflow,
  Youtube,
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
    description: "Paste a channel. See what's working, what's not, what to make next.",
    icon: Youtube,
    href: "/studio/channel-review",
  },
  {
    id: "ideas",
    title: "Video Ideas",
    description: "Titles, hooks and angles for your niche.",
    icon: Lightbulb,
    href: "/studio/ideas",
  },
  {
    id: "scraper",
    title: "AI Scraper",
    description: "Pull channels, videos and competitor patterns.",
    icon: Search,
    href: "/studio/scraper",
  },
  {
    id: "content",
    title: "Content Studio",
    description: "Scripts, stories, titles and descriptions.",
    icon: PenLine,
    href: "/studio/content",
  },
  {
    id: "automation",
    title: "Automations",
    description: "Chain tools into repeatable workflows.",
    icon: Workflow,
    href: "/studio/automations",
  },
  {
    id: "research",
    title: "My Research",
    description: "Saved channels, videos, ideas and drafts.",
    icon: Database,
    href: "/studio/research",
  },
];

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="border-b border-border pb-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Research, write and ship content, in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} {...tool} />
          ))}
        </div>
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
      className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
      <h3 className="text-sm font-semibold leading-tight">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}
