import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { formatDistanceToNow } from "date-fns";

import { toast } from "sonner";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  File,
  FileCode,
  FileJson,
  FileType2,
  Folder,
  FolderOpen,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Rocket,
  Save,
  Send,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { StudioLivePreview } from "@/components/studio/StudioLivePreview";

import { StudioHosting } from "@/components/studio/StudioHosting";

import { useAuth } from "@/lib/auth";

import { supabase } from "@/integrations/supabase/client";

import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder";

import { useIsMobile } from "@/hooks/use-mobile";

import {
  createStudioMessage,
  createStudioSnapshot,
  deployBusinessWebsite,
  getBusinessWebsiteDeploymentStatus,
  getStudioProject,
  listStudioMessages,
  listStudioSnapshots,
  saveStudioFiles,
  undoLastBusinessWebsiteEdit,
  updateStudioProject,
  type StudioMessage,
  type StudioSnapshot,
} from "@/lib/studio.functions";

import {
  applyBusinessWebsiteEdit,
  generateBusinessWebsite,
} from "@/lib/studio-builder-v2.functions";

import {
  fromStudioFileMap,
  isSafeStudioPath,
  parseStudioFiles,
  toStudioFileMap,
} from "@/lib/studio-files";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export const Route = createFileRoute("/_authenticated/studio/$projectId")({
  head: () => ({
    meta: [
      {
        title: "Studio Builder — Kodarai",
      },
    ],
  }),

  validateSearch: (search: Record<string, unknown>) => ({
    generate: search.generate === "1" ? "1" : undefined,
  }),

  component: StudioBuilder,
});

type MobileTab = "chat" | "code" | "preview" | "deploy";

type FileAction = "create" | "update" | "delete";

type FileChange = {
  path: string;

  action: FileAction;

  content: string;
};

type StreamEvent =
  | {
      type: "progress";
    }
  | {
      type: "text";

      text: string;
    }
  | {
      type: "files";

      fileChanges: FileChange[];
    }
  | {
      type: "done";

      summary?: string;

      fileChanges?: FileChange[];
    }
  | {
      type: "error";

      error: string;
    };

type TreeNode = {
  name: string;

  path: string;

  kind: "file" | "folder";

  children: TreeNode[];
};

const REQUIRED_FILES = new Set(["index.html", "package.json", "src/main.jsx", "src/App.jsx"]);

const CHAT_PLACEHOLDERS = [
  "Make the hero feel more premium...",
  "Add a gallery section...",
  "Change the color scheme...",
  "Improve the mobile layout...",
  "Add a WhatsApp call to action...",
];

const QUICK_ACTIONS = [
  "Make the hero section more modern",
  "Add a contact form",
  "Change the color scheme",
  "Add a gallery section",
];

function applyStructuredChanges(
  current: Record<string, string>,

  changes: FileChange[],
) {
  const next = {
    ...current,
  };

  for (const change of changes) {
    if (change.action === "delete") {
      delete next[change.path];
    } else {
      next[change.path] = change.content;
    }
  }

  return next;
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const fullPath of [...paths].sort()) {
    const parts = fullPath.split("/");

    let level = root;

    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const isFile = index === parts.length - 1;

      let node = level.find(
        (item) => item.name === part && item.kind === (isFile ? "file" : "folder"),
      );

      if (!node) {
        node = {
          name: part,

          path: currentPath,

          kind: isFile ? "file" : "folder",

          children: [],
        };

        level.push(node);
      }

      level = node.children;
    });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    nodes.forEach((node) => sort(node.children));
  };

  sort(root);

  return root;
}

