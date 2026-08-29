import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clipboard,
  FileSearch,
  Lightbulb,
  Loader2,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  conductResearch,
  type ResearchResult,
} from "@/lib/research.functions";

export const Route = createFileRoute(
  "/_authenticated/studio/research",
)({
  head: () => ({
    meta: [{ title: "Research — Kodarai" }],
  }),
  component: ResearchPage,
});

type ResearchType =
  | "general"
  | "content"
  | "competitor"
  | "audience"
  | "trends";

function ResearchPage() {
  const runResearch =
    useServerFn(conductResearch);

  const [query, setQuery] = useState("");
  const [channelUrl, setChannelUrl] =
    useState("");

  const [researchType, setResearchType] =
    useState<ResearchType>("general");

  const [result, setResult] =
    useState<ResearchResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function handleResearch(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!query.trim()) {
      toast.error(
        "Enter something you want to research.",
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response =
        await runResearch({
          data: {
            query: query.trim(),
            channelUrl:
              channelUrl.trim() || undefined,
            researchType,
          },
        });

      if ("error" in response) {
        toast.error(response.message);
        return;
      }

      setResult(response.research);

      toast.success(
        "Research completed.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete research.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResearch() {
    if (!result) return;

    const text = [
      `RESEARCH: ${result.query}`,
      "",
      "SUMMARY",
      result.summary,
      "",
      "KEY FINDINGS",
      ...result.keyFindings.map(
        (finding, index) =>
          `${index + 1}. ${finding.title}\n${finding.explanation}`,
      ),
      "",
      "CONTENT GAPS",
      ...result.contentGaps.map(
        (gap) => `- ${gap}`,
      ),
      "",
      "OPPORTUNITIES",
      ...result.opportunities.map(
        (opportunity, index) =>
          `${index + 1}. ${opportunity.title}\nAngle: ${opportunity.angle}\nWhy: ${opportunity.reason}`,
      ),
      "",
      "RECOMMENDED ANGLES",
      ...result.recommendedAngles.map(
        (angle) => `- ${angle}`,
      ),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);

      toast.success(
        "Research copied.",
      );
    } catch {
      toast.error(
        "Could not copy research.",
      );
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

        <form
          onSubmit={handleResearch}
          className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="research-query">
                What do you want to research?
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="research-query"
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="e.g. AI tools creators are using to make money"
                  className="h-11 pl-9"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Be specific. Research can be about a niche,
                audience, competitor, trend or content opportunity.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Research type
              </Label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <ResearchTypeButton
                  active={
                    researchType === "general"
                  }
                  onClick={() =>
                    setResearchType(
                      "general",
                    )
                  }
                >
                  General
                </ResearchTypeButton>

                <ResearchTypeButton
                  active={
                    researchType === "content"
                  }
                  onClick={() =>
                    setResearchType(
                      "content",
                    )
                  }
                >
                  Content
                </ResearchTypeButton>

                <ResearchTypeButton
                  active={
                    researchType ===
                    "competitor"
                  }
                  onClick={() =>
                    setResearchType(
                      "competitor",
                    )
                  }
                >
                  Competitor
                </ResearchTypeButton>

                <ResearchTypeButton
                  active={
                    researchType ===
                    "audience"
                  }
                  onClick={() =>
                    setResearchType(
                      "audience",
                    )
                  }
                >
                  Audience
                </ResearchTypeButton>

                <ResearchTypeButton
                  active={
                    researchType ===
                    "trends"
                  }
                  onClick={() =>
                    setResearchType(
                      "trends",
                    )
                  }
                >
                  Trends
                </ResearchTypeButton>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-channel">
                YouTube channel{" "}
                <span className="font-normal text-muted-foreground">
                  optional
                </span>
              </Label>

              <Input
                id="research-channel"
                value={channelUrl}
                onChange={(event) =>
                  setChannelUrl(
                    event.target.value,
                  )
                }
                placeholder="@channelname or youtube.com/@channelname"
                className="h-11"
              />

              <p className="text-xs text-muted-foreground">
                Add a channel to give the research engine real
                performance data to analyze.
              </p>
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
                  Researching…
                </>
              ) : (
                <>
                  <FileSearch className="size-4" />
                  Start research
                </>
              )}
            </Button>
          </div>
        </form>

        {loading && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <FileSearch className="size-6 animate-pulse text-primary" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              Researching your topic
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Analyzing the available context and finding useful
              opportunities…
            </p>
          </div>
        )}

        {!loading && result && (
          <ResearchResults
            result={result}
            onCopy={copyResearch}
          />
        )}

        {!loading && !result && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <FileSearch className="size-6 text-primary" />
            </div>

            <h2 className="mt-4 text-base font-semibold">
              Research before you create
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Discover audience insights, content gaps, trends and
              opportunities before turning an idea into content.
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
        <FileSearch className="size-5 text-primary" />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Research
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Research niches, audiences, competitors and content
          opportunities before you create.
        </p>
      </div>
    </div>
  );
}

