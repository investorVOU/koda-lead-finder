import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Eye, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPromptPreview, trackPreviewView } from "@/lib/preview.functions";

type Preview = {
  id: string;
  slug: string;
  business_name: string;
  prompt_content: string;
  views: number;
  created_at: string;
};

export const Route = createFileRoute("/preview/$slug")({
  head: () => ({ meta: [{ title: "Website Preview — KodaRai" }] }),
  component: PreviewPage,
});

const BUILDERS = [
  {
    name: "v0",
    color: "bg-black text-white hover:bg-neutral-800",
    getUrl: (p: string) => `https://v0.dev/chat?q=${encodeURIComponent(p.slice(0, 2000))}`,
  },
  {
    name: "Lovable",
    color: "bg-pink-500 text-white hover:bg-pink-600",
    getUrl: () => "https://lovable.dev/",
  },
  {
    name: "Bolt",
    color: "bg-violet-600 text-white hover:bg-violet-700",
    getUrl: () => "https://bolt.new/",
  },
];

function PreviewPage() {
  const { slug } = Route.useParams();
  const fetchPreview = useServerFn(getPromptPreview);
  const logView = useServerFn(trackPreviewView);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await fetchPreview({ data: { slug } });
      setLoading(false);
      if ("error" in result) {
        setNotFound(true);
        return;
      }
      setPreview(result.preview as Preview);
      logView({ data: { slug } });
    }
    load();
  }, [slug]);

  const copyPrompt = () => {
    if (!preview) return;
    navigator.clipboard.writeText(preview.prompt_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Prompt copied!");
  };

  const openBuilder = (builder: (typeof BUILDERS)[0]) => {
    if (!preview) return;
    navigator.clipboard.writeText(preview.prompt_content);
    window.open(builder.getUrl(preview.prompt_content), "_blank", "noopener,noreferrer");
    toast.success(`Prompt copied — paste it into ${builder.name}!`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !preview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <h1 className="text-2xl font-bold">Preview not found</h1>
        <p className="text-muted-foreground">
          This preview link may have expired or been removed.
        </p>
        <a href="/" className="text-sm text-primary hover:underline">
          Go to KodaRai
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{preview.business_name}</h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3" />
              {preview.views + 1} view{preview.views + 1 !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyPrompt} className="shrink-0">
            {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy Prompt"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {preview.prompt_content}
          </pre>
        </div>

        {/* Builder CTA */}
        <div className="mt-8">
          <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Build this website instantly with an AI builder
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {BUILDERS.map((b) => (
              <button
                key={b.name}
                onClick={() => openBuilder(b)}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${b.color}`}
              >
                {b.name}
                <ExternalLink className="size-3.5" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Clicking copies the prompt and opens the builder. Paste when prompted.
          </p>
        </div>
      </main>

      {/* KodaRai watermark */}
      <footer className="mt-16 border-t border-border py-8 text-center">
        <p className="text-xs text-muted-foreground">
          Generated by{" "}
          <a
            href="https://kodarai.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            KodaRai
          </a>{" "}
          · AI-powered lead intelligence for freelancers
        </p>
      </footer>
    </div>
  );
}
