import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Plus, Trash2, ExternalLink, LayoutTemplate, Loader2,
  Globe, Code2, FileCode2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  listStudioProjects,
  deleteStudioProject,
  getStudioUsage,
  type StudioProject,
} from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({ meta: [{ title: "Studio — Kodarai" }] }),
  component: StudioPage,
});

const STATUS_CONFIG = {
  draft:    { label: "Draft",    cls: "bg-muted text-muted-foreground" },
  building: { label: "Building", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  live:     { label: "Live",     cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error:    { label: "Error",    cls: "bg-destructive/15 text-destructive" },
} as const;

function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runList = useServerFn(listStudioProjects);
  const runDelete = useServerFn(deleteStudioProject);
  const runUsage = useServerFn(getStudioUsage);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["studio-projects", user?.id],
    queryFn: () => runList({}),
    enabled: !!user,
  });

  const { data: usageData } = useQuery({
    queryKey: ["studio-usage", user?.id],
    queryFn: () => runUsage({}),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => runDelete({ data: { id } }),
    onSuccess: (res) => {
      if ("error" in res) { toast.error(res.error); return; }
      queryClient.invalidateQueries({ queryKey: ["studio-projects"] });
      queryClient.invalidateQueries({ queryKey: ["studio-usage"] });
      toast.success("Project deleted.");
    },
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const projects = projectsData?.projects ?? [];
  const usage = usageData;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build client websites with AI — describe it, generate it, deploy it.
            </p>
          </div>
          <Button asChild variant="hero" className="h-fit">
            <Link to="/studio/new" search={{ leadId: undefined }}>
              <Plus className="size-4" /> New project
            </Link>
          </Button>
        </div>

        {/* Usage bar */}
        {usage && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">AI messages this month</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {usage.messagesThisMonth} of {usage.messagesLimit === 9999 ? "∞" : usage.messagesLimit} used
                </p>
              </div>
              <div className="w-40 shrink-0">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: usage.messagesLimit === 9999
                        ? "10%"
                        : `${Math.min(100, (usage.messagesThisMonth / usage.messagesLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(id) => setConfirmDelete(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold">Delete project?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete the project and all its files, messages, and history.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(confirmDelete);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ProjectCard({ project, onDelete }: { project: StudioProject; onDelete: (id: string) => void }) {
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileCode2 className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {project.deployment_url && (
        <a
          href={project.deployment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 truncate text-xs text-emerald-600 hover:underline dark:text-emerald-400"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe className="size-3 shrink-0" />
          {project.deployment_url.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3 shrink-0" />
        </a>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          to="/studio/$projectId"
          params={{ projectId: project.id }}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Code2 className="size-3.5" /> Open builder
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(project.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <LayoutTemplate className="size-7 text-primary" />
      </div>
      <h3 className="mt-4 text-base font-semibold">No projects yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Build your first client site — describe what you want and the AI writes all the code.
      </p>
      <Button asChild variant="hero" className="mt-6 w-full sm:w-auto">
        <Link to="/studio/new" search={{ leadId: undefined }}>
          <Plus className="size-4" /> Build first site
        </Link>
      </Button>
    </div>
  );
}
