import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  FolderOpen,
  PenLine,
  Search,
  Send,
  Settings2,
  Video,
  Plus,
  Sparkles,
  LayoutTemplate,
  FileText,
  Zap,
  Globe2,
  ChevronRight,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute(
  "/_authenticated/studio/",
)({
  head: () => ({
    meta: [
      {
        title:
          "Kodarai Studio — Build Websites from Leads",
      },
      {
        name: "description",
        content:
          "Turn a local business lead into a website you can preview, edit, publish, and sell.",
      },
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
  {
    title: "Channel Review",
    description:
      "See what is working in a channel and where to improve next.",
    href: "/studio/channel-review",
    category: "Strategy",
    icon: ClipboardList,
  },
  {
    title: "Content Studio",
    description:
      "Draft scripts, titles, descriptions, and creative briefs.",
    href: "/studio/content",
    category: "Writing",
    icon: PenLine,
  },
  {
    title: "Social Content",
    description:
      "Plan practical posts for the platforms your audience uses.",
    href: "/social-content",
    category: "Publishing",
    icon: Send,
  },
  {
    title: "Video Ideas",
    description:
      "Shape video topics, angles, titles, and opening hooks.",
    href: "/studio/ideas",
    category: "Planning",
    icon: Video,
  },
];

const WORKSPACE_TOOLS: StudioTool[] = [
  {
    title: "Channel Search",
    description:
      "Research channels, videos, and competitor patterns in your niche.",
    href: "/studio/scraper",
    category: "Research",
    icon: Search,
  },
  {
    title: "Automations",
    description:
      "Set up repeatable workflows for research and content preparation.",
    href: "/studio/automations",
    category: "Systems",
    icon: Settings2,
  },
  {
    title: "My Research",
    description:
      "Return to saved channels, videos, ideas, and drafts.",
    href: "/studio/research",
    category: "Library",
    icon: FolderOpen,
  },
];

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
        {/* HERO */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-border
            bg-card
            px-5
            py-6
            shadow-sm
            sm:px-7
            sm:py-8
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-20
              -top-24
              size-64
              rounded-full
              bg-primary/10
              blur-3xl
            "
          />

          <div
            className="
              relative
              z-10
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-primary/15
                  bg-primary/[0.06]
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-primary
                "
              >
                <Sparkles className="size-3.5" />
                Kodarai Studio
              </div>

              <h1
                className="
                  mt-4
                  text-3xl
                  font-semibold
                  tracking-tight
                  text-foreground
                  sm:text-4xl
                "
              >
                Turn leads into
                client-ready work.
              </h1>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-muted-foreground
                  sm:text-base
                "
              >
                Build websites, research
                opportunities, and create
                the content you need to
                close and grow clients.
              </p>
            </div>

            <Link
              to="/studio/new"
              search={{
                leadId: undefined,
              }}
              className="
                inline-flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-primary
                px-5
                text-sm
                font-semibold
                text-primary-foreground
                shadow-sm
                transition
                hover:bg-primary/90
                sm:w-auto
              "
            >
              <Plus className="size-4" />
              New website
            </Link>
          </div>
        </section>

        {/* WEBSITE BUILDER FEATURE */}

        <section
          className="
            overflow-hidden
            rounded-[26px]
            border
            border-border
            bg-card
            shadow-sm
          "
        >
          <div
            className="
              grid
              lg:grid-cols-[minmax(0,1fr)_320px]
            "
          >
            <div className="p-5 sm:p-7">
              <span
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary/10
                  text-primary
                "
              >
                <LayoutTemplate className="size-5" />
              </span>

              <p
                className="
                  mt-5
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-primary
                "
              >
                Website builder
              </p>

              <h2
                className="
                  mt-2
                  max-w-xl
                  text-2xl
                  font-semibold
                  tracking-tight
                  text-foreground
                "
              >
                Build a website from a
                lead in one flow.
              </h2>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                Start from a business you
                found in Finder, edit the
                site, then share a live
                preview when you're ready
                to pitch.
              </p>

              <div
                className="
                  mt-6
                  grid
                  gap-3
                  sm:grid-cols-3
                "
              >
                <FlowStep
                  number="1"
                  title="Choose lead"
                  description="Start from Finder or create manually."
                />

                <FlowStep
                  number="2"
                  title="Build"
                  description="Edit the page for the business."
                />

                <FlowStep
                  number="3"
                  title="Share"
                  description="Send the preview to your prospect."
                />
              </div>
            </div>

            <div
              className="
                border-t
                border-border
                bg-muted/30
                p-5
                sm:p-7
                lg:border-l
                lg:border-t-0
              "
            >
              <p className="text-sm font-semibold text-foreground">
                Start with a real lead
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Finder gives you the
                fastest path from prospect
                to sample website.
              </p>

              <div className="mt-5 space-y-2">
                <Link
                  to="/dashboard"
                  className="
                    flex
                    h-11
                    items-center
                    justify-between
                    rounded-xl
                    border
                    border-border
                    bg-background
                    px-4
                    text-sm
                    font-medium
                    text-foreground
                    transition
                    hover:border-primary/30
                  "
                >
                  <span className="inline-flex items-center gap-2">
                    <Search className="size-4 text-primary" />
                    Find a lead
                  </span>

                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/studio/new"
                  search={{
                    leadId: undefined,
                  }}
                  className="
                    flex
                    h-11
                    items-center
                    justify-between
                    rounded-xl
                    bg-primary
                    px-4
                    text-sm
                    font-semibold
                    text-primary-foreground
                    transition
                    hover:bg-primary/90
                  "
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-4" />
                    Open builder
                  </span>

                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK START */}

        <section>
          <div
            className="
              mb-3
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Quick start
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Jump into the most useful
                Studio workflows.
              </p>
            </div>
          </div>

          <div
            className="
              grid
              gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            <QuickCard
              title="Website sample"
              description="Build a client-ready site from a lead."
              href="/studio/new"
              icon={Globe2}
            />

            <QuickCard
              title="Content draft"
              description="Create scripts, titles, and creative briefs."
              href="/studio/content"
              icon={FileText}
            />

            <QuickCard
              title="Research"
              description="Explore channels, videos, and competitors."
              href="/studio/scraper"
              icon={Search}
            />
          </div>
        </section>

        {/* CONTENT + RESEARCH */}

        <div
          className="
            grid
            gap-6
            lg:grid-cols-2
          "
        >
          <StudioSection
            eyebrow="Create"
            title="Plan and publish"
            description="Turn research into useful content without losing context."
            tools={CONTENT_TOOLS}
          />

          <StudioSection
            eyebrow="Workspace"
            title="Research and systems"
            description="Search, organise, automate, and revisit your work."
            tools={WORKSPACE_TOOLS}
          />
        </div>

        {/* WORKFLOW CTA */}

        <section
          className="
            rounded-[24px]
            border
            border-primary/15
            bg-primary/[0.05]
            p-5
            sm:p-6
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your Kodarai workflow
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Find a lead → build a
                sample → reach out → close
                the client.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-primary/20
                bg-background
                px-4
                text-sm
                font-semibold
                text-primary
                transition
                hover:bg-primary/[0.04]
              "
            >
              Go to Finder
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function FlowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-border
        bg-background/60
        p-4
      "
    >
      <span
        className="
          flex
          size-7
          items-center
          justify-center
          rounded-full
          bg-primary
          text-xs
          font-semibold
          text-primary-foreground
        "
      >
        {number}
      </span>

      <p className="mt-3 text-sm font-semibold text-foreground">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function QuickCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={href}
      className="
        group
        rounded-[22px]
        border
        border-border
        bg-card
        p-5
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:border-primary/25
        hover:shadow-md
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <span
          className="
            flex
            size-10
            items-center
            justify-center
            rounded-xl
            bg-primary/10
            text-primary
          "
        >
          <Icon className="size-5" />
        </span>

        <ArrowRight
          className="
            size-4
            text-muted-foreground
            transition-transform
            group-hover:translate-x-1
            group-hover:text-primary
          "
        />
      </div>

      <h3 className="mt-5 font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {description}
      </p>
    </Link>
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
    <section
      className="
        overflow-hidden
        rounded-[24px]
        border
        border-border
        bg-card
        shadow-sm
      "
    >
      <div
        className="
          border-b
          border-border
          px-5
          py-5
        "
      >
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-primary
          "
        >
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-semibold text-foreground">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="divide-y divide-border">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="
              group
              flex
              items-center
              gap-4
              px-5
              py-4
              transition-colors
              hover:bg-muted/40
            "
          >
            <span
              className="
                flex
                size-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-border
                bg-background
                text-muted-foreground
                transition
                group-hover:border-primary/25
                group-hover:bg-primary/10
                group-hover:text-primary
              "
            >
              <tool.icon
                className="size-[18px]"
                strokeWidth={1.8}
              />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className="
                  flex
                  items-baseline
                  gap-2
                "
              >
                <span className="font-semibold text-foreground">
                  {tool.title}
                </span>

                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {tool.category}
                </span>
              </span>

              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                {tool.description}
              </span>
            </span>

            <ArrowRight
              className="
                size-4
                shrink-0
                text-muted-foreground
                transition-transform
                group-hover:translate-x-1
                group-hover:text-primary
              "
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
