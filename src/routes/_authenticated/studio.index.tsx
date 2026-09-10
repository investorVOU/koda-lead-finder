import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

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
  Plus,
  Globe2,
  Sparkles,
  FileText,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route =
  createFileRoute(
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

    component:
      StudioPage,
  });

type StudioTool = {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
};

const PROJECT_TOOLS: StudioTool[] =
  [
    {
      title:
        "New Website",
      description:
        "Create a client-ready sample website.",
      href: "/studio/new",
      category:
        "Website",
      icon: Globe2,
    },
    {
      title:
        "Content Studio",
      description:
        "Draft scripts, titles and creative briefs.",
      href: "/studio/content",
      category:
        "Content",
      icon: PenLine,
    },
    {
      title:
        "Channel Review",
      description:
        "Review a channel and find opportunities.",
      href: "/studio/channel-review",
      category:
        "Strategy",
      icon: ClipboardList,
    },
  ];

const CONTENT_TOOLS: StudioTool[] =
  [
    {
      title:
        "Social Content",
      description:
        "Plan useful posts for your platforms.",
      href: "/social-content",
      category:
        "Publishing",
      icon: Send,
    },
    {
      title:
        "Video Ideas",
      description:
        "Generate topics, hooks and titles.",
      href: "/studio/ideas",
      category:
        "Planning",
      icon: Video,
    },
    {
      title:
        "Channel Search",
      description:
        "Research channels, videos and competitors.",
      href: "/studio/scraper",
      category:
        "Research",
      icon: Search,
    },
    {
      title:
        "Automations",
      description:
        "Create repeatable research workflows.",
      href: "/studio/automations",
      category:
        "Systems",
      icon: Settings2,
    },
    {
      title:
        "My Research",
      description:
        "Return to saved research and ideas.",
      href: "/studio/research",
      category:
        "Library",
      icon: FolderOpen,
    },
  ];

function StudioPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl pb-6">
        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Studio
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Build, research
              and prepare work
              for your leads.
            </p>
          </div>

          <Link
            to="/studio/new"
            search={{
              leadId:
                undefined,
            }}
            className="
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-2
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
            <Plus className="size-4" />

            <span className="hidden sm:inline">
              New Website
            </span>

            <span className="sm:hidden">
              New
            </span>
          </Link>
        </div>

        {/* TABS */}

        <div
          className="
            mt-5
            flex
            gap-1
            overflow-x-auto
            rounded-xl
            border
            border-border
            bg-muted/40
            p-1
          "
        >
          <StudioTab active>
            Projects
          </StudioTab>

          <StudioTab>
            Content
          </StudioTab>

          <StudioTab>
            Research
          </StudioTab>

          <StudioTab>
            Templates
          </StudioTab>
        </div>

        {/* SEARCH */}

        <div className="relative mt-4">
          <Search
            className="
              absolute
              left-4
              top-1/2
              size-4
              -translate-y-1/2
              text-muted-foreground
            "
          />

          <div
            className="
              flex
              h-12
              items-center
              rounded-xl
              border
              border-border
              bg-card
              pl-11
              pr-4
              text-sm
              text-muted-foreground
            "
          >
            Search your Studio
            workspace
          </div>
        </div>

        {/* FEATURED PROJECT */}

        <section
          className="
            mt-5
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
              grid
              sm:grid-cols-[1fr_auto]
              sm:items-center
            "
          >
            <div className="p-5 sm:p-6">
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-semibold
                  text-primary
                "
              >
                <Sparkles className="size-4" />
                Start from a lead
              </div>

              <h2 className="mt-3 text-xl font-semibold text-foreground">
                Build a sample
                website for your
                next prospect.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Pick a business,
                create the site,
                customise it,
                then send the
                preview directly
                to your prospect.
              </p>

              <div
                className="
                  mt-5
                  flex
                  flex-wrap
                  gap-2
                "
              >
                <Link
                  to="/dashboard"
                  className="
                    inline-flex
                    h-10
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-border
                    bg-background
                    px-4
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  <Search className="size-4" />
                  Find a lead
                </Link>

                <Link
                  to="/studio/new"
                  search={{
                    leadId:
                      undefined,
                  }}
                  className="
                    inline-flex
                    h-10
                    items-center
                    gap-2
                    rounded-xl
                    bg-primary
                    px-4
                    text-sm
                    font-semibold
                    text-primary-foreground
                  "
                >
                  Open builder
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div
              className="
                hidden
                h-full
                min-w-[170px]
                items-center
                justify-center
                border-l
                border-border
                bg-muted/25
                sm:flex
              "
            >
              <span
                className="
                  flex
                  size-20
                  items-center
                  justify-center
                  rounded-[22px]
                  bg-primary/10
                  text-primary
                "
              >
                <LayoutTemplate className="size-9" />
              </span>
            </div>
          </div>
        </section>

        {/* RECENT / PROJECT STYLE CARDS */}

        <section className="mt-7">
          <div
            className="
              mb-3
              flex
              items-end
              justify-between
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Quick projects
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Start the work
                you need right
                now.
              </p>
            </div>
          </div>

          <div
            className="
              grid
              gap-3
              sm:grid-cols-3
            "
          >
            {PROJECT_TOOLS.map(
              (tool) => (
                <ProjectCard
                  key={
                    tool.href
                  }
                  tool={tool}
                />
              ),
            )}
          </div>
        </section>

        {/* TEMPLATES */}

        <section className="mt-7">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Templates &
              tools
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Research,
              content and
              workflow tools.
            </p>
          </div>

          <div
            className="
              mt-3
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-card
            "
          >
            {CONTENT_TOOLS.map(
              (
                tool,
                index,
              ) => (
                <div
                  key={
                    tool.href
                  }
                  className={
                    index > 0
                      ? "border-t border-border"
                      : ""
                  }
                >
                  <Link
                    to={
                      tool.href
                    }
                    className="
                      group
                      flex
                      items-center
                      gap-3
                      px-4
                      py-4
                      transition
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
                        bg-primary/10
                        text-primary
                      "
                    >
                      <tool.icon className="size-[18px]" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {
                          tool.title
                        }
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {
                          tool.description
                        }
                      </span>
                    </span>

                    <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:block">
                      {
                        tool.category
                      }
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
                </div>
              ),
            )}
          </div>
        </section>

        {/* FLOW */}

        <section
          className="
            mt-7
            rounded-2xl
            border
            border-primary/15
            bg-primary/[0.05]
            p-4
          "
        >
          <div className="flex items-center gap-3">
            <FileText className="size-5 shrink-0 text-primary" />

            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Kodarai flow:
              </span>{" "}
              Find a lead →
              build a sample →
              contact them →
              close the client.
            </p>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function StudioTab({
  children,
  active = false,
}: {
  children:
    React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`
        min-w-max
        flex-1
        rounded-lg
        px-3
        py-2.5
        text-xs
        font-semibold
        transition

        ${
          active
            ? "bg-background text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}

function ProjectCard({
  tool,
}: {
  tool: StudioTool;
}) {
  return (
    <Link
      to={tool.href}
      className="
        group
        rounded-2xl
        border
        border-border
        bg-card
        p-4
        transition
        hover:border-primary/25
        hover:shadow-sm
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
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
          <tool.icon className="size-5" />
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

      <h3 className="mt-4 text-sm font-semibold text-foreground">
        {tool.title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {tool.description}
      </p>

      <span
        className="
          mt-4
          inline-block
          rounded-full
          bg-muted
          px-2
          py-1
          text-[10px]
          font-medium
          text-muted-foreground
        "
      >
        {tool.category}
      </span>
    </Link>
  );
}
