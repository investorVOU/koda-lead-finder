import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({ meta: [{ title: "Studio — Kodarai" }] }),
  component: StudioPage,
});

type StudioTool = {
  title: string;
  description: string;
  href: string;
  detail: string;
};

const CREATE_TOOLS: StudioTool[] = [
  {
    title: "Channel Review",
    description: "Find the strongest patterns in a channel and where to improve next.",
    href: "/studio/channel-review",
    detail: "Strategy",
  },
  {
    title: "Content Studio",
    description: "Develop scripts, titles, descriptions, and polished creative briefs.",
    href: "/studio/content",
    detail: "Writing",
  },
  {
    title: "Social Content",
    description: "Build a practical publishing plan for the platforms your audience uses.",
    href: "/social-content",
    detail: "Publishing",
  },
  {
    title: "Video Ideas",
    description: "Plan focused video concepts, angles, titles, and opening hooks.",
    href: "/studio/ideas",
    detail: "Planning",
  },
];

const MANAGE_TOOLS: StudioTool[] = [
  {
    title: "Channel Search",
    description: "Explore channels, videos, and competitor patterns for your niche.",
    href: "/studio/scraper",
    detail: "Research",
  },
  {
    title: "Automations",
    description: "Set up repeatable workflows for research and content preparation.",
    href: "/studio/automations",
    detail: "Systems",
  },
  {
    title: "My Research",
    description: "Return to your saved channels, videos, ideas, and drafts.",
    href: "/studio/research",
    detail: "Library",
  },
];

function StudioPage() {
  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="border-b border-border pb-8 sm:pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Kodarai Studio</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            A focused workspace for your content system.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Research what matters, shape a strong idea, and prepare every piece of content with a clear next step.
          </p>
        </div>

        <StudioSection
          eyebrow="Create"
          title="Plan and produce"
          description="Start with a clear direction, then turn it into work you can publish."
          tools={CREATE_TOOLS}
        />
        <StudioSection
          eyebrow="Organize"
          title="Keep your work moving"
          description="Build a useful reference library and put routine work on a dependable system."
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
    <section className="border-b border-border py-8 last:border-0 sm:py-10">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className={`grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 ${tools.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tools.map((tool, index) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="group flex min-h-48 flex-col bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{tool.detail}</span>
              <span className="font-mono text-[11px]">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-auto pt-8">
              <h3 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
