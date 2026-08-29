import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Star,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateVideoIdeas,
  type VideoIdea,
} from "@/lib/ideas.functions";

export const Route = createFileRoute("/_authenticated/studio/ideas")({
  head: () => ({ meta: [{ title: "Video Ideas — Kodarai" }] }),
  component: IdeasPage,
});

type Format = "any" | "short" | "long";

function IdeasPage() {
  const generateIdeas = useServerFn(generateVideoIdeas);

  const [topic, setTopic] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [format, setFormat] = useState<Format>("any");
  const [count, setCount] = useState(10);

  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!topic.trim() && !channelUrl.trim()) {
      toast.error("Enter a topic or YouTube channel first.");
      return;
    }

    setLoading(true);
    setIdeas([]);

    try {
      const result = await generateIdeas({
        data: {
          topic: topic.trim() || undefined,
          channelUrl: channelUrl.trim() || undefined,
          format,
          count,
        },
      });

      if ("error" in result) {
        toast.error(result.message);
        return;
      }

      setIdeas(result.ideas);
      setChannelName(result.context.channelName);

      toast.success(
        `${result.ideas.length} video ideas generated.`,
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate ideas.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-5"
        >
          <Link to="/studio">
            <ArrowLeft className="size-4" />
            Studio
          </Link>
        </Button>

        <ModuleHeader />

        {/* Generator */}
        <form
          onSubmit={handleGenerate}
          className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="ideas-topic">
                What do you want ideas about?
              </Label>

              <Input
                id="ideas-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. AI tools for small businesses"
                className="h-11"
              />

              <p className="text-xs text-muted-foreground">
                Leave this empty if you want ideas based entirely on a
                YouTube channel.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ideas-channel">
                YouTube channel{" "}
                <span className="font-normal text-muted-foreground">
                  optional
                </span>
              </Label>

              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="ideas-channel"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="@channelname or youtube.com/@channelname"
                  className="h-11 pl-9"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Adding a channel lets the AI use real video performance
                data to find opportunities.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Format</Label>

                <div className="grid grid-cols-3 gap-2">
                  <FormatButton
                    active={format === "any"}
                    onClick={() => setFormat("any")}
                  >
                    Any
                  </FormatButton>

                  <FormatButton
                    active={format === "short"}
                    onClick={() => setFormat("short")}
                  >
                    Shorts
                  </FormatButton>

                  <FormatButton
                    active={format === "long"}
                    onClick={() => setFormat("long")}
                  >
                    Long-form
                  </FormatButton>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ideas-count">
                  Number of ideas
                </Label>

                <select
                  id="ideas-count"
                  value={count}
                  onChange={(e) =>
                    setCount(Number(e.target.value))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value={5}>5 ideas</option>
                  <option value={10}>10 ideas</option>
                  <option value={15}>15 ideas</option>
                  <option value={20}>20 ideas</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Finding opportunities…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate ideas
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Lightbulb className="size-6 animate-pulse text-primary" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              Finding content opportunities
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Analyzing your context and generating ideas…
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && ideas.length > 0 && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Generated ideas
                </p>

                <h2 className="mt-1 text-lg font-bold tracking-tight">
                  {ideas.length} opportunities
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {channelName
                    ? `Based on ${channelName}'s channel data.`
                    : "Based on your selected topic and content strategy."}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = ideas
                    .map(
                      (idea, index) =>
                        `${index + 1}. ${idea.title}\nHook: ${idea.hook}\nAngle: ${idea.angle}`,
                    )
                    .join("\n\n");

                  copyText(text, "All ideas");
                }}
              >
                <Copy className="size-3.5" />
                Copy all
              </Button>
            </div>

            <div className="space-y-4">
              {ideas.map((idea, index) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={index}
                  onCopy={copyText}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && ideas.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Lightbulb className="size-6 text-primary" />
            </div>

            <h2 className="mt-4 text-base font-semibold">
              Find your next great video
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Give Kodarai a topic, niche, or YouTube channel and
              we'll turn it into specific video opportunities.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ModuleHeader() {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Lightbulb className="size-5 text-primary" />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Video Ideas
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Find original video ideas, hooks and angles using your
          niche and real YouTube performance data.
        </p>
      </div>
    </div>
  );
}

function FormatButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function IdeaCard({
  idea,
  index,
  onCopy,
}: {
  idea: VideoIdea;
  index: number;
  onCopy: (text: string, label: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyIdea() {
    const text = [
      idea.title,
      "",
      `Hook: ${idea.hook}`,
      "",
      `Angle: ${idea.angle}`,
      "",
      `Why it could work: ${idea.reason}`,
    ].join("\n");

    await onCopy(text, "Idea");

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                {idea.format === "either"
                  ? "Short or long"
                  : idea.format === "short"
                    ? "Short"
                    : "Long-form"}
              </span>

              <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                <Star className="size-3 fill-current" />
                {idea.opportunityScore}/100 opportunity
              </span>
            </div>

            <h3 className="mt-2 text-base font-semibold leading-snug sm:text-lg">
              {idea.title}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Insight
          label="Hook"
          value={idea.hook}
        />

        <Insight
          label="Angle"
          value={idea.angle}
        />

        <Insight
          label="Why it could work"
          value={idea.reason}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={copyIdea}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy idea
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled
          title="Content module will be connected next"
        >
          <Sparkles className="size-3.5" />
          Create content
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled
          title="Research module will be connected next"
        >
          <Search className="size-3.5" />
          Research
        </Button>
      </div>
    </article>
  );
}

function Insight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1.5 text-xs leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}
