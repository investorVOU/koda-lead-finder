import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  ClipboardList,
  FolderOpen,
  Globe2,
  PenLine,
  Plus,
  Search,
  Send,
  Settings2,
  Video,
  X,
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
    component: StudioPage,
  });

type StudioTool = {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
};

const QUICK_PROJECTS: StudioTool[] = [
  {
    title: "New Website",
    description:
      "Create a client-ready sample website.",
    href: "/studio/new",
    category: "Website",
    icon: Globe2,
  },
  {
    title: "Content Studio",
    description:
      "Draft scripts, titles and creative briefs.",
    href: "/studio/content",
    category: "Content",
    icon: PenLine,
  },
  {
    title: "Channel Review",
    description:
      "Review a channel and find opportunities.",
    href: "/studio/channel-review",
    category: "Strategy",
    icon: ClipboardList,
  },
];

const STUDIO_TOOLS: StudioTool[] = [
  {
    title: "Social Content",
    description:
      "Plan useful posts for your platforms.",
    href: "/social-content",
    category: "Publishing",
    icon: Send,
  },
  {
    title: "Video Ideas",
    description:
      "Generate topics, hooks and titles.",
    href: "/studio/ideas",
    category: "Planning",
    icon: Video,
  },
  {
    title: "Channel Search",
    description:
      "Research channels, videos and competitors.",
    href: "/studio/scraper",
    category: "Research",
    icon: Search,
  },
  {
    title: "Automations",
    description:
      "Create repeatable research workflows.",
    href: "/studio/automations",
    category: "Systems",
    icon: Settings2,
  },
  {
    title: "My Research",
    description:
      "Return to saved research and ideas.",
    href: "/studio/research",
    category: "Library",
    icon: FolderOpen,
  },
];

function StudioPage() {
  const [searchQuery, setSearchQuery] =
    useState("");

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredQuickProjects =
    useMemo(() => {
      if (!normalizedSearch) {
        return QUICK_PROJECTS;
      }

      return QUICK_PROJECTS.filter(
        (tool) =>
          [
            tool.title,
            tool.description,
            tool.category,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
          ),
      );
    }, [normalizedSearch]);

  const filteredTools = useMemo(() => {
    if (!normalizedSearch) {
      return STUDIO_TOOLS;
    }

    return STUDIO_TOOLS.filter(
      (tool) =>
        [
          tool.title,
          tool.description,
          tool.category,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
        ),
    );
  }, [normalizedSearch]);

  const hasResults =
    filteredQuickProjects.length >
      0 ||
    filteredTools.length > 0;

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl pb-6">
        {/* HEADER */}

        <header
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Studio
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Build, research and prepare
              work for your leads.
            </p>
          </div>

          <Link
            to="/studio/new"
            search={{
              leadId: undefined,
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
              px-3.5
              text-sm
              font-semibold
              text-primary-foreground
              transition
              hover:bg-primary/90
              sm:px-4
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
        </header>

        {/* SEARCH */}

        <div className="relative mt-5">
          <Search
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              size-4
              -translate-y-1/2
              text-muted-foreground
            "
          />

          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Search Studio tools..."
            className="
              h-11
              w-full
              rounded-xl
              border
              border-border
              bg-card
              pl-10
              pr-10
              text-sm
              text-foreground
              outline-none
              transition
              placeholder:text-muted-foreground
              focus:border-primary/50
              focus:ring-2
              focus:ring-primary/10
            "
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() =>
                setSearchQuery("")
              }
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                rounded-lg
                p-1
                text-muted-foreground
                transition
                hover:text-foreground
              "
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* QUICK PROJECTS */}

        {filteredQuickProjects.length >
          0 && (
          <section className="mt-6">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Quick projects
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Start the work you need
                right now.
              </p>
            </div>

            <div
              className="
                grid
                gap-3
                sm:grid-cols-3
              "
            >
              {filteredQuickProjects.map(
                (tool) => (
                  <ProjectCard
                    key={tool.href}
                    tool={tool}
                  />
                ),
              )}
            </div>
          </section>
        )}

        {/* STUDIO TOOLS */}

        {filteredTools.length > 0 && (
          <section className="mt-7">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Tools
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Content, research and
                workflow tools.
              </p>
            </div>

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-border
                bg-card
              "
            >
              {filteredTools.map(
                (tool, index) => (
                  <Link
                    key={tool.href}
                    to={tool.href}
                    className={`
                      group
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3.5
                      transition
                      hover:bg-muted/40

                      ${
                        index > 0
                          ? "border-t border-border"
                          : ""
                      }
                    `}
                  >
                    <span
                      className="
                        flex
                        size-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-primary/10
                        text-primary
                      "
                    >
                      <tool.icon className="size-[17px]" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {tool.title}
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {
                          tool.description
                        }
                      </span>
                    </span>

                    <span
                      className="
                        hidden
                        rounded-full
                        bg-muted
                        px-2
                        py-1
                        text-[10px]
                        font-medium
                        text-muted-foreground
                        sm:inline
                      "
                    >
                      {tool.category}
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
                ),
              )}
            </div>
          </section>
        )}

        {/* NOTHING FOUND */}

        {!hasResults && (
          <div
            className="
              mt-6
              flex
              min-h-[200px]
              flex-col
              items-center
              justify-center
              rounded-2xl
              border
              border-dashed
              border-border
              px-5
              text-center
            "
          >
            <Search className="size-5 text-muted-foreground" />

            <h2 className="mt-3 text-sm font-semibold text-foreground">
              No tools found
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Try another search.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
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
        flex
        min-h-[142px]
        flex-col
        rounded-2xl
        border
        border-border
        bg-card
        p-4
        transition
        hover:border-primary/30
        hover:bg-muted/20
      "
    >
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-auto pt-4">
        <h3 className="text-sm font-semibold text-foreground">
          {tool.title}
        </h3>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}
