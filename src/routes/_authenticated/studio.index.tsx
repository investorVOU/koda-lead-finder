import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Eye,
  FileText,
  FolderOpen,
  Lightbulb,
  Radar,
  Rocket,
  Search,
  Share2,
  Sparkles,
  Wrench,
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
  detail: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
};

const CREATE_TOOLS: StudioTool[] = [
  {
    title: "Channel Review",
    description: "Find the strongest patterns in a channel and where to improve next.",
    href: "/studio/channel-review",
    detail: "Strategy",
    icon: Radar,
    color: "from-violet-500/20 via-violet-500/5 to-card border-violet-500/25 hover:border-violet-400/60",
    iconColor: "bg-violet-500 text-white shadow-violet-500/25",
  },
  {
    title: "Content Studio",
    description: "Develop scripts, titles, descriptions, and polished creative briefs.",
    href: "/studio/content",
    detail: "Writing",
    icon: FileText,
    color: "from-amber-500/20 via-amber-500/5 to-card border-amber-500/25 hover:border-amber-400/60",
    iconColor: "bg-amber-500 text-amber-950 shadow-amber-500/25",
  },
  {
    title: "Social Content",
    description: "Build a practical publishing plan for the platforms your audience uses.",
    href: "/social-content",
    detail: "Publishing",
    icon: Share2,
    color: "from-pink-500/20 via-pink-500/5 to-card border-pink-500/25 hover:border-pink-400/60",
    iconColor: "bg-pink-500 text-white shadow-pink-500/25",
  },
  {
    title: "Video Ideas",
    description: "Plan focused video concepts, angles, titles, and opening hooks.",
    href: "/studio/ideas",
    detail: "Planning",
    icon: Lightbulb,
    color: "from-orange-500/20 via-orange-500/5 to-card border-orange-500/25 hover:border-orange-400/60",
    iconColor: "bg-orange-500 text-white shadow-orange-500/25",
  },
];

const MANAGE_TOOLS: StudioTool[] = [
  {
    title: "Channel Search",
    description: "Explore channels, videos, and competitor patterns for your niche.",
    href: "/studio/scraper",
    detail: "Research",
    icon: Search,
    color: "from-cyan-500/20 via-cyan-500/5 to-card border-cyan-500/25 hover:border-cyan-400/60",
    iconColor: "bg-cyan-500 text-cyan-950 shadow-cyan-500/25",
  },
  {
    title: "Automations",
    description: "Set up repeatable workflows for research and content preparation.",
    href: "/studio/automations",
    detail: "Systems",
    icon: Bot,
    color: "from-blue-500/20 via-blue-500/5 to-card border-blue-500/25 hover:border-blue-400/60",
    iconColor: "bg-blue-500 text-white shadow-blue-500/25",
  },
  {
    title: "My Research",
    description: "Return to your saved channels, videos, ideas, and drafts.",
    href: "/studio/research",
    detail: "Library",
    icon: FolderOpen,
    color: "from-teal-500/20 via-teal-500/5 to-card border-teal-500/25 hover:border-teal-400/60",
    iconColor: "bg-teal-500 text-white shadow-teal-500/25",
  },
];

const BUILDER_STEPS = [
  { icon: Search, label: "Find", detail: "Choose a lead without a website" },
  { icon: Sparkles, label: "Build", detail: "Generate a tailored business website" },
  { icon: Eye, label: "Preview", detail: "Edit and check every screen size" },
  { icon: Rocket, label: "Publish", detail: "Send a live link to the owner" },
];

function StudioPage() {
  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-7 sm:px-6 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-3xl bg-[#063b35] p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-9">
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 size-80 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,.85fr)] lg:items-end">
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Kodarai Studio</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Turn a local lead into a website you can sell.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/75 sm:text-base">
              Find a business, generate a polished website, make the final edits, and publish a shareable live link — all in one sales workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/studio/new"
                search={{ leadId: undefined }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-semibold text-emerald-950 shadow-lg shadow-lime-950/20 transition-colors hover:bg-lime-200"
              >
                <Wrench className="size-4" /> Open Kodarai Builder
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <Search className="size-4" /> Find a lead
              </Link>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:grid-cols-4">
            {BUILDER_STEPS.map((step, index) => (
              <div key={step.label} className="rounded-xl border border-white/10 bg-[#032b26]/55 p-3">
                <div className="flex items-center justify-between text-lime-300">
                  <step.icon className="size-4" />
                  <span className="font-mono text-[10px] text-emerald-100/50">0{index + 1}</span>
                </div>
                <h2 className="mt-5 text-sm font-semibold">{step.label}</h2>
                <p className="mt-1 text-xs leading-5 text-emerald-100/60">{step.detail}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">Primary workflow</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Website Builder</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">Start from Lead Finder for the fastest path: choose a business with no website, then select Build Website.</p>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-background/75 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/25"><Wrench className="size-5" /></div>
              <div>
                <h3 className="font-semibold">Create a business website</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Generate controlled, responsive website files from business details, then preview, edit, save, and publish them from one project.</p>
              </div>
            </div>
            <Link to="/studio/new" search={{ leadId: undefined }} className="mt-4 inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-700 sm:mt-0">
              Create website <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <StudioSection
          eyebrow="YouTube Studio"
          title="Research, create, and grow your channel"
          description="Plan content from stronger channel insight, turn it into videos and social posts, then keep your publishing momentum moving."
          tools={CREATE_TOOLS}
        />
        <StudioSection
          eyebrow="Research and systems"
          title="Keep your creative engine moving"
          description="Explore channels and competitors, automate repeatable research, and keep your best ideas and drafts in one library."
          tools={MANAGE_TOOLS}
        />
      </main>
    </DashboardShell>
  );
}

function StudioSection({
  eyebrow,
  title,
  description,
  tools,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tools: StudioTool[];
}) {
  return (
    <section className="last:border-0">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 ${tools.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tools.map((tool, index) => (
          <Link
            key={tool.href}
            to={tool.href}
            className={`group relative flex min-h-60 flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-1 hover:shadow-xl focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${tool.color}`}
          >
            <div className="flex items-start justify-between">
              <span className={`flex size-11 items-center justify-center rounded-xl shadow-lg ${tool.iconColor}`}><tool.icon className="size-5" /></span>
              <span className="rounded-full border border-foreground/10 bg-background/60 px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">0{index + 1}</span>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tool.detail}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight transition-colors group-hover:text-foreground">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tool.description}</p>
              <span className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-foreground/10 bg-background/70 px-3 text-sm font-medium text-foreground shadow-sm transition-colors group-hover:bg-foreground group-hover:text-background">
                Open tool <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
