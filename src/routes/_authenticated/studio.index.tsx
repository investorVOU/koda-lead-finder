import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useServerFn } from "@tanstack/react-start";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FolderOpen,
  Globe2,
  Loader2,
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

import {
  listStudioProjects,
  type StudioProject,
} from "@/lib/studio.functions";

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
  const runListProjects =
    useServerFn(listStudioProjects);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    projects,
    setProjects,
  ] = useState<StudioProject[]>([]);

  const [
    projectsLoading,
    setProjectsLoading,
  ] = useState(true);

  const [
    projectsError,
    setProjectsError,
  ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProjects =
      async () => {
        setProjectsLoading(true);
        setProjectsError(null);

        try {
          const result =
            await runListProjects();

          if (cancelled) {
            return;
          }

          if ("error" in result) {
            setProjects([]);
            setProjectsError(
              result.error ||
                "Could not load your websites.",
            );
            return;
          }

          setProjects(
            result.projects ?? [],
          );
        } catch {
          if (cancelled) {
            return;
          }

          setProjects([]);
          setProjectsError(
            "Could not load your websites.",
          );
        } finally {
          if (!cancelled) {
            setProjectsLoading(
              false,
            );
          }
        }
      };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [runListProjects]);

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredProjects =
    useMemo(() => {
      if (!normalizedSearch) {
        return projects;
      }

      return projects.filter(
        (project) =>
          [
            project.name,
            project.description ?? "",
            project.template,
            project.status,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
          ),
      );
    }, [
      projects,
      normalizedSearch,
    ]);

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

  const filteredTools =
    useMemo(() => {
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
    filteredProjects.length > 0 ||
    filteredQuickProjects.length > 0 ||
    filteredTools.length > 0;

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl pb-8">
        {/* HEADER */}

        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Studio
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Your websites, content and
              client work in one place.
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
            placeholder="Search projects and Studio tools..."
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

        {/* YOUR WEBSITES */}

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your websites
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Continue working on websites
                you've already created.
              </p>
            </div>

            {!projectsLoading &&
              projects.length > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {projects.length}{" "}
                  {projects.length === 1
                    ? "project"
                    : "projects"}
                </span>
              )}
          </div>

          {projectsLoading ? (
            <ProjectSkeletons />
          ) : projectsError ? (
            <div
              className="
                flex
                min-h-[130px]
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
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Couldn't load your websites
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {projectsError}
                </p>
              </div>
            </div>
          ) : filteredProjects.length >
            0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map(
                (project) => (
                  <WebsiteProjectCard
                    key={project.id}
                    project={project}
                  />
                ),
              )}
            </div>
          ) : projects.length === 0 &&
            !normalizedSearch ? (
            <div
              className="
                flex
                min-h-[150px]
                items-center
                justify-between
                gap-5
                rounded-2xl
                border
                border-dashed
                border-border
                bg-card/40
                px-5
                py-5
              "
            >
              <div className="min-w-0">
                <div
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
                  <Globe2 className="size-5" />
                </div>

                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  No websites yet
                </h3>

                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  Websites you create from
                  Finder or Studio will appear
                  here so you can reopen them
                  anytime.
                </p>
              </div>

              <Link
                to="/studio/new"
                search={{
                  leadId: undefined,
                }}
                className="
                  inline-flex
                  h-9
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-primary
                  px-3
                  text-xs
                  font-semibold
                  text-primary-foreground
                  transition
                  hover:bg-primary/90
                "
              >
                <Plus className="size-3.5" />
                Create
              </Link>
            </div>
          ) : null}
        </section>

        {/* QUICK PROJECTS */}

        {filteredQuickProjects.length >
          0 && (
          <section className="mt-8">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Create
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Start new work in Studio.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {filteredQuickProjects.map(
                (tool) => (
                  <StudioActionCard
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
          <section className="mt-8">
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
                        {tool.description}
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

        {!projectsLoading &&
          normalizedSearch &&
          !hasResults && (
            <div
              className="
                mt-7
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
                Nothing found
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

function WebsiteProjectCard({
  project,
}: {
  project: StudioProject;
}) {
  const published =
    project.status === "published";

  const generating =
    project.status === "generating" ||
    project.status === "publishing";

  return (
    <Link
      to="/studio/$projectId"
      params={{
        projectId: project.id,
      }}
      className="
        group
        flex
        min-h-[170px]
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-card
        transition
        hover:border-primary/30
        hover:shadow-sm
      "
    >
      {/* PREVIEW AREA */}

      <div
        className="
          relative
          flex
          h-[86px]
          items-center
          justify-center
          overflow-hidden
          border-b
          border-border
          bg-muted/30
        "
      >
        <div
          className="
            absolute
            inset-x-5
            top-5
            h-16
            rounded-t-xl
            border
            border-border
            bg-background
            shadow-sm
          "
        >
          <div className="flex h-5 items-center gap-1 border-b border-border px-2">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-3 py-2">
            <div className="h-1.5 w-1/2 rounded-full bg-primary/25" />
            <div className="mt-1.5 h-1 w-3/4 rounded-full bg-muted" />
            <div className="mt-1 h-1 w-1/2 rounded-full bg-muted" />
          </div>
        </div>

        <span
          className="
            absolute
            right-2.5
            top-2.5
            rounded-full
            border
            border-border
            bg-card/90
            px-2
            py-1
            text-[10px]
            font-medium
            text-muted-foreground
            backdrop-blur
          "
        >
          {formatTemplateName(
            project.template,
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h3>

            {project.description && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>

          <ArrowRight
            className="
              mt-0.5
              size-4
              shrink-0
              text-muted-foreground
              transition-transform
              group-hover:translate-x-1
              group-hover:text-primary
            "
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <ProjectStatus
            status={project.status}
          />

          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock3 className="size-3" />
            {formatProjectDate(
              project.updated_at,
            )}
          </span>
        </div>

        {published &&
          project.deployment_url && (
            <a
              href={
                project.deployment_url
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="
                mt-3
                inline-flex
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-border
                px-3
                py-2
                text-xs
                font-medium
                text-muted-foreground
                transition
                hover:border-primary/30
                hover:text-primary
              "
            >
              <ExternalLink className="size-3.5" />
              View live site
            </a>
          )}

        {generating && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Kodarai is working on this
            project
          </div>
        )}
      </div>
    </Link>
  );
}

function ProjectStatus({
  status,
}: {
  status: StudioProject["status"];
}) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
        <CheckCircle2 className="size-3" />
        Published
      </span>
    );
  }

  if (
    status === "generating" ||
    status === "publishing"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {status === "publishing"
          ? "Publishing"
          : "Generating"}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-destructive">
        <span className="size-1.5 rounded-full bg-destructive" />
        Failed
      </span>
    );
  }

  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
        <span className="size-1.5 rounded-full bg-primary" />
        Ready
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      Draft
    </span>
  );
}

function StudioActionCard({
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
        min-h-[136px]
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

function ProjectSkeletons() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="h-[86px] animate-pulse bg-muted/50" />

          <div className="p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />

            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />

            <div className="mt-7 flex justify-between">
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />

              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTemplateName(
  template?: string | null,
) {
  if (!template) {
    return "Website";
  }

  return template
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatProjectDate(
  value?: string | null,
) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Recently";
  }

  const now = new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const minutes =
    Math.floor(
      difference / 60_000,
    );

  const hours =
    Math.floor(
      difference / 3_600_000,
    );

  const days =
    Math.floor(
      difference / 86_400_000,
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
}