function StudioBuilder() {
  const { projectId } = useParams({
    from: "/_authenticated/studio/$projectId",
  });

  const { generate } = useSearch({
    from: "/_authenticated/studio/$projectId",
  });

  const navigate = useNavigate();

  const { user } = useAuth();

  const isMobile = useIsMobile();

  const queryClient = useQueryClient();

  const runGetProject = useServerFn(getStudioProject);

  const runListMessages = useServerFn(listStudioMessages);

  const runListSnapshots = useServerFn(listStudioSnapshots);

  const runCreateMessage = useServerFn(createStudioMessage);

  const runCreateSnapshot = useServerFn(createStudioSnapshot);

  const runUpdateProject = useServerFn(updateStudioProject);

  const runSaveFiles = useServerFn(saveStudioFiles);

  const runUndo = useServerFn(undoLastBusinessWebsiteEdit);

  const runGenerateWebsite = useServerFn(generateBusinessWebsite);

  const runEditWebsite = useServerFn(applyBusinessWebsiteEdit);

  const runDeploy = useServerFn(deployBusinessWebsite);

  const runDeploymentStatus = useServerFn(getBusinessWebsiteDeploymentStatus);

  const { data: projectResponse } = useQuery({
    queryKey: ["studio-project", projectId],

    queryFn: () =>
      runGetProject({
        data: {
          id: projectId,
        },
      }),

    enabled: Boolean(user && projectId),
  });

  const project = projectResponse && "project" in projectResponse ? projectResponse.project : null;

  const {
    data: messageResponse,

    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["studio-messages", projectId],

    queryFn: () =>
      runListMessages({
        data: {
          project_id: projectId,
        },
      }),

    enabled: Boolean(user && projectId),
  });

  const messages: StudioMessage[] = messageResponse?.messages ?? [];

  const {
    data: snapshotResponse,

    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: ["studio-snapshots", projectId],

    queryFn: () =>
      runListSnapshots({
        data: {
          project_id: projectId,
        },
      }),

    enabled: Boolean(user && projectId),
  });

  const snapshots: StudioSnapshot[] = snapshotResponse?.snapshots ?? [];

  const [files, setFiles] = useState<Record<string, string>>({});

  const [projectName, setProjectName] = useState("");

  const [editingName, setEditingName] = useState(false);

  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const [openFiles, setOpenFiles] = useState<string[]>([]);

  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const [filesOpen, setFilesOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [showDeploy, setShowDeploy] = useState(false);

  const [showHosting, setShowHosting] = useState(false);

  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const [deploySuccessUrl, setDeploySuccessUrl] = useState<string | null>(null);

  const [optimisticMessages, setOptimisticMessages] = useState<StudioMessage[]>([]);

  const allMessages = [...messages, ...optimisticMessages];

  const fileCount = Object.keys(files).length;

  const reactProject = Boolean(files["src/App.jsx"]);

  const kodaraiWebsite = Boolean(reactProject || project?.template === "business-website");

  const previewUrl = `/studio/preview/${projectId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!project) {
      return;
    }

    if (!editingName) {
      setProjectName(project.name);
    }

    setDeploymentUrl(project.deployment_url ?? null);

    const mapped = toStudioFileMap(parseStudioFiles(project.files_json));

    setFiles(mapped);

    const paths = Object.keys(mapped);

    if (paths.length === 0) {
      return;
    }

    const preferred = paths.includes("src/App.jsx")
      ? "src/App.jsx"
      : paths.includes("index.html")
        ? "index.html"
        : paths[0];

    setCurrentFile((current) => (current && paths.includes(current) ? current : preferred));

    const initialOpen = ["src/App.jsx", "src/data/site.js", "src/styles/global.css"].filter(
      (path) => paths.includes(path),
    );

    setOpenFiles((current) => {
      const valid = current.filter((path) => paths.includes(path));

      if (valid.length > 0) {
        return valid;
      }

      return initialOpen.length ? initialOpen : [preferred];
    });
  }, [project?.id, project?.files_json, project?.name, project?.deployment_url, editingName]);

  /*
   * Finder → Studio automatic generation
   */
  useEffect(
    () => {
      if (!project || project.generation_status === "ready" || isStreaming) {
        return;
      }

      if (project.template !== "business-website") {
        return;
      }

      if (generate !== "1" && project.generation_status !== "idle") {
        return;
      }

      let cancelled = false;

      setIsStreaming(true);

      runGenerateWebsite({
        data: {
          project_id: projectId,
        },
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          if ("error" in result) {
            toast.error(result.message);

            return;
          }

          const mapped = toStudioFileMap(result.files);

          setFiles(mapped);

          const paths = Object.keys(mapped);

          const preferred = paths.includes("src/App.jsx") ? "src/App.jsx" : paths[0];

          if (preferred) {
            setCurrentFile(preferred);
          }

          setOpenFiles(
            ["src/App.jsx", "src/data/site.js", "src/styles/global.css"].filter((path) =>
              paths.includes(path),
            ),
          );

          if (isMobile) {
            setMobileTab("preview");
          }

          const remaining = result.studioCredits?.remaining;

          toast.success(
            remaining === null
              ? "Website ready — Studio credits are unlimited."
              : typeof remaining === "number"
                ? `Website ready — ${result.studioCredits.charged} Studio credits used. ${remaining} remaining.`
                : "Website ready.",
          );

          queryClient.invalidateQueries({
            queryKey: ["studio-project", projectId],
          });

          void refetchMessages();
        })
        .catch(() => {
          if (!cancelled) {
            toast.error("Website generation failed.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsStreaming(false);
          }
        });

      return () => {
        cancelled = true;
      };
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generate, project?.id, project?.generation_status],
  );

  const saveProjectName = async () => {
    setEditingName(false);

    const value = projectName.trim();

    if (!value || value === project?.name) {
      return;
    }

    await runUpdateProject({
      data: {
        id: projectId,

        name: value,
      },
    });

    queryClient.invalidateQueries({
      queryKey: ["studio-project", projectId],
    });
  };

  const selectFile = (path: string) => {
    setCurrentFile(path);

    setOpenFiles((current) => (current.includes(path) ? current : [...current, path]));

    if (isMobile) {
      setFilesOpen(false);

      setMobileTab("code");
    }
  };

  const closeFile = (
    event: ReactMouseEvent<HTMLElement>,

    path: string,
  ) => {
    event.stopPropagation();

    setOpenFiles((current) => {
      const next = current.filter((item) => item !== path);

      if (currentFile === path) {
        setCurrentFile(next[next.length - 1] ?? null);
      }

      return next;
    });
  };

  const createFile = () => {
    const path = window.prompt("New file path", "src/components/NewSection.jsx")?.trim();

    if (!path) {
      return;
    }

    if (!isSafeStudioPath(path) || files[path] !== undefined) {
      toast.error("Use a new safe relative file path.");

      return;
    }

    setFiles((current) => ({
      ...current,

      [path]: "",
    }));

    selectFile(path);
  };

  const deleteFile = (path: string) => {
    if (REQUIRED_FILES.has(path)) {
      toast.error(`${path} is required.`);

      return;
    }

    if (!window.confirm(`Delete ${path}?`)) {
      return;
    }

    setFiles((current) => {
      const next = {
        ...current,
      };

      delete next[path];

      return next;
    });
  };

  const renameFile = (path: string) => {
    if (REQUIRED_FILES.has(path)) {
      toast.error(`${path} cannot be renamed.`);

      return;
    }

    const nextPath = window.prompt("Rename file", path)?.trim();

    if (!nextPath || nextPath === path) {
      return;
    }

    if (!isSafeStudioPath(nextPath) || files[nextPath] !== undefined) {
      toast.error("Use a safe new file path.");

      return;
    }

    setFiles((current) => {
      const next = {
        ...current,

        [nextPath]: current[path],
      };

      delete next[path];

      return next;
    });

    if (currentFile === path) {
      setCurrentFile(nextPath);
    }
  };

  const saveFiles = async () => {
    setIsSaving(true);

    try {
      const result = await runSaveFiles({
        data: {
          project_id: projectId,

          files: fromStudioFileMap(files),
        },
      });

      if ("error" in result) {
        toast.error(result.message);

        return;
      }

      toast.success("Project saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const undoEdit = async () => {
    const result = await runUndo({
      data: {
        project_id: projectId,
      },
    });

    if ("error" in result) {
      toast.error(result.message);

      return;
    }

    setFiles(toStudioFileMap(result.files));

    toast.success("Last AI edit undone.");

    void refetchSnapshots();
  };

  const handleSend = async (prompt: string) => {
    const clean = prompt.trim();

    if (!clean || isStreaming) {
      return;
    }

    if (kodaraiWebsite) {
      setIsStreaming(true);

      try {
        const result =
          fileCount === 0
            ? await runGenerateWebsite({
                data: {
                  project_id: projectId,
                },
              })
            : await runEditWebsite({
                data: {
                  project_id: projectId,

                  request: clean,
                },
              });

        if ("error" in result) {
          toast.error(result.message);

          return;
        }

        setFiles(toStudioFileMap(result.files));

        toast.success("summary" in result ? "Website updated." : "Website generated.");

        void refetchMessages();

        void refetchSnapshots();

        return;
      } finally {
        setIsStreaming(false);
      }
    }

    /*
     * Generic legacy Studio flow.
     */
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Not authenticated.");

      return;
    }

    const userMessage: StudioMessage = {
      id: `tmp-${Date.now()}`,

      project_id: projectId,

      role: "user",

      content: clean,

      file_changes: null,

      created_at: new Date().toISOString(),
    };

    setOptimisticMessages((current) => [...current, userMessage]);

    await runCreateMessage({
      data: {
        project_id: projectId,

        role: "user",

        content: clean,
      },
    });

    setIsStreaming(true);

    try {
      const response = await fetch("/api/studio/generate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          projectId,

          files,

          currentFile,

          messages: messages.slice(-10).map((message) => ({
            role: message.role,

            content: message.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Generation failed.");
      }

      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";

      let responseText = "";

      let changes: FileChange[] = [];

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");

        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          let event: StreamEvent;

          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "text") {
            responseText = event.text;
          }

          if (event.type === "files") {
            changes = event.fileChanges;
          }

          if (event.type === "done") {
            responseText = event.summary ?? responseText;

            changes = event.fileChanges ?? changes;
          }
        }
      }

      const next = applyStructuredChanges(files, changes);

      setFiles(next);

      await runCreateMessage({
        data: {
          project_id: projectId,

          role: "assistant",

          content: responseText || "Done.",

          file_changes: changes.length ? JSON.stringify(changes) : null,
        },
      });

      await runCreateSnapshot({
        data: {
          project_id: projectId,

          label: clean.slice(0, 80),

          files_json: JSON.stringify(next),

          files_count: Object.keys(next).length,
        },
      });

      void refetchMessages();

      void refetchSnapshots();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Studio generation failed.");
    } finally {
      setIsStreaming(false);

      setOptimisticMessages([]);
    }
  };

  if (!project) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#080b0d]">
        <Loader2 className="size-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#080b0d] text-zinc-100">
      {/* HEADER */}

      <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-3 sm:h-[82px] sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/studio",
              })
            }
            className="flex size-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 hover:bg-white/[0.04] hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="hidden size-10 items-center justify-center rounded-xl bg-emerald-500 font-bold text-[#04120c] sm:flex">
            K°
          </div>

          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  value={projectName}
                  autoFocus
                  onChange={(event) => setProjectName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void saveProjectName();
                    }
                  }}
                  className="h-9 w-[180px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
                />

                <button
                  onClick={() => void saveProjectName()}
                  className="flex size-8 items-center justify-center text-emerald-400"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="group flex max-w-[210px] items-center gap-2"
              >
                <span className="truncate text-sm font-semibold">{projectName}</span>

                <Pencil className="size-3 text-zinc-700 group-hover:text-zinc-400" />
              </button>
            )}

            <p className="mt-1 text-[10px] text-zinc-600">
              {isStreaming
                ? "KodarAI is working"
                : deploymentUrl
                  ? "Live website"
                  : "Draft project"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* NEW EXTERNAL PREVIEW */}

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 text-xs text-zinc-400 transition hover:bg-white/[0.04] hover:text-white sm:flex"
          >
            <Eye className="size-3.5" />
            Preview
            <ExternalLink className="size-3" />
          </a>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void saveFiles()}
            disabled={isSaving}
            className="h-9 border-white/[0.07] bg-transparent"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}

            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowHosting(true)}
            className="h-9 bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
          >
            <Rocket className="size-3.5" />

            <span className="hidden sm:inline">Hosting</span>
          </Button>
        </div>
      </header>

      {isMobile ? (
        <MobileStudio
          files={files}
          currentFile={currentFile}
          openFiles={openFiles}
          tab={mobileTab}
          filesOpen={filesOpen}
          messages={allMessages}
          isStreaming={isStreaming}
          mounted={mounted}
          deploymentUrl={deploymentUrl}
          projectId={projectId}
          deploymentStatus={project?.deployment_status}
          customDomain={project?.custom_domain}
          customDomainStatus={project?.custom_domain_status}
          customDomainVerified={project?.custom_domain_verified}
          customDomainManagementAllowed={Boolean(
            projectResponse &&
            "customDomainManagementAllowed" in projectResponse &&
            projectResponse.customDomainManagementAllowed,
          )}
          onHostingChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["studio-project", projectId] })
          }
          reactProject={reactProject}
          previewUrl={previewUrl}
          onTabChange={setMobileTab}
          onToggleFiles={() => setFilesOpen((current) => !current)}
          onCloseFiles={() => setFilesOpen(false)}
          onSelectFile={selectFile}
          onCloseFile={closeFile}
          onChangeFile={(path, content) =>
            setFiles((current) => ({
              ...current,

              [path]: content,
            }))
          }
          onCreateFile={createFile}
          onDeleteFile={deleteFile}
          onRenameFile={renameFile}
          onSend={handleSend}
          onDeploy={() => setShowDeploy(true)}
          onUndo={undoEdit}
        />
      ) : (
        <DesktopStudio
          files={files}
          currentFile={currentFile}
          openFiles={openFiles}
          messages={allMessages}
          snapshots={snapshots}
          isStreaming={isStreaming}
          mounted={mounted}
          deploymentUrl={deploymentUrl}
          onSelectFile={selectFile}
          onCloseFile={closeFile}
          onChangeFile={(path, content) =>
            setFiles((current) => ({
              ...current,

              [path]: content,
            }))
          }
          onCreateFile={createFile}
          onDeleteFile={deleteFile}
          onRenameFile={renameFile}
          onSend={handleSend}
          onDeploy={() => setShowDeploy(true)}
        />
      )}

      {showDeploy && (
        <DeployDialog
          projectId={projectId}
          projectName={projectName}
          fileCount={fileCount}
          runDeploy={runDeploy}
          runDeploymentStatus={runDeploymentStatus}
          onClose={() => setShowDeploy(false)}
          onReady={(url) => {
            setDeploymentUrl(url);

            setShowDeploy(false);

            setDeploySuccessUrl(url);

            setMobileTab("deploy");

            queryClient.invalidateQueries({
              queryKey: ["studio-project", projectId],
            });
          }}
        />
      )}

      {showHosting && (
        <ModalBackdrop onClose={() => setShowHosting(false)}>
          <div className="h-[min(820px,92vh)] w-full max-w-2xl overflow-hidden border border-white/[0.08] bg-[#0b0e11] shadow-2xl sm:rounded-[20px]">
            <StudioHosting
              projectId={projectId}
              deploymentUrl={deploymentUrl}
              deploymentStatus={project?.deployment_status}
              customDomain={project?.custom_domain}
              customDomainStatus={project?.custom_domain_status}
              customDomainVerified={project?.custom_domain_verified}
              managementAllowed={Boolean(
                projectResponse &&
                "customDomainManagementAllowed" in projectResponse &&
                projectResponse.customDomainManagementAllowed,
              )}
              fileCount={fileCount}
              onDeploy={() => {
                setShowHosting(false);
                setShowDeploy(true);
              }}
              onChanged={() =>
                queryClient.invalidateQueries({ queryKey: ["studio-project", projectId] })
              }
            />
          </div>
        </ModalBackdrop>
      )}

      {deploySuccessUrl && (
        <DeploymentSuccessDialog url={deploySuccessUrl} onClose={() => setDeploySuccessUrl(null)} />
      )}
    </div>
  );
}

/*
 * Desktop Studio
 */

function DesktopStudio({
  files,
  currentFile,
  openFiles,
  messages,
  snapshots,
  isStreaming,
  mounted,
  deploymentUrl,
  onSelectFile,
  onCloseFile,
  onChangeFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onDeploy,
}: {
  files: Record<string, string>;

  currentFile: string | null;

  openFiles: string[];

  messages: StudioMessage[];

  snapshots: StudioSnapshot[];

  isStreaming: boolean;

  mounted: boolean;

  deploymentUrl: string | null;

  onSelectFile: (path: string) => void;

  onCloseFile: (
    event: ReactMouseEvent<HTMLElement>,

    path: string,
  ) => void;

  onChangeFile: (
    path: string,

    content: string,
  ) => void;

  onCreateFile: () => void;

  onDeleteFile: (path: string) => void;

  onRenameFile: (path: string) => void;

  onSend: (value: string) => void;

  onDeploy: () => void;
}) {
  const [sidebar, setSidebar] = useState<"files" | "chat" | "history">("files");

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(360px,1fr)_minmax(400px,0.95fr)] overflow-hidden">
      <aside className="flex min-h-0 flex-col border-r border-white/[0.06] bg-[#0b0e11]">
        <div className="flex h-11 border-b border-white/[0.06] p-1.5">
          {(
            [
              ["files", "Files"],

              ["chat", "Chat"],

              ["history", "History"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSidebar(id)}
              className={`flex-1 rounded-lg text-[11px] ${
                sidebar === id ? "bg-white/[0.07] text-white" : "text-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sidebar === "files" && (
          <FileExplorer
            files={files}
            currentFile={currentFile}
            onSelect={onSelectFile}
            onCreate={onCreateFile}
            onDelete={onDeleteFile}
            onRename={onRenameFile}
          />
        )}

        {sidebar === "chat" && (
          <ChatPanel messages={messages} isStreaming={isStreaming} onSend={onSend} />
        )}

        {sidebar === "history" && <HistoryPanel snapshots={snapshots} />}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col border-r border-white/[0.06]">
        <EditorTabs
          openFiles={openFiles}
          currentFile={currentFile}
          onSelect={onSelectFile}
          onClose={onCloseFile}
        />

        <CodeEditor
          files={files}
          currentFile={currentFile}
          mounted={mounted}
          onChange={onChangeFile}
        />
      </section>

      <section className="min-h-0">
        <StudioLivePreview
          files={files}
          deploymentUrl={deploymentUrl}
          fileCount={Object.keys(files).length}
          onDeploy={onDeploy}
        />
      </section>
    </div>
  );
}

