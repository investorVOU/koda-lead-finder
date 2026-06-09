import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Globe, Share2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPromptPreview } from "@/lib/preview.functions";

interface BuilderConfig {
  name: string;
  icon: string;
  getUrl: (prompt: string) => string | null;
}

const BUILDERS: BuilderConfig[] = [
  {
    name: "v0",
    icon: "⬡",
    getUrl: (p) => `https://v0.dev/chat?q=${encodeURIComponent(p.slice(0, 2000))}`,
  },
  {
    name: "Lovable",
    icon: "♥",
    getUrl: () => "https://lovable.dev/",
  },
  {
    name: "Bolt",
    icon: "⚡",
    getUrl: () => "https://bolt.new/",
  },
];

export function GenerateDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  loading,
  kind,
  businessName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  content: string;
  loading: boolean;
  kind?: "website_prompt" | "call_script";
  businessName?: string;
}) {
  const runCreatePreview = useServerFn(createPromptPreview);
  const [publishing, setPublishing] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const openBuilder = (builder: BuilderConfig) => {
    navigator.clipboard.writeText(content);
    const url = builder.getUrl(content);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Prompt copied — paste it into ${builder.name}!`);
  };

  const publishPreview = async () => {
    if (!businessName || !content) return;
    setPublishing(true);
    const res = await runCreatePreview({
      data: { businessName, promptContent: content },
    });
    setPublishing(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setPreviewSlug(res.slug);
  };

  const previewUrl = previewSlug
    ? `${window.location.origin}/preview/${previewSlug}`
    : null;

  const copyPreviewLink = () => {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Share link copied!");
  };

  const isWebsitePrompt = kind === "website_prompt";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPreviewSlug(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Generating with AI…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border bg-muted/40 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {content}
              </pre>
            </div>

            <Button variant="hero" onClick={copy} disabled={!content}>
              <Copy className="size-4" /> Copy Prompt
            </Button>

            {isWebsitePrompt && content && (
              <>
                {/* Builder handoff */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Open in website builder
                  </p>
                  <div className="flex gap-2">
                    {BUILDERS.map((b) => (
                      <Button
                        key={b.name}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openBuilder(b)}
                      >
                        <span className="text-base leading-none">{b.icon}</span>
                        {b.name}
                        <ExternalLink className="size-3" />
                      </Button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Prompt is copied to clipboard and the builder opens in a new tab.
                  </p>
                </div>

                {/* Shareable preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Shareable client preview
                  </p>
                  {previewUrl ? (
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px]">
                        {previewUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={copyPreviewLink}
                      >
                        {copied ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" className="shrink-0" asChild>
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="size-4" />
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={publishPreview}
                      disabled={publishing || !businessName}
                    >
                      {publishing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Share2 className="size-4" />
                      )}
                      {publishing ? "Publishing…" : "Publish Live Preview Link"}
                    </Button>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Creates a public link your client can open on mobile. Tracks views.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