function ResearchTypeButton({
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

function ResearchResults({
  result,
  onCopy,
}: {
  result: ResearchResult;
  onCopy: () => void;
}) {
  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Research report
          </p>

          <h2 className="mt-1 text-lg font-bold tracking-tight">
            {result.query}
          </h2>

          {result.channel.name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Enhanced with data from{" "}
              {result.channel.name}.
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
        >
          <Clipboard className="size-3.5" />
          Copy research
        </Button>
      </div>

      {result.channel.name && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />

            <h3 className="text-sm font-semibold">
              Channel context
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ChannelStat
              label="Channel"
              value={result.channel.name}
            />

            <ChannelStat
              label="Subscribers"
              value={
                result.channel.subscribers !== null
                  ? result.channel.subscribers.toLocaleString()
                  : "Hidden"
              }
            />

            <ChannelStat
              label="Videos"
              value={
                result.channel.videos !== null
                  ? result.channel.videos.toLocaleString()
                  : "—"
              }
            />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-primary" />

          <h3 className="text-sm font-semibold">
            Executive summary
          </h3>
        </div>

        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {result.summary}
        </p>
      </section>

      <section>
        <SectionHeading
          icon={<Target className="size-4" />}
          title="Key findings"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {result.keyFindings.map(
            (finding, index) => (
              <FindingCard
                key={`${finding.title}-${index}`}
                finding={finding}
              />
            ),
          )}
        </div>
      </section>

      {result.trends.length > 0 && (
        <section>
          <SectionHeading
            icon={
              <TrendingUp className="size-4" />
            }
            title="Trends & signals"
          />

          <div className="mt-3 space-y-3">
            {result.trends.map(
              (trend, index) => (
                <div
                  key={`${trend.trend}-${index}`}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <h3 className="text-sm font-semibold">
                    {trend.trend}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {trend.whyItMatters}
                  </p>

                  <div className="mt-3 rounded-xl bg-primary/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Opportunity
                    </p>

                    <p className="mt-1 text-xs leading-relaxed">
                      {trend.opportunity}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {result.audienceInsights.length > 0 && (
        <section>
          <SectionHeading
            icon={
              <Users className="size-4" />
            }
            title="Audience insights"
          />

          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <ul className="space-y-3">
              {result.audienceInsights.map(
                (insight, index) => (
                  <li
                    key={index}
                    className="flex gap-3 text-sm"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />

                    <span className="leading-relaxed text-muted-foreground">
                      {insight}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>
      )}

      {result.contentGaps.length > 0 && (
        <section>
          <SectionHeading
            icon={
              <Target className="size-4" />
            }
            title="Content gaps"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.contentGaps.map(
              (gap, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed"
                >
                  {gap}
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          icon={
            <Lightbulb className="size-4" />
          }
          title="Content opportunities"
        />

        <div className="mt-3 space-y-3">
          {result.opportunities.map(
            (opportunity, index) => (
              <OpportunityCard
                key={`${opportunity.title}-${index}`}
                opportunity={opportunity}
                index={index}
              />
            ),
          )}
        </div>
      </section>

      {result.recommendedAngles.length > 0 && (
        <section>
          <SectionHeading
            icon={
              <Lightbulb className="size-4" />
            }
            title="Recommended angles"
          />

          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-2">
              {result.recommendedAngles.map(
                (angle, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    {angle}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {result.limitations.length > 0 && (
        <section className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />

            <h3 className="text-sm font-semibold">
              Research limitations
            </h3>
          </div>

          <ul className="mt-3 space-y-2">
            {result.limitations.map(
              (limitation, index) => (
                <li
                  key={index}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  — {limitation}
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

function FindingCard({
  finding,
}: {
  finding: {
    title: string;
    explanation: string;
    importance: "high" | "medium" | "low";
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {finding.title}
        </h3>

        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
          {finding.importance}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {finding.explanation}
      </p>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  index,
}: {
  opportunity: {
    title: string;
    angle: string;
    reason: string;
    potential: number;
  };
  index: number;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {opportunity.title}
            </h3>

            <span className="shrink-0 text-xs font-semibold text-primary">
              {opportunity.potential}/100
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Angle
              </p>

              <p className="mt-1.5 text-xs leading-relaxed">
                {opportunity.angle}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Why it could work
              </p>

              <p className="mt-1.5 text-xs leading-relaxed">
                {opportunity.reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-primary">
        {icon}
      </div>

      <h2 className="text-sm font-semibold">
        {title}
      </h2>
    </div>
  );
}

function ChannelStat({
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

      <p className="mt-1 text-sm font-semibold truncate">
        {value}
      </p>
    </div>
  );
}
