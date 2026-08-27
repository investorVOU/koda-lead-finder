import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Rocket, History, Send, ExternalLink,
  FileCode, FileJson, FileType2, File, Globe, X, Loader2,
  Code2, Eye, RefreshCw, Sparkles, FolderGit2, Pencil,
  MessageSquare, Check,
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

// ─── Types matching backend SSE payloads ──────────────────────────────────────

type FileAction = "create" | "update" | "delete";

type FileChange = {
  path: string;
  action: FileAction;
  content: string;
};

type StreamEvent =
  | { type: "progress" }
  | { type: "text"; text: string }
  | { type: "files"; fileChanges: FileChange[] }
  | {
      type: "done";
      fullContent?: string;
      summary?: string;
      fileChanges?: FileChange[];
      filesChanged?: string[];
    }
  | { type: "error"; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Apply the STRUCTURED file changes the backend already parsed. Do not
// re-parse raw XML on the client — the backend is the single source of
// truth for that (see parseFileChanges in api/studio/generate).
function applyStructuredChanges(
  current: Record<string, string>,
  changes: FileChange[],
): Record<string, string> {
  const result = { ...current };
  for (const { path, action, content } of changes) {
    if (action === "delete") {
      delete result[path];
    } else {
      result[path] = content;
    }
  }
  return result;
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
      <div className="flex flex-col h-full bg-[#0f0f12]">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 h-10 px-3 bg-[#1a1a20] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 bg-[#0f0f12] rounded-md h-6 flex items-center px-3 mx-1 border border-white/5">
            <Globe className="w-3 h-3 text-zinc-600 mr-1.5 shrink-0" />
            <span className="text-[11px] text-zinc-500 font-mono truncate">
              {deploymentUrl ? deploymentUrl.replace(/^https?:\/\//, "") : "preview — kodarai studio"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-600 hover:bg-white/5 hover:text-zinc-300 transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {deploymentUrl && (
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-md flex items-center justify-center text-emerald-500 hover:bg-white/5 transition-colors"
                title="Open live site"
              >
                <ExternalLink className="w-3.5 h-3.5" />
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

  // Empty state
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-[#0f0f12] overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xs px-6">
        {deploymentUrl ? (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5">
              <Globe className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-zinc-100">Live on the web</h3>
            <p className="mb-5 break-all font-mono text-[11px] text-zinc-500 leading-relaxed">{deploymentUrl.replace("https://", "")}</p>
            <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="h-9 w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-medium shadow-lg shadow-emerald-500/20">
                <ExternalLink className="w-3.5 h-3.5" /> Open live site
              </Button>
            </a>
          </>
        ) : (
          <>
            {/* Preview illustration */}
            <div className="mb-6 relative">
              <div className="w-20 h-20 rounded-2xl border border-white/6 bg-white/[0.02] flex items-center justify-center shadow-xl">
                <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
                  <rect x="2" y="2" width="40" height="7" rx="2" fill="rgba(255,255,255,0.08)"/>
                  <rect x="2" y="13" width="25" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
                  <rect x="2" y="21" width="40" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
                  <rect x="2" y="29" width="30" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
                  <rect x="2" y="37" width="20" height="4" rx="2" fill="rgba(255,255,255,0.03)"/>
                </svg>
              </div>
              <div className="absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shadow-sm shadow-primary/20">
                <Sparkles className="w-2.5 h-2.5 text-primary" />
              </div>
            </div>

            <h3 className="mb-2 text-sm font-semibold text-zinc-200">No preview yet</h3>
            <p className="mb-6 text-xs text-zinc-500 leading-relaxed">
              {fileCount > 0
                ? `${fileCount} file${fileCount !== 1 ? "s" : ""} ready — ask Studio to create an index.html to see a live preview.`
                : "Describe your website in the chat and Studio will build it live here."}
            </p>
            <Button
              onClick={onDeploy}
              variant="outline"
              className="h-9 w-full gap-2 border-white/8 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200 hover:border-white/15 text-xs transition-all"
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

      // These come from the backend's already-parsed output — do NOT
      // re-parse raw XML on the client. The backend is the single
      // source of truth for file changes and the human summary.
      let finalSummary = "";
      let finalFileChanges: FileChange[] = [];
      let sawError = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line.slice(6)) as StreamEvent;
          } catch {
            continue; // skip malformed SSE record
          }

          if (event.type === "progress") {
            // Mid-generation heartbeat only — no text payload by design
            // (the backend withholds raw XML while it's still streaming).
            continue;
          }

          if (event.type === "text") {
            // Backend sends the final, already-stripped summary here.
            finalSummary = event.text;
            setOptimisticMessages((prev) =>
              prev.map((m) => (m.id === tempAsstId ? { ...m, content: finalSummary } : m)),
            );
          }

          if (event.type === "files") {
            finalFileChanges = event.fileChanges ?? [];
          }

          if (event.type === "done") {
            if (event.summary) finalSummary = event.summary;
            if (event.fileChanges) finalFileChanges = event.fileChanges;
          }

          if (event.type === "error") {
            sawError = true;
            console.error("Studio generate stream error:", event.error);
          }
        }
      }

      if (sawError && !finalSummary && finalFileChanges.length === 0) {
        toast.error("Generation failed. Please try again.");
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempAsstId && m.id !== tempUserMsg.id));
        return;
      }

      const newFiles = applyStructuredChanges(files, finalFileChanges);
      setFiles(newFiles);

      if (finalFileChanges.length > 0) {
        handleFileSelect(finalFileChanges[0].path);
      }

      const summaryText = finalSummary || "Done — I updated the site.";
      // Store a compact JSON marker (used only to show the "Files updated"
      // badge) instead of a slice of raw XML.
      const changesMarker = finalFileChanges.length > 0
        ? JSON.stringify(finalFileChanges.map((f) => ({ path: f.path, action: f.action })))
        : null;

      await runCreateMessage({ data: { project_id: projectId, role: "assistant", content: summaryText, file_changes: changesMarker } });
      await runUpdateProject({ data: { id: projectId, files_json: JSON.stringify(newFiles) } });

      if (changesMarker) {
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
    <div className="h-[100dvh] w-full flex flex-col bg-[#0f0f12] text-foreground overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="h-12 border-b border-white/5 bg-[#0f0f12]/95 backdrop-blur-sm flex items-center justify-between px-3 shrink-0 gap-2">
        {/* Left: back + brand + project name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => navigate({ to: "/studio" })}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
            title="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/8 shrink-0" />

          {/* Brand pill */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-semibold text-zinc-300 hidden sm:block tracking-tight">Studio</span>
          </div>

          <div className="w-px h-4 bg-white/8 shrink-0 hidden sm:block" />

          {/* Project name — inline editable */}
          <div className="flex items-center gap-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameBlur();
                    if (e.key === "Escape") { setIsEditingName(false); setProjectName(project?.name ?? ""); }
                  }}
                  autoFocus
                  className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-sm font-medium text-zinc-100 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/10 w-[140px] sm:w-[200px] transition-all"
                />
                <button
                  onClick={handleNameBlur}
                  className="w-6 h-6 rounded flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-1.5 group px-2 py-1 rounded-lg hover:bg-white/5 transition-colors max-w-[120px] sm:max-w-[220px]"
                title="Click to rename project"
              >
                <span className="text-sm font-medium text-zinc-200 truncate">{project?.name || "Loading…"}</span>
                <Pencil className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 shrink-0 transition-colors" />
              </button>
            )}
          </div>

          {/* Generating bounce dots */}
          {isStreaming && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
            </div>
          )}
        </div>

        {/* Right: status + deploy */}
        <div className="flex items-center gap-2 shrink-0">
          {deploymentUrl ? (
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Live
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600 px-2">
              <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
              <span>Draft</span>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setShowDeploy(true)}
            className="h-8 bg-primary hover:bg-primary/90 text-white text-xs px-3 gap-1.5 shadow-md shadow-primary/20 transition-all"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Deploy</span>
          </Button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
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

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────────── */}
      {isMobile && (
        <nav className="h-16 border-t border-white/5 bg-[#0f0f12] flex items-center px-2 shrink-0 gap-1">
          {([
            { id: "chat"    as const, icon: MessageSquare, label: "Chat"    },
            { id: "code"    as const, icon: Code2,         label: "Code"    },
            { id: "preview" as const, icon: Eye,           label: "Preview" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all ${
                mobileTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-600 hover:text-zinc-400"
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
        <ResizablePanel defaultSize={34} minSize={26} maxSize={46} className="flex flex-col min-h-0">
          <ChatPanel allMessages={allMessages} isStreaming={isStreaming} onSend={onSend} />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-white/5 hover:bg-primary/30 transition-colors duration-200 cursor-col-resize" />

        {/* Right — Workspace */}
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
            <div
              className="flex bg-[#0f0f12] border-b border-white/5 overflow-x-auto shrink-0"
              style={{ scrollbarWidth: "none" }}
            >
              {openFiles.map((path) => (
                <div
                  key={path}
                  onClick={() => onFileSelect(path)}
                  className={`flex items-center px-3 h-9 text-xs font-mono border-r border-white/5 cursor-pointer group shrink-0 transition-colors ${
                    currentFile === path
                      ? "bg-[#09090b] text-zinc-100 border-t border-t-primary"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <FileIcon path={path} className="w-3.5 h-3.5 mr-1.5" />
                  {path.split("/").pop()}
                  <button onClick={(e) => onCloseFile(e, path)} className="ml-2 text-zinc-600 hover:text-zinc-300 transition-colors">
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
            <div className="flex-1 overflow-y-auto">
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

  const handleQuickStart = (p: string) => { onSend(p); };

  return (
    <div className="flex flex-col h-full bg-[#0d0d10]">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
      >
        {allMessages.length === 0 ? (
          <ChatEmptyState onQuickStart={handleQuickStart} isStreaming={isStreaming} />
        ) : (
          <div className="px-4 py-5 space-y-6">
            {allMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/5 bg-[#0d0d10] p-3">
        <div className={`relative rounded-xl border transition-all duration-200 ${
          isStreaming
            ? "border-primary/20 bg-white/[0.02]"
            : "border-white/8 bg-white/[0.02] focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_rgba(var(--primary-rgb,139,92,246),0.06)]"
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
            className="min-h-[80px] max-h-[180px] bg-transparent border-0 focus-visible:ring-0 text-sm text-zinc-100 resize-none py-3.5 px-4 placeholder:text-zinc-600 leading-relaxed"
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-[11px] text-zinc-700 select-none">⌘↵ to send</span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!prompt.trim() || isStreaming}
              className="h-8 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-medium gap-1.5 disabled:opacity-30 shadow-md shadow-primary/20 transition-all"
            >
              {isStreaming
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…</>
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
    <div className="flex flex-col h-full min-h-[420px] items-center justify-center px-6 py-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 shadow-xl shadow-primary/10">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">What are we building?</h3>
      <p className="text-xs text-zinc-500 mb-7 max-w-[220px] text-center leading-relaxed">
        Describe a website or pick a quick action to get started instantly.
      </p>
      <div className="w-full space-y-2 max-w-[280px]">
        {QUICK_STARTS.map((qs) => (
          <button
            key={qs.label}
            onClick={() => !isStreaming && onQuickStart(qs.prompt)}
            disabled={isStreaming}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none shrink-0">{qs.icon}</span>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors flex-1">{qs.label}</span>
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
        <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-tr-md bg-primary/15 border border-primary/20 text-sm text-zinc-100 leading-relaxed break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-primary/10">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {isEmpty && isStreaming ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}
        {message.file_changes && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-[11px] text-emerald-400 font-medium">
            <FileCode className="w-3 h-3" />
            Files updated
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workspace Panel ──────────────────────────────────────────────────────────

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
    <div className="flex flex-col h-full bg-[#0f0f12]">
      {/* Tab strip */}
      <div className="flex items-center border-b border-white/5 bg-[#0f0f12] shrink-0 h-10 px-1">
        <div className="flex items-center flex-1 h-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 h-full text-xs font-medium transition-colors ${
                activeTab === t.id ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-2 right-2 h-px bg-primary rounded-full" />
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
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" && (
          <LivePreview files={files} deploymentUrl={deploymentUrl} onDeploy={onDeploy} fileCount={fileCount} />
        )}

        {activeTab === "code" && (
          <div className="flex flex-col h-full bg-[#09090b]">
            {openFiles.length > 0 && (
              <div
                className="flex bg-[#0f0f12] border-b border-white/5 overflow-x-auto shrink-0"
                style={{ scrollbarWidth: "none" }}
              >
                {openFiles.map((path) => (
                  <div
                    key={path}
                    onClick={() => onFileSelect(path)}
                    className={`flex items-center px-3.5 h-9 text-xs font-mono border-r border-white/5 cursor-pointer group shrink-0 transition-colors ${
                      currentFile === path
                        ? "bg-[#09090b] text-zinc-100 border-t border-t-primary"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/3"
                    }`}
                  >
                    <FileIcon path={path} className="w-3.5 h-3.5 mr-1.5" />
                    {path.split("/").pop()}
                    <button
                      onClick={(e) => onCloseFile(e, path)}
                      className="ml-2.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-zinc-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 relative overflow-hidden">
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
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Code2 className="w-10 h-10 text-zinc-800 mb-3" />
                  <p className="text-sm text-zinc-600">Select a file from the Files tab</p>
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
    <div
      className="h-full overflow-y-auto bg-[#0f0f12]"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
    >
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Project files</span>
      </div>
      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <FolderGit2 className="w-10 h-10 text-zinc-800 mb-3" />
          <p className="text-xs text-zinc-600 leading-relaxed max-w-[180px]">No files yet — ask Studio to build something.</p>
        </div>
      ) : (
        <div className="px-1 pb-3 mt-1 space-y-px">
          {paths.map((path) => {
            const parts = path.split("/");
            const name = parts.pop() || path;
            return (
              <div
                key={path}
                onClick={() => onFileSelect(path)}
                className="flex items-center py-1.5 hover:bg-white/5 rounded-md cursor-pointer group transition-colors"
                style={{ paddingLeft: `${parts.length * 14 + 10}px`, paddingRight: "10px" }}
              >
                <FileIcon path={path} className="w-3.5 h-3.5 mr-2 shrink-0" />
                <span className="text-[12px] font-mono text-zinc-500 group-hover:text-zinc-200 truncate transition-colors">{name}</span>
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
    <div
      className="h-full overflow-y-auto bg-[#0f0f12] p-4"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
    >
      <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Snapshots</div>
      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="w-10 h-10 text-zinc-800 mb-3" />
          <p className="text-xs text-zinc-600 leading-relaxed max-w-[180px]">Each AI edit creates a snapshot you can browse here.</p>
        </div>
      ) : (
        <div className="relative pl-4 border-l border-white/6 space-y-5">
          {snapshots.map((snap) => (
            <div key={snap.id} className="relative group">
              <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-zinc-700 bg-[#0f0f12] group-hover:border-primary -left-[17px] top-1 transition-colors" />
              <p className="text-sm text-zinc-300 font-medium leading-snug line-clamp-2">{snap.label}</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })}
                <span className="mx-1.5 text-zinc-700">·</span>
                {snap.files_count} file{snap.files_count !== 1 ? "s" : ""}
              </p>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#18181f] border border-white/8 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 76 65" className="w-4 h-4 fill-zinc-50">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-zinc-100 font-semibold text-sm">Deploy to Vercel</h2>
              <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[200px]">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-2.5 mb-6">
          <div className="bg-white/3 border border-white/6 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Files ready</span>
            <span className="text-sm font-mono font-medium text-zinc-100">{fileCount}</span>
          </div>
          <div className="bg-white/3 border border-white/6 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Vercel account</span>
            {vercelConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Connected
              </span>
            ) : (
              <span className="text-xs text-zinc-600">Coming soon</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleDeploy}
          disabled={deploying || !vercelConnected || fileCount === 0}
          className="w-full bg-zinc-50 text-zinc-950 hover:bg-white font-semibold h-10 gap-2 shadow-lg shadow-black/30 transition-all"
        >
          {deploying
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>
            : <><Rocket className="w-4 h-4" /> Deploy now</>}
        </Button>

        {!vercelConnected && (
          <p className="text-center text-xs text-zinc-700 mt-3">Vercel integration coming soon — stay tuned.</p>
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
  return <File className={`${className} text-zinc-500`} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <Loader2 className="size-5 animate-spin text-zinc-700" />
    </div>
  );
}
