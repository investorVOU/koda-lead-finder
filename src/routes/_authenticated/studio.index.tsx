import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  FolderOpen,
  LayoutTemplate,
  PenLine,
  Search,
  Send,
  Settings2,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [
      { title: "Kodarai Studio — Build Websites from Leads" },
      { name: "description", content: "Turn a local business lead into a website you can preview, edit, publish, and sell." },
    ],
  }),
  component: StudioPage,
});

type StudioTool = {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
};

const CONTENT_TOOLS: StudioTool[] = [
  { title: "Channel Review", description: "See what is working in a channel and where to improve next.", href: "/studio/channel-review", category: "Strategy", icon: ClipboardList },
  { title: "Content Studio", description: "Draft scripts, titles, descriptions, and creative briefs.", href: "/studio/content", category: "Writing", icon: PenLine },
  { title: "Social Content", description: "Plan practical posts for the platforms your audience uses.", href: "/social-content", category: "Publishing", icon: Send },
  { title: "Video Ideas", description: "Shape video topics, angles, titles, and opening hooks.", href: "/studio/ideas", category: "Planning", icon: Video },
];

const WORKSPACE_TOOLS: StudioTool[] = [
  { title: "Channel Search", description: "Research channels, videos, and competitor patterns in your niche.", href: "/studio/scraper", category: "Research", icon: Search },
  { title: "Automations", description: "Set up repeatable workflows for research and content preparation.", href: "/studio/automations", category: "Systems", icon: Settings2 },
  { title: "My Research", description: "Return to saved channels, videos, ideas, and drafts.", href: "/studio/research", category: "Library", icon: FolderOpen },
];

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl space-y-10 pb-4 sm:space-y-12">
        <header className="border-b border-border pb-7 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Kodarai Studio</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">Studio</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Build a website for a lead, then keep your research and content work organised in one place.
            </p>
          </div>
          <Link
            to="/studio/new"
            search={{ leadId: undefined }}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 sm:mt-0 sm:w-auto"
          >
            New website <ArrowRight className="size-4" />
          </Link>
        </header>

        <section aria-labelledby="builder-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-stretch">
            <div className="p-5 sm:p-7">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutTemplate className="size-5" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Website builder</p>
              <h2 id="builder-heading" className="mt-2 text-2xl font-semibold text-foreground">Create a site your lead can use.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Start with a local business, make the final edits, and send a live preview when it is ready.
              </p>
              <ol className="mt-6 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/20 text-center sm:max-w-lg">
                <li className="p-3 sm:p-4"><span className="mx-auto flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span><span className="mt-2 block text-xs font-medium text-foreground sm:text-sm">Choose lead</span></li>
                <li className="p-3 sm:p-4"><span className="mx-auto flex size-6 items-center justify-center rounded-full border border-primary/35 bg-background text-xs font-semibold text-primary">2</span><span className="mt-2 block text-xs font-medium text-foreground sm:text-sm">Edit site</span></li>
                <li className="p-3 sm:p-4"><span className="mx-auto flex size-6 items-center justify-center rounded-full border border-primary/35 bg-background text-xs font-semibold text-primary">3</span><span className="mt-2 block text-xs font-medium text-foreground sm:text-sm">Share</span></li>
              </ol>
              </div>
            </div>
            <div className="border-t border-border bg-[#f4f7f5] p-5 dark:bg-muted/35 sm:p-7 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold text-foreground">Ready to start?</p>
              <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">Choose a lead first for the fastest setup.</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Link to="/dashboard" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <Search className="size-4" /> Find a lead
                </Link>
                <Link to="/studio/new" search={{ leadId: undefined }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  Open builder <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <StudioSection title="Plan and publish" description="Turn research into useful videos, posts, and creative work without losing the thread." tools={CONTENT_TOOLS} />
        <StudioSection title="Research workspace" description="Search, organise, and revisit work whenever you need it." tools={WORKSPACE_TOOLS} />
      </div>
    </DashboardShell>
  );
}

function StudioSection({ title, description, tools }: { title: string; description: string; tools: StudioTool[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-5 sm:flex sm:items-end sm:justify-between sm:gap-8 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground sm:mt-0">{description}</p>
      </div>
      <div className="divide-y divide-border">
        {tools.map((tool) => (
          <Link key={tool.href} to={tool.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:border-primary/35 group-hover:bg-primary/10 group-hover:text-primary">
              <tool.icon className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="font-semibold text-foreground">{tool.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{tool.category}</span>
              </span>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">{tool.description}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}
