import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Loader2,
  PenLine,
  Sparkles,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateContent,
  type ContentType,
  type GeneratedContent,
} from "@/lib/content.functions";
export const Route = createFileRoute(
  "/_authenticated/studio/content",
)({
  head: () => ({
    meta: [{ title: "Content Studio — Kodarai" }],
  }),
  component: ContentPage,
});
type Tone =
  | "educational"
  | "conversational"
  | "storytelling"
  | "energetic"
  | "professional";
type Length =
  | "short"
  | "medium"
  | "long";
function ContentPage() {
  const generate = useServerFn(generateContent);
  const [type, setType] =
    useState<ContentType>("youtube-script");
  const [topic, setTopic] = useState("");
  const [idea, setIdea] = useState("");
  const [channelUrl, setChannelUrl] =
    useState("");
  const [tone, setTone] =
    useState<Tone>("conversational");
  const [length, setLength] =
    useState<Length>("medium");
  const [loading, setLoading] =
    useState(false);
  const [result, setResult] =
    useState<GeneratedContent | null>(null);
  const [provider, setProvider] =
    useState<string | null>(null);
  const [model, setModel] =
    useState<string | null>(null);
  async function handleGenerate(
    event: React.FormEvent,
  ) {
    event.preventDefault();
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await generate({
        data: {
          type,
          topic: topic.trim(),
          idea: idea.trim(),
          channelUrl: channelUrl.trim(),
          tone,
          length,
        },
      });
      if ("error" in response) {
        toast.error(response.message);
        return;
      }
      setResult(response.content);
      setProvider(response.provider);
      setModel(response.model);
      toast.success("Content generated.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate content.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function copyContent() {
    if (!result) return;
    const text = [
      result.title,
      "",
      `Hook: ${result.hook}`,
      "",
      result.content,
      "",
      result.description
        ? `Description:\n${result.description}`
        : "",
      result.tags.length
        ? `Tags: ${result.tags.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Content copied.");
    } catch {
      toast.error("Could not copy content.");
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
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <PenLine className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Content Studio
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Turn ideas into scripts, hooks, titles and
              complete YouTube content.
            </p>
          </div>
        </div>
        {/* Generator */}
        <form
          onSubmit={handleGenerate}
          className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="space-y-5">
            {/* Content type */}
            <div className="space-y-2">
              <Label>What are you creating?</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <TypeButton
                  active={
                    type === "youtube-script"
                  }
                  onClick={() =>
                    setType("youtube-script")
                  }
                >
                  <FileText className="size-4" />
                  YouTube Script
                </TypeButton>
                <TypeButton
                  active={
                    type === "short-script"
                  }
                  onClick={() =>
                    setType("short-script")
                  }
                >
                  <Sparkles className="size-4" />
                  Shorts Script
                </TypeButton>
                <TypeButton
                  active={type === "hooks"}
                  onClick={() =>
                    setType("hooks")
                  }
                >
                  Hooks
                </TypeButton>
                <TypeButton
                  active={type === "titles"}
                  onClick={() =>
                    setType("titles")
                  }
                >
                  Titles
                </TypeButton>
              </div>
            </div>
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="content-topic">
                Topic
              </Label>
              <Input
                id="content-topic"
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value)
                }
                placeholder="e.g. How to make money with AI tools"
                className="h-11"
              />
            </div>
            {/* Existing idea */}
            <div className="space-y-2">
              <Label htmlFor="content-idea">
                Existing idea
                <span className="ml-1 font-normal text-muted-foreground">
                  optional
                </span>
              </Label>
              <textarea
                id="content-idea"
                value={idea}
                onChange={(event) =>
                  setIdea(event.target.value)
                }
                placeholder="Paste an idea from the Ideas module, or describe the angle you want..."
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {/* Channel */}
            <div className="space-y-2">
              <Label htmlFor="content-channel">
                YouTube channel
                <span className="ml-1 font-normal text-muted-foreground">
                  optional
                </span>
              </Label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="content-channel"
                  value={channelUrl}
                  onChange={(event) =>
                    setChannelUrl(
                      event.target.value,
                    )
                  }
                  placeholder="@channelname or youtube.com/@channelname"
                  className="h-11 pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Add a channel to let Kodarai use its real
                video performance data as strategic context.
              </p>
            </div>
            {/* Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone</Label>
                <select
                  value={tone}
                  onChange={(event) =>
                    setTone(
                      event.target.value as Tone,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="conversational">
                    Conversational
                  </option>
                  <option value="educational">
                    Educational
                  </option>
                  <option value="storytelling">
                    Storytelling
                  </option>
                  <option value="energetic">
                    Energetic
                  </option>
                  <option value="professional">
                    Professional
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <select
                  value={length}
                  onChange={(event) =>
                    setLength(
                      event.target.value as Length,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="short">
                    Short
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="long">
                    Long
                  </option>
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
                  Creating content…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate content
                </>
              )}
            </Button>
          </div>
        </form>
        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <PenLine className="size-6 animate-pulse text-primary" />
            </div>
            <h2 className="mt-4 text-sm font-semibold">
              Creating your content
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Turning your idea into something you can
              actually publish…
            </p>
          </div>
        )}
        {/* Result */}
        {!loading && result && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Generated content
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">
                  {result.title ||
                    "Generated Content"}
                </h2>
                {provider && model && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Generated with {provider} · {model}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyContent}
              >
                <Copy className="size-3.5" />
                Copy content
              </Button>
            </div>
            {/* Hook */}
            {result.hook && (
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Hook
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed">
                  {result.hook}
                </p>
              </section>
            )}
            {/* Main content */}
            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold">
                  Content
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyContent}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
              <div className="whitespace-pre-wrap p-4 text-sm leading-7 sm:p-6">
                {result.content}
              </div>
            </section>
            {/* Description */}
            {result.description && (
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold">
                  Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {result.description}
                </p>
              </section>
            )}
            {/* Tags */}
            {result.tags.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold">
                  Suggested tags
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        {/* Empty state */}
        {!loading && !result && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <PenLine className="size-6 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Turn an idea into content
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Choose what you want to create, give Kodarai a
              topic and let the AI build the first draft.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
function TypeButton({
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
      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