/*
 * Mobile Studio
 */

function MobileStudio({
  files,
  currentFile,
  openFiles,
  tab,
  filesOpen,
  messages,
  isStreaming,
  mounted,
  deploymentUrl,
  projectId,
  deploymentStatus,
  customDomain,
  customDomainStatus,
  customDomainVerified,
  customDomainManagementAllowed,
  onHostingChanged,
  previewUrl,
  onTabChange,
  onToggleFiles,
  onCloseFiles,
  onSelectFile,
  onCloseFile,
  onChangeFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onSend,
  onDeploy,
  onUndo,
}: {
  files: Record<string, string>;

  currentFile: string | null;

  openFiles: string[];

  tab: MobileTab;

  filesOpen: boolean;

  messages: StudioMessage[];

  isStreaming: boolean;

  mounted: boolean;

  deploymentUrl: string | null;

  projectId: string;

  deploymentStatus?: string;

  customDomain?: string | null;

  customDomainStatus?: "pending" | "configuring" | "connected" | "error" | null;

  customDomainVerified?: boolean;

  customDomainManagementAllowed: boolean;

  onHostingChanged: () => void;

  reactProject: boolean;

  previewUrl: string;

  onTabChange: (value: MobileTab) => void;

  onToggleFiles: () => void;

  onCloseFiles: () => void;

  onSelectFile: (path: string) => void;

  onCloseFile: (
    event: ReactMouseEvent<HTMLElement>,

    path: string,
  ) => void;

  onChangeFile: (
    path: string,

    content: string,
  ) => void;

  onCreateFile: () => void;

  onDeleteFile: (path: string) => void;

  onRenameFile: (path: string) => void;

  onSend: (value: string) => void;

  onDeploy: () => void;

  onUndo: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="grid h-16 shrink-0 grid-cols-4 border-b border-white/[0.06]">
        <MobileTabButton
          active={tab === "chat"}
          icon={MessageSquare}
          label="Chat"
          onClick={() => onTabChange("chat")}
        />

        <MobileTabButton
          active={tab === "code"}
          icon={Code2}
          label="Code"
          onClick={() => onTabChange("code")}
        />

        <MobileTabButton
          active={tab === "preview"}
          icon={Eye}
          label="Preview"
          onClick={() => onTabChange("preview")}
        />

        <MobileTabButton
          active={tab === "deploy"}
          icon={Rocket}
          label="Hosting"
          onClick={() => onTabChange("deploy")}
        />
      </nav>

      <div className="relative min-h-0 flex-1">
        {tab === "chat" && (
          <ChatPanel messages={messages} isStreaming={isStreaming} onSend={onSend} />
        )}

        {tab === "preview" && (
          <div className="flex h-full flex-col">
            <div className="flex h-11 shrink-0 items-center justify-end border-b border-white/[0.06] px-3">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400"
              >
                Open full preview
                <ExternalLink className="size-3" />
              </a>
            </div>

            <StudioLivePreview
              files={files}
              deploymentUrl={deploymentUrl}
              fileCount={Object.keys(files).length}
              onDeploy={onDeploy}
            />
          </div>
        )}

        {tab === "deploy" && (
          <DeployTab
            projectId={projectId}
            deploymentUrl={deploymentUrl}
            deploymentStatus={deploymentStatus}
            customDomain={customDomain}
            customDomainStatus={customDomainStatus}
            customDomainVerified={customDomainVerified}
            customDomainManagementAllowed={customDomainManagementAllowed}
            fileCount={Object.keys(files).length}
            onDeploy={onDeploy}
            onHostingChanged={onHostingChanged}
          />
        )}

        {tab === "code" && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-11 shrink-0 items-center border-b border-white/[0.06] px-2">
              <button
                onClick={onToggleFiles}
                className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.06] px-3 text-[11px] text-zinc-400"
              >
                <Folder className="size-3.5 text-blue-400" />
                Files
              </button>

              <button type="button" onClick={onUndo} className="ml-auto text-[10px] text-zinc-600">
                Undo
              </button>
            </div>

            <EditorTabs
              openFiles={openFiles}
              currentFile={currentFile}
              onSelect={onSelectFile}
              onClose={onCloseFile}
            />

            <CodeEditor
              files={files}
              currentFile={currentFile}
              mounted={mounted}
              onChange={onChangeFile}
            />

            {filesOpen && (
              <div className="absolute inset-0 z-30 bg-black/70 p-2">
                <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0b0e11]">
                  <div className="flex h-12 items-center justify-between border-b border-white/[0.06] px-4">
                    <span className="text-sm font-semibold">Files</span>

                    <div className="flex">
                      <button
                        onClick={onCreateFile}
                        className="flex size-8 items-center justify-center text-zinc-500"
                      >
                        <Plus className="size-4" />
                      </button>

                      <button
                        onClick={onCloseFiles}
                        className="flex size-8 items-center justify-center text-zinc-500"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <FileExplorer
                    files={files}
                    currentFile={currentFile}
                    onSelect={onSelectFile}
                    onCreate={onCreateFile}
                    onDelete={onDeleteFile}
                    onRename={onRenameFile}
                    hideHeader
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;

  icon: typeof Eye;

  label: string;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 text-[10px] ${
        active ? "text-emerald-400" : "text-zinc-600"
      }`}
    >
      <Icon className="size-[18px]" />

      {label}

      {active && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-emerald-400" />}
    </button>
  );
}

/*
 * Deploy tab
 */

function DeployTab({
  projectId,
  deploymentUrl,
  deploymentStatus,
  customDomain,
  customDomainStatus,
  customDomainVerified,
  customDomainManagementAllowed,
  fileCount,
  onDeploy,
  onHostingChanged,
}: {
  projectId: string;

  deploymentUrl: string | null;

  deploymentStatus?: string;

  customDomain?: string | null;

  customDomainStatus?: "pending" | "configuring" | "connected" | "error" | null;

  customDomainVerified?: boolean;

  customDomainManagementAllowed: boolean;

  fileCount: number;

  onDeploy: () => void;

  onHostingChanged: () => void;
}) {
  return (
    <StudioHosting
      projectId={projectId}
      deploymentUrl={deploymentUrl}
      deploymentStatus={deploymentStatus}
      customDomain={customDomain}
      customDomainStatus={customDomainStatus}
      customDomainVerified={customDomainVerified}
      managementAllowed={customDomainManagementAllowed}
      fileCount={fileCount}
      onDeploy={onDeploy}
      onChanged={onHostingChanged}
    />
  );

  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!deploymentUrl) {
      return;
    }

    await navigator.clipboard.writeText(deploymentUrl);

    setCopied(true);

    toast.success("Link copied");

    window.setTimeout(() => setCopied(false), 1500);
  };

  if (deploymentUrl) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto bg-[#0b0e11] p-5">
        <div className="w-full max-w-[360px]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-7 text-emerald-400" />
          </div>

          <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Live
          </p>

          <h2 className="mt-2 text-center text-2xl font-semibold tracking-[-0.04em]">
            Your website is published
          </h2>

          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
            <p className="break-all font-mono text-[11px] leading-5 text-zinc-400">
              {deploymentUrl}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => void copy()}
              className="h-11 border-white/[0.08] bg-transparent"
            >
              {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}

              {copied ? "Copied" : "Copy link"}
            </Button>

            <Button
              asChild
              className="h-11 bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
            >
              <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                Open site
              </a>
            </Button>
          </div>

          <button
            type="button"
            onClick={onDeploy}
            className="mt-5 w-full text-center text-xs text-zinc-600 transition hover:text-zinc-300"
          >
            Redeploy latest changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#0b0e11] p-5">
      <div className="w-full max-w-[340px] text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-[20px] border border-white/[0.07] bg-white/[0.03]">
          <Rocket className="size-7 text-zinc-300" />
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Ready to publish?</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Your project has {fileCount} files and is ready to go live.
        </p>

        <Button
          onClick={onDeploy}
          disabled={fileCount === 0}
          className="mt-6 h-12 w-full bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
        >
          <Rocket className="mr-2 size-4" />
          Publish to web
        </Button>
      </div>
    </div>
  );
}

/*
 * Chat
 */

function ChatPanel({
  messages,
  isStreaming,
  onSend,
}: {
  messages: StudioMessage[];

  isStreaming: boolean;

  onSend: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const placeholder = useAnimatedPlaceholder(CHAT_PLACEHOLDERS, 2600);

  const send = () => {
    const clean = value.trim();

    if (!clean || isStreaming) {
      return;
    }

    setValue("");

    onSend(clean);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <h2 className="text-lg font-semibold">Improve your website</h2>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Ask Kodarai to update any part of the project.
            </p>

            <div className="mt-5 space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => onSend(action)}
                  className="w-full rounded-xl border border-white/[0.07] px-3 py-2 text-left text-[11px] text-zinc-400 hover:bg-white/[0.03]"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-emerald-500/10 p-3 text-xs text-zinc-200"
                    : "max-w-[90%] whitespace-pre-wrap text-xs leading-5 text-zinc-400"
                }
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-2xl border border-white/[0.08] p-2">
          <Textarea
            value={value}
            disabled={isStreaming}
            placeholder={isStreaming ? "KodarAI is working…" : placeholder}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-[74px] resize-none border-0 bg-transparent focus-visible:ring-0"
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={send}
              disabled={isStreaming || !value.trim()}
              className="size-9 rounded-full bg-emerald-500 p-0 text-[#04120c]"
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * Files
 */

function FileExplorer({
  files,
  currentFile,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  hideHeader = false,
}: {
  files: Record<string, string>;

  currentFile: string | null;

  onSelect: (path: string) => void;

  onCreate: () => void;

  onDelete: (path: string) => void;

  onRename: (path: string) => void;

  hideHeader?: boolean;
}) {
  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideHeader && (
        <div className="flex h-10 items-center justify-between px-3">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">Files</span>

          <button
            onClick={onCreate}
            className="flex size-7 items-center justify-center text-zinc-600"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            currentFile={currentFile}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  currentFile,
  onSelect,
  onDelete,
  onRename,
}: {
  node: TreeNode;

  depth: number;

  currentFile: string | null;

  onSelect: (value: string) => void;

  onDelete: (value: string) => void;

  onRename: (value: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.kind === "folder") {
    return (
      <>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-full items-center text-[11px] text-zinc-500"
          style={{
            paddingLeft: `${8 + depth * 12}px`,
          }}
        >
          {open ? (
            <ChevronDown className="mr-1 size-3" />
          ) : (
            <ChevronRight className="mr-1 size-3" />
          )}

          {open ? (
            <FolderOpen className="mr-1.5 size-3.5 text-blue-400" />
          ) : (
            <Folder className="mr-1.5 size-3.5 text-blue-400" />
          )}

          {node.name}
        </button>

        {open &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              currentFile={currentFile}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
      </>
    );
  }

  return (
    <div
      className={`group flex h-8 items-center rounded-md pr-1 ${
        currentFile === node.path ? "bg-white/[0.07]" : ""
      }`}
      style={{
        paddingLeft: `${24 + depth * 12}px`,
      }}
    >
      <button onClick={() => onSelect(node.path)} className="flex min-w-0 flex-1 items-center">
        <FileIcon path={node.path} className="mr-1.5 size-3.5" />

        <span className="truncate font-mono text-[11px] text-zinc-500">{node.name}</span>
      </button>

      {!REQUIRED_FILES.has(node.path) && (
        <div className="hidden group-hover:flex">
          <button onClick={() => onRename(node.path)}>
            <Pencil className="size-3 text-zinc-600" />
          </button>

          <button onClick={() => onDelete(node.path)}>
            <X className="ml-1 size-3 text-zinc-600" />
          </button>
        </div>
      )}
    </div>
  );
}

/*
 * Editor
 */

function EditorTabs({
  openFiles,
  currentFile,
  onSelect,
  onClose,
}: {
  openFiles: string[];

  currentFile: string | null;

  onSelect: (value: string) => void;

  onClose: (
    event: ReactMouseEvent<HTMLElement>,

    path: string,
  ) => void;
}) {
  return (
    <div className="flex h-10 shrink-0 overflow-x-auto border-b border-white/[0.06]">
      {openFiles.map((path) => (
        <button
          key={path}
          onClick={() => onSelect(path)}
          className={`group flex h-full shrink-0 items-center border-r border-white/[0.05] px-3 font-mono text-[11px] ${
            currentFile === path ? "border-t border-t-emerald-400 text-white" : "text-zinc-600"
          }`}
        >
          <FileIcon path={path} className="mr-1.5 size-3.5" />

          {path.split("/").pop()}

          <span
            role="button"
            onClick={(event) => onClose(event, path)}
            className="ml-2 opacity-0 group-hover:opacity-100"
          >
            <X className="size-3" />
          </span>
        </button>
      ))}
    </div>
  );
}

function CodeEditor({
  files,
  currentFile,
  mounted,
  onChange,
}: {
  files: Record<string, string>;

  currentFile: string | null;

  mounted: boolean;

  onChange: (
    path: string,

    value: string,
  ) => void;
}) {
  if (!mounted || !currentFile) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Code2 className="size-8 text-zinc-800" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <Suspense fallback={<Loader2 className="m-auto size-5 animate-spin" />}>
        <MonacoEditor
          height="100%"
          path={currentFile}
          value={files[currentFile] ?? ""}
          onChange={(value) => onChange(currentFile, value ?? "")}
          theme="vs-dark"
          options={{
            minimap: {
              enabled: false,
            },

            automaticLayout: true,

            fontSize: 13,

            lineHeight: 23,

            scrollBeyondLastLine: false,
          }}
        />
      </Suspense>
    </div>
  );
}

function HistoryPanel({ snapshots }: { snapshots: StudioSnapshot[] }) {
  return (
    <div className="h-full overflow-y-auto p-3">
      {snapshots.map((snapshot) => (
        <div key={snapshot.id} className="mb-4 border-l border-white/[0.08] pl-3">
          <p className="text-[11px] text-zinc-400">{snapshot.label}</p>

          <p className="mt-1 text-[9px] text-zinc-700">
            {formatDistanceToNow(new Date(snapshot.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      ))}
    </div>
  );
}

function FileIcon({
  path,
  className = "",
}: {
  path: string;

  className?: string;
}) {
  if (/\.(jsx?|tsx?)$/i.test(path)) {
    return <FileCode className={`${className} text-cyan-400`} />;
  }

  if (path.endsWith(".json")) {
    return <FileJson className={`${className} text-amber-400`} />;
  }

  if (path.endsWith(".css")) {
    return <FileType2 className={`${className} text-blue-400`} />;
  }

  return <File className={`${className} text-zinc-500`} />;
}

/*
 * Deploy dialog
 */

function DeployDialog({
  projectId,
  projectName,
  fileCount,
  runDeploy,
  runDeploymentStatus,
  onClose,
  onReady,
}: {
  projectId: string;

  projectName: string;

  fileCount: number;

  runDeploy: (value: any) => Promise<any>;

  runDeploymentStatus: (value: any) => Promise<any>;

  onClose: () => void;

  onReady: (url: string) => void;
}) {
  const [publishing, setPublishing] = useState(false);

  const [checking, setChecking] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checking) {
      return;
    }

    let cancelled = false;

    const check = async () => {
      const result = await runDeploymentStatus({
        data: {
          project_id: projectId,
        },
      });

      if (cancelled) {
        return;
      }

      if ("error" in result) {
        setChecking(false);

        setError(result.message);

        return;
      }

      if (result.status === "ready" && result.url) {
        setChecking(false);

        onReady(result.url);

        return;
      }

      if (result.status === "error") {
        setChecking(false);

        setError(result.detail || "Deployment failed.");
      }
    };

    void check();

    const interval = window.setInterval(() => void check(), 4500);

    return () => {
      cancelled = true;

      window.clearInterval(interval);
    };
  }, [checking, projectId, runDeploymentStatus, onReady]);

  const deploy = async () => {
    setPublishing(true);

    setError(null);

    try {
      const result = await runDeploy({
        data: {
          project_id: projectId,
        },
      });

      if ("error" in result) {
        setError(result.message || "Deployment failed.");

        return;
      }

      if (result.status === "ready" && result.url) {
        onReady(result.url);

        return;
      }

      setChecking(true);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="w-full max-w-[430px] rounded-t-[24px] border border-white/[0.08] bg-[#101418] p-5 shadow-2xl sm:rounded-[20px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Publish website</h2>

            <p className="mt-1 text-xs text-zinc-500">{projectName}</p>
          </div>

          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center text-zinc-500"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.07] px-4 py-3">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Project files</span>

            <span>{fileCount}</span>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

        <Button
          onClick={() => void deploy()}
          disabled={publishing || checking}
          className="mt-5 h-11 w-full bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
        >
          {publishing || checking ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />

              {checking ? "Building website…" : "Publishing…"}
            </>
          ) : (
            <>
              <Rocket className="mr-2 size-4" />
              Publish website
            </>
          )}
        </Button>
      </div>
    </ModalBackdrop>
  );
}

/*
 * Deployment success popup
 */

function DeploymentSuccessDialog({
  url,
  onClose,
}: {
  url: string;

  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);

    setCopied(true);

    toast.success("Link copied");

    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="w-full max-w-[430px] rounded-t-[26px] border border-white/[0.08] bg-[#101418] p-5 shadow-2xl sm:rounded-[22px]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-6 text-emerald-400" />
        </div>

        <h2 className="mt-5 text-center text-xl font-semibold tracking-[-0.03em]">
          Website is live
        </h2>

        <p className="mt-2 text-center text-sm text-zinc-500">
          Your website was deployed successfully.
        </p>

        <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="break-all text-center font-mono text-[11px] leading-5 text-zinc-400">
            {url}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => void copy()}
            className="h-11 border-white/[0.08] bg-transparent"
          >
            {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}

            {copied ? "Copied" : "Copy link"}
          </Button>

          <Button
            asChild
            className="h-11 bg-emerald-500 font-semibold text-[#04120c] hover:bg-emerald-400"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-4" />
              Open website
            </a>
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-300"
        >
          Done
        </button>
      </div>
    </ModalBackdrop>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: ReactNode;

  onClose: () => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>,

    document.body,
  );
}
