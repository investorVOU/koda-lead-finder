import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Youtube, Loader2, TrendingUp, Lightbulb, Target } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/_authenticated/studio/channel-review")({
  head: () => ({ meta: [{ title: "Channel Review — Kodarai" }] }),
  component: ChannelReviewPage,
});

interface VideoResult {
  id: string;
  title: string;
  thumbnail?: string;
  views: number;
  outlierScore: number;
  publishedAt: string;
}

interface AnalysisResult {
  channel: {
    title: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
  };
  medianViews: number;
  topVideos: VideoResult[];
  analysis: {
    overview: string;
    titlePatterns: string[];
    contentGaps: string[];
    nextVideoIdeas: { title: string; reason: string }[];
  };
}

function ChannelReviewPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/studio/channel-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelInput: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="border-b border-border pb-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Channel Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a channel handle or URL. See what's working and what to make next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="@channelname or youtube.com/@channelname"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Youtube className="size-4" />}
            {loading ? "Analyzing" : "Analyze"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Channel stats */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">{result.channel.title}</h2>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <Stat label="Subscribers" value={result.channel.subscriberCount} />
                <Stat label="Videos" value={result.channel.videoCount} />
                <Stat label="Median views" value={Math.round(result.medianViews)} />
              </div>
            </div>

            {/* Overview */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Overview</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {result.analysis.overview}
              </p>
            </div>

            {/* Top / outlier videos */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Top performing videos</h3>
              </div>
              <div className="mt-3 space-y-2">
                {result.topVideos.slice(0, 8).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{v.title}</span>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {v.outlierScore}x · {v.views.toLocaleString()} views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Title patterns */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Title patterns</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {result.analysis.titlePatterns.map((p, i) => (
                  <li key={i}>— {p}</li>
                ))}
              </ul>
            </div>

            {/* Content gaps */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Content gaps</h3>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {result.analysis.contentGaps.map((g, i) => (
                  <li key={i}>— {g}</li>
                ))}
              </ul>
            </div>

            {/* Next video ideas */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">What to make next</h3>
              </div>
              <div className="mt-3 space-y-3">
                {result.analysis.nextVideoIdeas.map((idea, i) => (
                  <div key={i} className="rounded-lg border border-border/60 p-3">
                    <p className="text-sm font-medium">{idea.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{idea.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
