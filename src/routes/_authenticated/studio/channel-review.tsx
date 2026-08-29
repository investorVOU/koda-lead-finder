import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Youtube,
  Loader2,
  TrendingUp,
  Lightbulb,
  Target,
  Users,
  Video,
  Eye,
  ExternalLink,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { ChannelReviewResult } from "@/lib/channel-review.functions";

export const Route = createFileRoute("/_authenticated/studio/channel-review")({
  head: () => ({
    meta: [{ title: "Channel Review — Kodarai" }],
  }),
  component: ChannelReviewPage,
});

function ChannelReviewPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChannelReviewResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim()) {
      setError("Enter a YouTube channel URL or handle.");
      return;
    }

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

      if (!res.ok || "error" in data) {
        throw new Error(data.message ?? "Something went wrong while reviewing the channel.");
      }

      setResult(data as ChannelReviewResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reviewing the channel.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";

    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return value.toLocaleString();
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="border-b border-border pb-5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10">
              <Youtube className="size-5 text-red-500" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Channel Review
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Find what's working, what's missing, and what to make next.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Youtube className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  placeholder="@channelname or youtube.com/@channelname"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Analyze channel
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Paste a YouTube handle, channel URL, or channel ID. We'll analyze
              the channel's recent videos and performance patterns.
            </p>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              Reviewing the channel
            </h2>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Pulling channel data from YouTube and analyzing the content
              patterns with AI.
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Channel header */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {result.channel.thumbnailUrl ? (
                    <img
                      src={result.channel.thumbnailUrl}
                      alt={result.channel.title}
                      className="size-16 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Youtube className="size-7 text-primary" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold">
                      {result.channel.title}
                    </h2>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {result.channel.description ||
                        "No channel description available."}
                    </p>
                  </div>

                  <a
                    href={`https://www.youtube.com/channel/${result.channel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted sm:flex"
                  >
                    YouTube
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {/* Stats */}
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatCard
                    icon={<Users className="size-4" />}
                    label="Subscribers"
                    value={formatNumber(result.channel.subscribers)}
                  />

                  <StatCard
                    icon={<Video className="size-4" />}
                    label="Videos"
                    value={formatNumber(result.channel.videoCount)}
                  />

                  <StatCard
                    icon={<Eye className="size-4" />}
                    label="Channel views"
                    value={formatNumber(result.channel.viewCount)}
                  />

                  <StatCard
                    icon={<BarChart3 className="size-4" />}
                    label="Median views"
                    value={formatNumber(result.medianViews)}
                  />
                </div>
              </div>
            </div>

            {/* AI overview */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    AI channel assessment
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    What the data says
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {result.analysis.overview}
              </p>
            </section>

            {/* Top performing videos */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="size-4 text-primary" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Top performing videos
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Videos that significantly outperform the channel median
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {result.topVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="flex gap-3 rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-muted/40"
                  >
                    {/* Thumbnail */}
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-16 w-28 shrink-0 rounded-lg object-cover sm:h-20 sm:w-36"
                      />
                    ) : (
                      <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-20 sm:w-36">
                        <Youtube className="size-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="hidden shrink-0 text-xs font-bold text-muted-foreground sm:block">
                          #{index + 1}
                        </span>

                        <p className="line-clamp-2 text-xs font-semibold leading-5 sm:text-sm">
                          {video.title}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium">
                          {formatNumber(video.views)} views
                        </span>

                        {video.outlierScore > 1 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {video.outlierScore}× median
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Title patterns + content gaps */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Title patterns */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="size-4 text-primary" />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Title patterns
                  </h3>
                </div>

                <ul className="mt-4 space-y-2">
                  {result.analysis.titlePatterns.map((pattern, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span className="mr-2 font-bold text-primary">
                        {index + 1}.
                      </span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Content gaps */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="size-4 text-primary" />
                  </div>

                  <h3 className="text-sm font-semibold">
                    Content opportunities
                  </h3>
                </div>

                <ul className="mt-4 space-y-2">
                  {result.analysis.contentGaps.map((gap, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span className="mr-2 font-bold text-primary">
                        {index + 1}.
                      </span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Next video ideas */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="size-4 text-primary" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    What to make next
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    AI-generated opportunities based on the channel's data
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.analysis.nextVideoIdeas.map((idea, index) => (
                  <div
                    key={index}
                    className="group rounded-xl border border-border/60 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5">
                          {idea.title}
                        </p>

                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {idea.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    Turn this analysis into content
                  </h3>

                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Use these insights to research the niche, generate more
                    video ideas, or build a complete content plan.
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInput("");
                      setResult(null);
                      setError(null);
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Review another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <TrendingUp className="size-7 text-primary" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              Analyze a YouTube channel
            </h2>

            <p className="mx-auto mt-1.5 max-w-md px-4 text-xs leading-relaxed text-muted-foreground">
              Enter a channel above and Kodarai will pull its recent videos,
              calculate performance benchmarks, identify patterns, and use AI
              to recommend what the creator should make next.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>

      <p className="mt-1.5 text-sm font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}
