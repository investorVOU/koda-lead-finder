import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, CheckCircle2, Share, Rocket, Terminal as TerminalIcon,
  MessageSquare, FolderGit2, History, Send, ExternalLink,
  FileCode, FileJson, FileType2, File, Globe, X, Loader2,
  Code2, Eye, RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useAnimatedPlaceholder } from "@/hooks/use-animated-placeholder";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getStudioProject,
  listStudioMessages,
  createStudioMessage,
  listStudioSnapshots,
  updateStudioProject,
  createStudioSnapshot,
  type StudioMessage,
  type StudioSnapshot,
} from "@/lib/studio.functions";

// Monaco editor — lazy loaded (SSR would crash)
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export const Route = createFileRoute("/_authenticated/studio/$projectId")({
  head: () => ({ meta: [{ title: "Studio Builder — Kodarai" }] }),
  component: Builder,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyFileChanges(current: Record<string, string>, xml: string): Record<string, string> {
  const result = { ...current };
  const regex = /<file\s+path="([^"]+)"\s+action="([^"]+)">([\s\S]*?)<\/file>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    const [, path, action, content] = m;
    if (action === "delete") {
      delete result[path];
    } else {
      result[path] = content.trim();
    }
  }
  return result;
}

function stripFileChanges(text: string): string {
  return text.replace(/<file_changes>[\s\S]*?<\/file_changes>/g, "").trim();
}

function fileChangesSummary(text: string): string | null {
  const match = text.match(/<file_changes>([\s\S]*?)<\/file_changes>/);
  if (!match) return null;
  return match[0].slice(0, 800);
}

const CHAT_PLACEHOLDERS = [
  "Ask Studio to build something...",
  "Add a dark mode toggle...",
  "Create a contact form with validation...",
  "Add a WhatsApp floating button...",
  "Build a services section with icons...",
  "Fix the layout on mobile...",
  "Make the header sticky on scroll...",
  "Add a Google Maps embed...",
];

// ─── Preview helpers ─────────────────────────────────────────────────────────

function buildPreviewDoc(files: Record<string, string>): string | null {
  const html = files["index.html"] || files["index.htm"];
  if (!html) return null;
  let doc = html.replace(
    /<link\s+[^>]*href="([^"?#]+\.css)"[^>]*\/?>/gi,
    (_, href: string) => {
      const key = href.replace(/^\.?\//, "");
      const css = files[key] || files[href];
      return css ? `<style>${css}</style>` : "";
    },
  );
  doc = doc.replace(
    /<script\s+[^>]*src="([^"?#]+\.js)"[^>]*><\/script>/gi,
    (_, src: string) => {
      const key = src.replace(/^\.?\//, "");
      const js = files[key] || files[src];
      return js ? `<script>${js}</script>` : "";
    },
  );
  return doc;
}

function LivePreview({
  files, deploymentUrl, onDeploy, fileCount,
}: {
  files: Record<string, string>;
  deploymentUrl: string | null;
  onDeploy: () => void;
  fileCount: number;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const previewDoc = buildPreviewDoc(files);

  // Auto-refresh when files change
  const filesJson = JSON.stringify(files);
  const prevFilesJson = useRef(filesJson);
  useEffect(() => {
    if (prevFilesJson.current !== filesJson) {
      prevFilesJson.current = filesJson;
      setRefreshKey((k) => k + 1);
    }
  }, [filesJson]);

  if (previewDoc) {
    return (
      <div className="relative flex-1 overflow-hidden bg-white">
        <iframe
          key={refreshKey}
          srcDoc={previewDoc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Site preview"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1 rounded border border-zinc-300/60 bg-white/80 px-2 py-1 text-[10px] text-zinc-500 backdrop-blur-sm transition-colors hover:text-zinc-900"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          {deploymentUrl && (
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-green-300/60 bg-white/80 px-2 py-1 text-[10px] text-green-600 backdrop-blur-sm transition-colors hover:text-green-800"
            >
              <ExternalLink className="w-3 h-3" /> Live
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 text-center">
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="relative z-10 max-w-[240px]">
        {deploymentUrl ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10">
              <Globe className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-zinc-50">Deployed</h3>
            <p className="mb-5 break-all font-mono text-xs text-zinc-500">{deploymentUrl.replace("https://", "")}</p>
            <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
              <Button className="h-8 w-full bg-zinc-50 text-xs text-zinc-950 hover:bg-zinc-200">
                <ExternalLink className="w-3 h-3 mr-1.5" /> Open live site
              </Button>
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl">
              <Globe className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-zinc-50">No preview yet</h3>
            <p className="mb-5 text-xs text-zinc-500">{fileCount > 0 ? `${fileCount} files ready — ask Studio to build index.html` : "Chat with Studio to generate files."}</p>
            <Button onClick={onDeploy} className="h-8 w-full bg-zinc-50 text-xs text-zinc-950 hover:bg-zinc-200">
              <Rocket className="w-3 h-3 mr-1.5" /> Deploy to Vercel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Builder() {
  const { projectId } = useParams({ from: "/_authenticated/studio/$projectId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const runGetProject    = useServerFn(getStudioProject);
  const runListMessages  = useServerFn(listStudioMessages);
  const runCreateMessage = useServerFn(createStudioMessage);
  const runListSnapshots = useServerFn(listStudioSnapshots);
  const runUpdateProject = useServerFn(updateStudioProject);
  const runCreateSnapshot = useServerFn(createStudioSnapshot);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: projectRes } = useQuery({
    queryKey: ["studio-project", projectId],
    queryFn: () => runGetProject({ data: { id: projectId } }),
    enabled: !!user && !!projectId,
  });
  const project = projectRes && "project" in projectRes ? projectRes.project : null;

  const { data: messagesRes, refetch: refetchMessages } = useQuery({
    queryKey: ["studio-messages", projectId],
    queryFn: () => runListMessages({ data: { project_id: projectId } }),
    enabled: !!user && !!projectId,
  });
  const messages: StudioMessage[] = messagesRes?.messages ?? [];

  const { data: snapshotsRes, refetch: refetchSnapshots } = useQuery({
    queryKey: ["studio-snapshots", projectId],
    queryFn: () => runListSnapshots({ data: { project_id: projectId } }),
    enabled: !!user && !!projectId,
  });
  const snapshots: StudioSnapshot[] = snapshotsRes?.snapshots ?? [];

  // ── Local state ─────────────────────────────────────────────────────────────
  const [projectName, setProjectName]     = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [files, setFiles]                 = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile]     = useState<string | null>(null);
  const [openFiles, setOpenFiles]         = useState<string[]>([]);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showDeploy, setShowDeploy]       = useState(false);
  const [mobileTab, setMobileTab]         = useState<"chat" | "code" | "preview">("chat");
  const [mounted, setMounted]             = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming]             = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<StudioMessage[]>([]);
  const allMessages = [...messages, ...optimisticMessages];

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!project) return;
    if (!isEditingName) setProjectName(project.name);
    if (project.deployment_url) setDeploymentUrl(project.deployment_url);
    try {
      const parsed = JSON.parse(project.files_json || "{}") as Record<string, string>;
      setFiles(parsed);
      const paths = Object.keys(parsed);
      if (paths.length > 0 && !currentFile) {
        setCurrentFile(paths[0]);
        setOpenFiles([paths[0]]);
      }
    } catch { setFiles({}); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.files_json, project?.name, project?.deployment_url]);

  // Pick up initial prompt from new-project page
  useEffect(() => {
    if (!projectId || !user || messages.length > 0 || isStreaming) return;
    const stored = sessionStorage.getItem(`studio_initial_prompt_${projectId}`);
    if (stored) {
      sessionStorage.removeItem(`studio_initial_prompt_${projectId}`);
      const t = setTimeout(() => handleSend(stored), 800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, messages.length]);

  // ── Name editing ────────────────────────────────────────────────────────────
  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (!projectName.trim() || projectName === project?.name) return;
    await runUpdateProject({ data: { id: projectId, name: projectName.trim() } });
    queryClient.invalidateQueries({ queryKey: ["studio-project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["studio-projects"] });
  };

  // ── File management ─────────────────────────────────────────────────────────
  const handleFileSelect = (path: string) => {
    if (!openFiles.includes(path)) setOpenFiles((p) => [...p, path]);
    setCurrentFile(path);
    if (isMobile) setMobileTab("code");
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const next = openFiles.filter((p) => p !== path);
    setOpenFiles(next);
    if (currentFile === path) setCurrentFile(next.length > 0 ? next[next.length - 1] : null);
  };

  // ── AI generation / streaming ───────────────────────────────────────────────
  const handleSend = async (promptText: string) => {
    if (!promptText.trim() || isStreaming || !user) return;

    const tempUserMsg: StudioMessage = {
      id: `temp_${Date.now()}`,
      project_id: projectId,
      role: "user",
      content: promptText,
      file_changes: null,
      created_at: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, tempUserMsg]);

    await runCreateMessage({ data: { project_id: projectId, role: "user", content: promptText } });
    queryClient.invalidateQueries({ queryKey: ["studio-messages", projectId] });

    let leadContext: { businessName: string; category: string; city: string; phone?: string } | undefined;
    const storedLead = sessionStorage.getItem(`studio_lead_context_${projectId}`);
    if (storedLead) {
      try { leadContext = JSON.parse(storedLead); } catch { /* ignore */ }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { toast.error("Not authenticated."); return; }

    setIsStreaming(true);

    const tempAsstId = `streaming_${Date.now()}`;
    setOptimisticMessages((prev) => [
      ...prev,
      { id: tempAsstId, project_id: projectId, role: "assistant", content: "", file_changes: null, created_at: new Date().toISOString() },
    ]);

    const historyForAI = [...messages, tempUserMsg]
      .filter((m) => m.id !== tempAsstId)
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, messages: historyForAI, files, currentFile: currentFile ?? undefined, leadContext }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        if (err.error === "limit_reached") {
          toast.error(err.message ?? "Monthly AI message limit reached. Upgrade to continue.");
        } else {
          toast.error("Generation failed. Please try again.");
        }
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempAsstId && m.id !== tempUserMsg.id));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; text?: string; fullContent?: string };
            if (event.type === "text" && event.text) {
              fullText += event.text;
              setOptimisticMessages((prev) =>
                prev.map((m) => m.id === tempAsstId ? { ...m, content: stripFileChanges(fullText) } : m)
              );
            }
            if (event.type === "done") {
              fullText = event.fullContent ?? fullText;
            }
          } catch { /* skip malformed */ }
        }
      }

      const newFiles = applyFileChanges(files, fullText);
      setFiles(newFiles);

      const changedPaths = Object.keys(newFiles).filter((k) => !files[k] || files[k] !== newFiles[k]);
      if (changedPaths.length > 0) handleFileSelect(changedPaths[0]);

      const summaryText = stripFileChanges(fullText) || fullText;
      const changesXml  = fileChangesSummary(fullText);

      await runCreateMessage({ data: { project_id: projectId, role: "assistant", content: summaryText, file_changes: changesXml } });
      await runUpdateProject({ data: { id: projectId, files_json: JSON.stringify(newFiles) } });

      if (changesXml) {
        await runCreateSnapshot({
          data: { project_id: projectId, label: promptText.slice(0, 80), files_json: JSON.stringify(newFiles), files_count: Object.keys(newFiles).length },
        });
        refetchSnapshots();
      }

      queryClient.invalidateQueries({ queryKey: ["studio-messages", projectId] });
      queryClient.invalidateQueries({ queryKey: ["studio-projects"] });
    } catch (err) {
      console.error("Studio generate error:", err);
      toast.error("Could not reach AI. Check your connection.");
    } finally {
      setIsStreaming(false);
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempAsstId && m.id !== tempUserMsg.id));
      refetchMessages();
    }
  };

  const fileCount = Object.keys(files).length;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <header className="h-11 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate({ to: "/studio" })}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              autoFocus
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-sm font-medium text-zinc-50 outline-none w-[120px] sm:w-[180px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium hover:bg-zinc-900 px-2 py-0.5 rounded transition-colors truncate max-w-[100px] sm:max-w-[200px] text-left"
              title={project?.name}
            >
              {project?.name || "Loading..."}
            </button>
          )}
          {isStreaming && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Generating…
            </span>
          )}
        </div>

        {/* Center — current file path (desktop only) */}
        {!isMobile && (
          <div className="flex items-center justify-center flex-1 px-4">
            {currentFile && (
              <div className="text-xs font-mono text-zinc-500 truncate max-w-[280px]">{currentFile}</div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {deploymentUrl ? (
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-mono"
            >
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <div className="hidden sm:flex items-center text-xs text-zinc-600">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Saved
            </div>
          )}

          {!isMobile && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900 px-2.5"
              onClick={() => toast.info("Share link copied! (coming soon)")}
            >
              <Share className="w-3 h-3 mr-1.5" /> Share
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setShowDeploy(true)}
            className="h-7 bg-primary hover:bg-primary/90 text-white px-2.5"
          >
            <Rocket className="w-3 h-3 sm:mr-1.5" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>

          <Avatar className="w-7 h-7 rounded-md border border-zinc-800">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-zinc-800 text-[10px] rounded-md">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Body */}
      {isMobile ? (
        <MobileLayout
          projectId={projectId}
          files={files}
          currentFile={currentFile}
          openFiles={openFiles}
          tab={mobileTab}
          deploymentUrl={deploymentUrl}
          allMessages={allMessages}
          snapshots={snapshots}
          isStreaming={isStreaming}
          mounted={mounted}
          onFileSelect={handleFileSelect}
          onCloseFile={closeFile}
          onSend={handleSend}
          onDeploy={() => setShowDeploy(true)}
        />
      ) : (
        <DesktopLayout
          projectId={projectId}
          files={files}
          currentFile={currentFile}
          openFiles={openFiles}
          deploymentUrl={deploymentUrl}
          allMessages={allMessages}
          snapshots={snapshots}
          isStreaming={isStreaming}
          fileCount={fileCount}
          mounted={mounted}
          onFileSelect={handleFileSelect}
          onCloseFile={closeFile}
          onSend={handleSend}
          onDeploy={() => setShowDeploy(true)}
        />
      )}

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="h-14 border-t border-zinc-800 bg-zinc-950 flex items-center shrink-0">
          {([
            { id: "chat", icon: MessageSquare, label: "Chat" },
            { id: "code", icon: Code2, label: "Code" },
            { id: "preview", icon: Eye, label: "Preview" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                mobileTab === tab.id ? "text-primary" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {showDeploy && (
        <DeploySheet
          projectId={projectId}
          projectName={project?.name || ""}
          fileCount={fileCount}
          onClose={() => setShowDeploy(false)}
          onDeployed={(url) => { setDeploymentUrl(url); setShowDeploy(false); }}
        />
      )}
    </div>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────

function MobileLayout({
  projectId, files, currentFile, openFiles, tab, deploymentUrl,
  allMessages, snapshots, isStreaming, mounted,
  onFileSelect, onCloseFile, onSend, onDeploy,
}: {
  projectId: string;
  files: Record<string, string>;
  currentFile: string | null;
  openFiles: string[];
  tab: "chat" | "code" | "preview";
  deploymentUrl: string | null;
  allMessages: StudioMessage[];
  snapshots: StudioSnapshot[];
  isStreaming: boolean;
  mounted: boolean;
  onFileSelect: (p: string) => void;
  onCloseFile: (e: React.MouseEvent, p: string) => void;
  onSend: (prompt: string) => void;
  onDeploy: () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      {tab === "chat" && (
        <div className="h-full flex flex-col">
          <ChatTab allMessages={allMessages} isStreaming={isStreaming} onSend={onSend} />
        </div>
      )}

      {tab === "code" && (
        <div className="h-full flex flex-col bg-[#09090b]">
          {/* File tabs */}
          {openFiles.length > 0 && (
            <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto">
              {openFiles.map((path) => (
                <div
                  key={path}
                  onClick={() => onFileSelect(path)}
                  className={`flex items-center px-3 py-2 text-xs font-mono border-r border-zinc-800 cursor-pointer group shrink-0 ${
                    currentFile === path
                      ? "bg-[#09090b] text-zinc-50 border-t-2 border-t-primary"
                      : "bg-zinc-950 text-zinc-500 border-t-2 border-t-transparent"
                  }`}
                >
                  <FileIcon path={path} className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                  {path.split("/").pop()}
                  <button onClick={(e) => onCloseFile(e, path)} className="ml-2 opacity-60">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {mounted && currentFile && files[currentFile] !== undefined ? (
            <div className="flex-1">
              <Suspense fallback={<EditorSkeleton />}>
                <MonacoEditor
                  key={currentFile}
                  height="100%"
                  path={currentFile}
                  defaultValue={files[currentFile] || ""}
                  theme="vs-dark"
                  options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "monospace", padding: { top: 12 }, scrollBeyondLastLine: false }}
                />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
              <div className="border border-zinc-800 rounded-xl p-4 max-w-[260px] w-full">
                <div className="text-xs font-medium text-zinc-500 mb-3">Project Files</div>
                {Object.keys(files).length === 0 ? (
                  <p className="text-xs text-zinc-700 text-center">No files yet. Chat with Studio.</p>
                ) : (
                  Object.keys(files).slice(0, 8).map((path) => (
                    <div
                      key={path}
                      onClick={() => onFileSelect(path)}
                      className="flex items-center py-1.5 hover:bg-zinc-900 rounded cursor-pointer px-2"
                    >
                      <FileIcon path={path} className="w-3.5 h-3.5 mr-2 shrink-0" />
                      <span className="text-xs font-mono text-zinc-400 truncate">{path.split("/").pop()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "preview" && (
        <div className="h-full flex flex-col">
          <LivePreview
            files={files}
            deploymentUrl={deploymentUrl}
            onDeploy={onDeploy}
            fileCount={Object.keys(files).length}
          />
        </div>
      )}
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────

function DesktopLayout({
  projectId, files, currentFile, openFiles, deploymentUrl,
  allMessages, snapshots, isStreaming, fileCount, mounted,
  onFileSelect, onCloseFile, onSend, onDeploy,
}: {
  projectId: string;
  files: Record<string, string>;
  currentFile: string | null;
  openFiles: string[];
  deploymentUrl: string | null;
  allMessages: StudioMessage[];
  snapshots: StudioSnapshot[];
  isStreaming: boolean;
  fileCount: number;
  mounted: boolean;
  onFileSelect: (p: string) => void;
  onCloseFile: (e: React.MouseEvent, p: string) => void;
  onSend: (prompt: string) => void;
  onDeploy: () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        {/* Left — Chat/Files/History */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={32} className="bg-zinc-950 flex flex-col border-r border-zinc-800">
          <LeftPanel
            projectId={projectId}
            files={files}
            allMessages={allMessages}
            snapshots={snapshots}
            isStreaming={isStreaming}
            onFileSelect={onFileSelect}
            onSend={onSend}
          />
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-zinc-800 hover:bg-primary/50 transition-colors" />

        {/* Center — Editor */}
        <ResizablePanel defaultSize={48} minSize={30} className="bg-[#09090b] flex flex-col">
          {openFiles.length > 0 ? (
            <>
              <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto hide-scrollbar">
                {openFiles.map((path) => (
                  <div
                    key={path}
                    onClick={() => onFileSelect(path)}
                    className={`flex items-center px-3 py-2 text-xs font-mono border-r border-zinc-800 cursor-pointer group shrink-0 ${
                      currentFile === path
                        ? "bg-[#09090b] text-zinc-50 border-t-2 border-t-primary"
                        : "bg-zinc-950 text-zinc-500 hover:bg-zinc-900 border-t-2 border-t-transparent"
                    }`}
                  >
                    <FileIcon path={path} className="w-3.5 h-3.5 mr-2 opacity-80" />
                    {path.split("/").pop()}
                    <button
                      onClick={(e) => onCloseFile(e, path)}
                      className="ml-2 opacity-0 group-hover:opacity-100 hover:text-zinc-200 p-0.5 text-zinc-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex-1 relative">
                {mounted && currentFile && files[currentFile] !== undefined ? (
                  <Suspense fallback={<EditorSkeleton />}>
                    <MonacoEditor
                      key={currentFile}
                      height="100%"
                      path={currentFile}
                      defaultValue={files[currentFile] || ""}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: "Geist Mono, monospace",
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        lineHeight: 24,
                      }}
                    />
                  </Suspense>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                    Select a file to edit
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <TerminalIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Studio Editor</p>
              <p className="text-xs mt-2 opacity-60">Select a file from the sidebar</p>
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-zinc-800 hover:bg-primary/50 transition-colors" />

        {/* Right — Preview */}
        <ResizablePanel defaultSize={30} minSize={20} className="bg-zinc-950 flex flex-col">
          <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
            <div className="text-xs font-medium text-zinc-400">Preview</div>
            {deploymentUrl && (
              <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-0.5 animate-pulse" />
                Live <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <LivePreview
            files={files}
            deploymentUrl={deploymentUrl}
            onDeploy={onDeploy}
            fileCount={fileCount}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─── Left Panel (desktop) ─────────────────────────────────────────────────────

function LeftPanel({
  files, allMessages, snapshots, isStreaming, onFileSelect, onSend,
}: {
  projectId: string;
  files: Record<string, string>;
  allMessages: StudioMessage[];
  snapshots: StudioSnapshot[];
  isStreaming: boolean;
  onFileSelect: (p: string) => void;
  onSend: (prompt: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const tabs = [
    { id: "chat",    icon: MessageSquare, label: "Chat" },
    { id: "files",   icon: FolderGit2,    label: "Files" },
    { id: "history", icon: History,       label: "History" },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex p-2 gap-1 border-b border-zinc-800 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === t.id ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat"    && <ChatTab allMessages={allMessages} isStreaming={isStreaming} onSend={onSend} />}
        {activeTab === "files"   && <FilesTab files={files} onFileSelect={onFileSelect} />}
        {activeTab === "history" && <HistoryTab snapshots={snapshots} />}
      </div>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({
  allMessages, isStreaming, onSend,
}: {
  allMessages: StudioMessage[];
  isStreaming: boolean;
  onSend: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const placeholder = useAnimatedPlaceholder(CHAT_PLACEHOLDERS, 2800);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSend = () => {
    if (!prompt.trim() || isStreaming) return;
    onSend(prompt.trim());
    setPrompt("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {allMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">What should we build?</p>
            <p className="text-xs text-zinc-600">Describe a feature, component, or ask for changes.</p>
          </div>
        ) : (
          allMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user" ? "bg-zinc-800 text-zinc-50" : "text-zinc-300"
              } ${!msg.content && isStreaming ? "italic text-zinc-500" : ""}`}>
                {msg.content || (isStreaming && msg.role === "assistant" ? "Thinking…" : "")}
                {msg.file_changes && (
                  <div className="mt-2 border border-zinc-800 rounded bg-zinc-900/60 p-2 text-xs font-mono text-zinc-500 break-all">
                    Files updated
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2.5 border-t border-zinc-800 bg-zinc-950 shrink-0">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex items-end gap-1 p-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim() && !isStreaming) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className="min-h-[38px] max-h-[140px] bg-transparent border-0 focus-visible:ring-0 text-sm resize-none py-2 px-2 placeholder:text-zinc-600"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!prompt.trim() || isStreaming}
            className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90 text-white rounded-md mb-0.5 mr-0.5 disabled:opacity-30"
          >
            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1 text-center">⌘ Enter to send</p>
      </div>
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ files, onFileSelect }: { files: Record<string, string>; onFileSelect: (p: string) => void }) {
  const paths = Object.keys(files).sort();
  return (
    <div className="p-2 overflow-y-auto h-full">
      <div className="text-[10px] font-medium text-zinc-600 px-2 py-1.5 uppercase tracking-widest">Project Files</div>
      {paths.length === 0 ? (
        <p className="text-xs text-zinc-700 px-2 py-4 text-center">No files yet.</p>
      ) : (
        paths.map((path) => {
          const parts = path.split("/");
          const name = parts.pop() || path;
          return (
            <div
              key={path}
              onClick={() => onFileSelect(path)}
              className="flex items-center py-1.5 hover:bg-zinc-900 rounded cursor-pointer group"
              style={{ paddingLeft: `${parts.length * 12 + 8}px` }}
            >
              <FileIcon path={path} className="w-3.5 h-3.5 mr-2 opacity-60 group-hover:opacity-100 shrink-0" />
              <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-100 truncate">{name}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ snapshots }: { snapshots: StudioSnapshot[] }) {
  return (
    <div className="p-3 overflow-y-auto h-full">
      {snapshots.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center mt-10">No history yet.</div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-3 space-y-5 pb-4">
          {snapshots.map((snap) => (
            <div key={snap.id} className="relative pl-5">
              <div className="absolute w-2 h-2 bg-zinc-950 border-2 border-primary rounded-full -left-[5px] top-1" />
              <div className="text-sm font-medium text-zinc-300 line-clamp-1">{snap.label}</div>
              <div className="text-xs text-zinc-600 mt-0.5">
                {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })} · {snap.files_count} files
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deploy Sheet ─────────────────────────────────────────────────────────────

function DeploySheet({
  projectId, projectName, fileCount, onClose, onDeployed,
}: {
  projectId: string;
  projectName: string;
  fileCount: number;
  onClose: () => void;
  onDeployed: (url: string) => void;
}) {
  const [deploying, setDeploying] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const vercelConnected = false; // TODO: connect via settings

  const handleDeploy = async () => {
    setDeploying(true); setError(null);
    try {
      const res = await fetch(`/api/deploy/${projectId}`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "no_vercel_token"
          ? "Connect Vercel in Settings › Integrations first."
          : data.message || "Deployment failed.");
        return;
      }
      toast.success("Deployed successfully!");
      onDeployed(data.deploymentUrl);
    } catch { setError("Network error. Try again."); }
    finally { setDeploying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 76 65" className="w-4 h-4 fill-zinc-50"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
            </div>
            <div>
              <h2 className="text-zinc-50 font-medium text-sm">Deploy to Vercel</h2>
              <p className="text-zinc-500 text-xs">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-zinc-300">Files</span>
            <span className="text-sm font-mono text-zinc-50">{fileCount}</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-zinc-300">Vercel account</span>
            {vercelConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Connected
              </span>
            ) : (
              <span className="text-xs text-zinc-500">Connect in Settings (coming soon)</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <Button
          onClick={handleDeploy}
          disabled={deploying || !vercelConnected || fileCount === 0}
          className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-medium h-10"
        >
          {deploying
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</>
            : <><Rocket className="w-4 h-4 mr-2" /> Deploy now</>}
        </Button>

        {!vercelConnected && (
          <p className="text-center text-xs text-zinc-600 mt-3">
            Vercel integration is coming soon.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FileIcon({ path, className }: { path: string; className?: string }) {
  if (/\.(tsx?|jsx?)$/.test(path)) return <FileCode className={`${className} text-blue-400`} />;
  if (path.endsWith(".json"))       return <FileJson className={`${className} text-yellow-400`} />;
  if (path.endsWith(".css"))        return <FileType2 className={`${className} text-green-400`} />;
  return <File className={`${className} text-zinc-400`} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <Loader2 className="size-5 animate-spin text-zinc-600" />
    </div>
  );
}
