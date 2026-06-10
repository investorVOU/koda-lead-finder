import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Rocket, MessageSquare, FolderGit2, History, Send, ExternalLink,
  FileCode, FileJson, FileType2, File, Globe, X, Loader2,
  Code2, Eye, RefreshCw, Sparkles, ChevronRight,
} from "lucide-react";
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

const QUICK_STARTS = [
  { icon: "🏠", label: "Add hero section", prompt: "Add a stunning hero section with a headline, subheading, and call-to-action button." },
  { icon: "📞", label: "Contact section", prompt: "Add a contact section with phone, email, WhatsApp button, and a simple enquiry form." },
  { icon: "📱", label: "Make mobile-friendly", prompt: "Make the site fully responsive and mobile-friendly with a hamburger menu." },
  { icon: "⚡", label: "Improve speed", prompt: "Optimize the HTML and CSS for performance: lazy load images, clean up unused styles, and compress scripts." },
];

// ─── Preview helpers ──────────────────────────────────────────────────────────

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
      <div className="flex flex-col h-full">
        {/* Browser chrome bar */}
        <div className="flex items-center gap-2 h-9 px-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          <div className="flex-1 bg-zinc-800 rounded-md h-5 flex items-center px-3">
            <span className="text-[11px] text-zinc-500 font-mono truncate">
              {deploymentUrl ? deploymentUrl.replace(/^https?:\/\//, "") : "preview"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            {deploymentUrl && (
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 rounded flex items-center justify-center text-emerald-500 hover:bg-zinc-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            key={refreshKey}
            srcDoc={previewDoc}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Site preview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 text-center p-8">
      <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="relative z-10 max-w-[260px]">
        {deploymentUrl ? (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <Globe className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">Live on the web</h3>
            <p className="mb-5 break-all font-mono text-xs text-zinc-500">{deploymentUrl.replace("https://", "")}</p>
            <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
              <Button className="h-9 w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> Open live site
              </Button>
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Globe className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">No preview yet</h3>
            <p className="mb-6 text-xs text-zinc-500 leading-relaxed">
              {fileCount > 0
                ? `${fileCount} file${fileCount !== 1 ? "s" : ""} ready — ask Studio to create index.html to see a preview.`
                : "Chat with Studio and describe what you want to build."}
            </p>
            <Button
              onClick={onDeploy}
              variant="outline"
              className="h-9 w-full gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
            >
              <Rocket className="w-3.5 h-3.5" /> Deploy to Vercel
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

  const runGetProject     = useServerFn(getStudioProject);
  const runListMessages   = useServerFn(listStudioMessages);
  const runCreateMessage  = useServerFn(createStudioMessage);
  const runListSnapshots  = useServerFn(listStudioSnapshots);
  const runUpdateProject  = useServerFn(updateStudioProject);
  const runCreateSnapshot = useServerFn(createStudioSnapshot);

  // ── Data ─────────────────────────────────────────────────────────────────────
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

  // ── Local state ───────────────────────────────────────────────────────────────
  const [projectName, setProjectName]     = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [files, setFiles]                 = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile]     = useState<string | null>(null);
  const [openFiles, setOpenFiles]         = useState<string[]>([]);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showDeploy, setShowDeploy]       = useState(false);
  const [mobileTab, setMobileTab]         = useState<"chat" | "code" | "preview">("chat");
  const [mounted, setMounted]             = useState(false);
  const [isStreaming, setIsStreaming]     = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<StudioMessage[]>([]);
  const allMessages = [...messages, ...optimisticMessages];

  // ── Effects ───────────────────────────────────────────────────────────────────
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

  // ── Name editing ──────────────────────────────────────────────────────────────
  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (!projectName.trim() || projectName === project?.name) return;
    await runUpdateProject({ data: { id: projectId, name: projectName.trim() } });
    queryClient.invalidateQueries({ queryKey: ["studio-project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["studio-projects"] });
  };

  // ── File management ───────────────────────────────────────────────────────────
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

  // ── AI generation ─────────────────────────────────────────────────────────────
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
          toast.error(err.error || err.message || "Generation failed. Please try again.");
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
    <div className="h-[100dvh] w-full flex flex-col bg-zinc-950 text-foreground overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between px-4 shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => navigate({ to: "/studio" })}
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-zinc-800 shrink-0" />

          {/* Kodarai Studio pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 hidden sm:block">Studio</span>
          </div>

          <div className="w-px h-4 bg-zinc-800 shrink-0 hidden sm:block" />

          {/* Project name */}
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              autoFocus
              className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1 text-sm font-medium text-zinc-100 outline-none w-[160px] sm:w-[220px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 px-2 py-1 rounded-md transition-colors truncate max-w-[120px] sm:max-w-[240px] text-left"
              title={project?.name}
            >
              {project?.name || "Loading…"}
            </button>
          )}

          {isStreaming && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 ml-2">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
              </span>
              <span>Generating</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deploymentUrl ? (
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600">
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
              Draft
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setShowDeploy(true)}
            className="h-7 bg-primary hover:bg-primary/90 text-white text-xs px-3 gap-1.5"
          >
            <Rocket className="w-3 h-3" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>
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
            { id: "chat" as const,    icon: MessageSquare, label: "Chat" },
            { id: "code" as const,    icon: Code2,         label: "Code" },
            { id: "preview" as const, icon: Eye,           label: "Preview" },
          ]).map((tab) => (
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

// ─── Desktop Layout ───────────────────────────────────────────────────────────

function DesktopLayout({
  files, currentFile, openFiles, deploymentUrl,
  allMessages, snapshots, isStreaming, fileCount, mounted,
  onFileSelect, onCloseFile, onSend, onDeploy,
}: {
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
        {/* Left — Chat */}
        <ResizablePanel defaultSize={34} minSize={26} maxSize={48} className="flex flex-col min-h-0">
          <ChatPanel allMessages={allMessages} isStreaming={isStreaming} onSend={onSend} />
        </ResizablePanel>

        <ResizableHandle className="w-[2px] bg-zinc-800 hover:bg-primary/50 transition-colors cursor-col-resize" />

        {/* Right — tabbed workspace */}
        <ResizablePanel defaultSize={66} minSize={40} className="flex flex-col min-h-0">
          <WorkspacePanel
            files={files}
            currentFile={currentFile}
            openFiles={openFiles}
            deploymentUrl={deploymentUrl}
            snapshots={snapshots}
            fileCount={fileCount}
            mounted={mounted}
            onFileSelect={onFileSelect}
            onCloseFile={onCloseFile}
            onDeploy={onDeploy}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────

function MobileLayout({
  files, currentFile, openFiles, tab, deploymentUrl,
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
        <ChatPanel allMessages={allMessages} isStreaming={isStreaming} onSend={onSend} />
      )}

      {tab === "code" && (
        <div className="h-full flex flex-col bg-[#09090b]">
          {openFiles.length > 0 && (
            <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto shrink-0">
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
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 p-6">
              <FilesTab files={files} onFileSelect={onFileSelect} />
            </div>
          )}
        </div>
      )}

      {tab === "preview" && (
        <div className="h-full flex flex-col">
          <LivePreview files={files} deploymentUrl={deploymentUrl} onDeploy={onDeploy} fileCount={Object.keys(files).length} />
        </div>
      )}
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  allMessages, isStreaming, onSend,
}: {
  allMessages: StudioMessage[];
  isStreaming: boolean;
  onSend: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const placeholder = useAnimatedPlaceholder(CHAT_PLACEHOLDERS, 2800);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSend = () => {
    if (!prompt.trim() || isStreaming) return;
    onSend(prompt.trim());
    setPrompt("");
  };

  const handleQuickStart = (p: string) => {
    onSend(p);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
        {allMessages.length === 0 ? (
          <ChatEmptyState onQuickStart={handleQuickStart} isStreaming={isStreaming} />
        ) : (
          <div className="p-4 space-y-5">
            {allMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-950 p-3">
        <div className={`flex flex-col gap-2 rounded-xl border transition-colors ${
          isStreaming ? "border-amber-500/30 bg-zinc-900/60" : "border-zinc-700/60 bg-zinc-900 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/10"
        }`}>
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim() && !isStreaming) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isStreaming ? "Studio is writing…" : placeholder}
            className="min-h-[72px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 text-sm text-zinc-100 resize-none py-3 px-3 placeholder:text-zinc-600 leading-relaxed"
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
            <span className="text-[11px] text-zinc-600">⌘↵ to send</span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!prompt.trim() || isStreaming}
              className="h-8 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-medium gap-1.5 disabled:opacity-40"
            >
              {isStreaming
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating</>
                : <><Send className="w-3.5 h-3.5" /> Send</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatEmptyState({ onQuickStart, isStreaming }: { onQuickStart: (p: string) => void; isStreaming: boolean }) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">What are we building?</h3>
      <p className="text-xs text-zinc-500 mb-6 max-w-[240px] leading-relaxed">
        Describe a website, ask for changes, or pick a quick action below.
      </p>
      <div className="w-full space-y-2 max-w-[280px]">
        {QUICK_STARTS.map((qs) => (
          <button
            key={qs.label}
            onClick={() => !isStreaming && onQuickStart(qs.prompt)}
            disabled={isStreaming}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none shrink-0">{qs.icon}</span>
            <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 flex-1">{qs.label}</span>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: StudioMessage; isStreaming: boolean }) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm bg-zinc-800 border border-zinc-700/60 text-sm text-zinc-100 leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {isEmpty && isStreaming ? (
          <div className="flex items-center gap-1 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        )}
        {message.file_changes && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            <FileCode className="w-3 h-3" />
            Files updated
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workspace Panel (right, desktop) ────────────────────────────────────────

function WorkspacePanel({
  files, currentFile, openFiles, deploymentUrl, snapshots,
  fileCount, mounted, onFileSelect, onCloseFile, onDeploy,
}: {
  files: Record<string, string>;
  currentFile: string | null;
  openFiles: string[];
  deploymentUrl: string | null;
  snapshots: StudioSnapshot[];
  fileCount: number;
  mounted: boolean;
  onFileSelect: (p: string) => void;
  onCloseFile: (e: React.MouseEvent, p: string) => void;
  onDeploy: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "files" | "history">("preview");

  const tabs = [
    { id: "preview" as const, icon: Eye,       label: "Preview" },
    { id: "code"    as const, icon: Code2,      label: "Code"    },
    { id: "files"   as const, icon: FolderGit2, label: "Files"   },
    { id: "history" as const, icon: History,    label: "History" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800/80 bg-zinc-950 shrink-0 px-1 h-10">
        <div className="flex items-center flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 h-10 text-xs font-medium transition-colors ${
                activeTab === t.id
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        {deploymentUrl && (
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors pr-3 font-medium"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" && (
          <LivePreview files={files} deploymentUrl={deploymentUrl} onDeploy={onDeploy} fileCount={fileCount} />
        )}

        {activeTab === "code" && (
          <div className="flex flex-col h-full bg-[#09090b]">
            {openFiles.length > 0 ? (
              <div className="flex bg-zinc-950 border-b border-zinc-800 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
                {openFiles.map((path) => (
                  <div
                    key={path}
                    onClick={() => onFileSelect(path)}
                    className={`flex items-center px-3.5 py-0 h-9 text-xs font-mono border-r border-zinc-800/60 cursor-pointer group shrink-0 transition-colors ${
                      currentFile === path
                        ? "bg-[#09090b] text-zinc-100 border-b-2 border-b-primary"
                        : "bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    }`}
                  >
                    <FileIcon path={path} className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                    {path.split("/").pop()}
                    <button
                      onClick={(e) => onCloseFile(e, path)}
                      className="ml-2.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-zinc-400 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
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
                      fontFamily: "Geist Mono, JetBrains Mono, monospace",
                      padding: { top: 16 },
                      scrollBeyondLastLine: false,
                      lineHeight: 24,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                    }}
                  />
                </Suspense>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3 p-8">
                  <Code2 className="w-10 h-10 opacity-10" />
                  <p className="text-sm text-zinc-600">Open a file from the Files tab</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <FilesTab files={files} onFileSelect={(p) => { onFileSelect(p); setActiveTab("code"); }} />
        )}

        {activeTab === "history" && <HistoryTab snapshots={snapshots} />}
      </div>
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ files, onFileSelect }: { files: Record<string, string>; onFileSelect: (p: string) => void }) {
  const paths = Object.keys(files).sort();
  return (
    <div className="p-3 overflow-y-auto h-full">
      <div className="text-[10px] font-semibold text-zinc-600 px-2 py-1.5 uppercase tracking-widest mb-1">
        Project files
      </div>
      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderGit2 className="w-8 h-8 text-zinc-700 mb-3" />
          <p className="text-xs text-zinc-600">No files yet — ask Studio to build something.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {paths.map((path) => {
            const parts = path.split("/");
            const name = parts.pop() || path;
            return (
              <div
                key={path}
                onClick={() => onFileSelect(path)}
                className="flex items-center py-1.5 hover:bg-zinc-800/60 rounded-md cursor-pointer group transition-colors"
                style={{ paddingLeft: `${parts.length * 14 + 8}px`, paddingRight: "8px" }}
              >
                <FileIcon path={path} className="w-3.5 h-3.5 mr-2 opacity-60 group-hover:opacity-100 shrink-0 transition-opacity" />
                <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-100 truncate transition-colors">{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ snapshots }: { snapshots: StudioSnapshot[] }) {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
        Snapshots
      </div>
      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="w-8 h-8 text-zinc-700 mb-3" />
          <p className="text-xs text-zinc-600">No snapshots yet. Each AI change creates one.</p>
        </div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-3 space-y-4 pb-4">
          {snapshots.map((snap) => (
            <div key={snap.id} className="relative pl-5 group">
              <div className="absolute w-2 h-2 bg-zinc-900 border-2 border-zinc-600 group-hover:border-primary rounded-full -left-[5px] top-1.5 transition-colors" />
              <div className="text-sm font-medium text-zinc-300 line-clamp-2 leading-snug">{snap.label}</div>
              <div className="text-[11px] text-zinc-600 mt-1">
                {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })}
                <span className="mx-1.5">·</span>
                {snap.files_count} file{snap.files_count !== 1 ? "s" : ""}
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
  const vercelConnected = false;

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 76 65" className="w-4 h-4 fill-zinc-50"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
            </div>
            <div>
              <h2 className="text-zinc-100 font-semibold text-sm">Deploy to Vercel</h2>
              <p className="text-zinc-500 text-xs mt-0.5">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="bg-zinc-800 border border-zinc-700/60 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-zinc-300">Files ready</span>
            <span className="text-sm font-mono font-medium text-zinc-100">{fileCount}</span>
          </div>
          <div className="bg-zinc-800 border border-zinc-700/60 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-zinc-300">Vercel account</span>
            {vercelConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Connected
              </span>
            ) : (
              <span className="text-xs text-zinc-500">Coming soon</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleDeploy}
          disabled={deploying || !vercelConnected || fileCount === 0}
          className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-semibold h-10 gap-2"
        >
          {deploying
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>
            : <><Rocket className="w-4 h-4" /> Deploy now</>}
        </Button>

        {!vercelConnected && (
          <p className="text-center text-xs text-zinc-600 mt-3">
            Vercel integration coming soon — stay tuned.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FileIcon({ path, className }: { path: string; className?: string }) {
  if (/\.(tsx?|jsx?)$/.test(path)) return <FileCode className={`${className} text-blue-400`} />;
  if (path.endsWith(".json"))       return <FileJson className={`${className} text-yellow-400`} />;
  if (path.endsWith(".css"))        return <FileType2 className={`${className} text-emerald-400`} />;
  return <File className={`${className} text-zinc-400`} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <Loader2 className="size-5 animate-spin text-zinc-600" />
    </div>
  );
}
