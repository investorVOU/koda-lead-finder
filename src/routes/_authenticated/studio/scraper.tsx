import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  FileText,
  Globe,
  Headphones,
  KeyRound,
  Lightbulb,
  Loader2,
  Quote,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  scrapeUrl,
  type ScrapeMode,
  type ScrapeResult,
} from "@/lib/scraper.functions";

export const Route = createFileRoute(
  "/_authenticated/studio/scraper",
)({
  head: () => ({
    meta: [{ title: "Web Scraper — Kodarai" }],
  }),
  component: ScraperPage,
});

const MODES: {
  value: ScrapeMode;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: "article",
    label: "Article",
    description: "Clean and understand the page",
    icon: FileText,
  },
  {
    value: "summary",
    label: "Summary",
    description: "Get the main points quickly",
    icon: Sparkles,
  },
  {
    value: "key-points",
    label: "Key points",
    description: "Extract useful takeaways",
    icon: KeyRound,
  },
  {
    value: "headlines",
    label: "Headlines",
    description: "Create content angles",
    icon: Type,
  },
  {
    value: "quotes",
    label: "Quotes",
    description: "Find notable direct quotes",
    icon: Quote,
  },
  {
    value: "full",
    label: "Full extraction",
    description: "Get everything useful",
    icon: Globe,
  },
];

function ScraperPage() {
  const scrape = useServerFn(scrapeUrl);

  const [url, setUrl] = useState("");
  const [mode, setMode] =
    useState<ScrapeMode>("article");

  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<ScrapeResult | null>(null);

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const value = url.trim();

    if (!value) {
      toast.error("Enter a URL first.");
      return;
    }

    try {
      new URL(value);
    } catch {
      toast.error(
        "Enter a valid URL, including https://",
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await scrape({
        data: {
          url: value,
          mode,
        },
      });

      if ("error" in response) {
        toast.error(response.message);
        return;
      }

      setResult(response.result);

      toast.success("Page scraped successfully.");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not scrape this page.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(
    text: string,
    label = "Content",
  ) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  }

  function copyAll() {
    if (!result) return;

    const sections = [
      result.title
        ? `TITLE\n${result.title}`
        : "",
      result.summary
        ? `SUMMARY\n${result.summary}`
        : "",
      result.keyPoints.length
        ? `KEY POINTS\n${result.keyPoints
            .map((point) => `• ${point}`)
            .join("\n")}`
        : "",
      result.content
        ? `CONTENT\n${result.content}`
        : "",
      result.headlines.length
        ? `HEADLINES\n${result.headlines
            .map((headline) => `• ${headline}`)
            .join("\n")}`
        : "",
      result.quotes.length
        ? `QUOTES\n${result.quotes
            .map((quote) => `"${quote}"`)
            .join("\n")}`
        : "",
    ].filter(Boolean);

    copyText(sections.join("\n\n"), "Everything");
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

        {/* Scraper form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="scraper-url">
                URL to scrape
              </Label>

              <div className="relative">
                <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="scraper-url"
                  value={url}
                  onChange={(event) =>
                    setUrl(event.target.value)
                  }
                  placeholder="https://example.com/article"
                  className="h-11 pl-9"
                  type="url"
                  autoComplete="url"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Paste an article, blog post, news page,
                documentation page or other public web page.
              </p>
            </div>

            <div className="space-y-2">
              <Label>What do you want from it?</Label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MODES.map((item) => {
                  const Icon = item.icon;
                  const active =
                    mode === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setMode(item.value)
                      }
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`size-4 ${
                            active
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />

                        <span
                          className={`text-xs font-semibold ${
                            active
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
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
                  Scraping and analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Scrape page
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Globe className="size-6 animate-pulse text-primary" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              Reading the page
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Fetching the page and extracting useful
              information…
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div className="mt-8 space-y-5">
            <ResultHeader
              result={result}
              onCopyAll={copyAll}
            />

            {/* Summary */}
            {result.summary && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <SectionHeader
                  icon={Sparkles}
                  title="Summary"
                />

                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {result.summary}
                </p>
              </section>
            )}

            {/* Key points */}
            {result.keyPoints.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <SectionHeader
                  icon={KeyRound}
                  title="Key points"
                />

                <div className="mt-4 space-y-3">
                  {result.keyPoints.map(
                    (point, index) => (
                      <div
                        key={`${point}-${index}`}
                        className="flex gap-3 rounded-xl bg-muted/40 p-3"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                          {index + 1}
                        </span>

                        <p className="text-sm leading-relaxed">
                          {point}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Content */}
            {result.content && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <SectionHeader
                    icon={FileText}
                    title="Extracted content"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyText(
                        result.content,
                        "Content",
                      )
                    }
                  >
                    <Clipboard className="size-3.5" />
                    Copy
                  </Button>
                </div>

                <div className="mt-4 max-h-[600px] overflow-y-auto rounded-xl bg-muted/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {result.content}
                  </p>
                </div>
              </section>
            )}

            {/* Headlines */}
            {result.headlines.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <SectionHeader
                  icon={Type}
                  title="Content headlines"
                />

                <div className="mt-4 space-y-2">
                  {result.headlines.map(
                    (headline, index) => (
                      <div
                        key={`${headline}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3"
                      >
                        <div className="flex gap-3">
                          <span className="text-xs font-bold text-primary">
                            {index + 1}.
                          </span>

                          <p className="text-sm font-medium">
                            {headline}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              headline,
                              "Headline",
                            )
                          }
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Copy headline"
                        >
                          <Clipboard className="size-3.5" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Quotes */}
            {result.quotes.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <SectionHeader
                  icon={Quote}
                  title="Notable quotes"
                />

                <div className="mt-4 space-y-3">
                  {result.quotes.map(
                    (quote, index) => (
                      <blockquote
                        key={`${quote}-${index}`}
                        className="rounded-xl border-l-2 border-primary bg-muted/30 p-4"
                      >
                        <p className="text-sm italic leading-6">
                          “{quote}”
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              quote,
                              "Quote",
                            )
                          }
                          className="mt-2 text-[10px] font-medium text-primary hover:underline"
                        >
                          Copy quote
                        </button>
                      </blockquote>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Actions */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="size-4 text-primary" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Use this research
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The next step is connecting scraped
                    research directly to Ideas, Content
                    Studio and your saved research library.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAll}
                >
                  <Clipboard className="size-3.5" />
                  Copy everything
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Ideas integration comes next"
                >
                  <Lightbulb className="size-3.5" />
                  Generate ideas
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Content integration comes next"
                >
                  <PenIcon />
                  Create content
                </Button>
              </div>
            </section>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Globe className="size-6 text-primary" />
            </div>

            <h2 className="mt-4 text-base font-semibold">
              Turn any web page into usable research
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Paste an article, documentation page, news
              story or other public URL. Kodarai will extract
              the useful information and turn it into
              structured research.
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
        <Globe className="size-5 text-primary" />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Web Scraper
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Turn any public web page into clean research,
          summaries, insights and content opportunities.
        </p>
      </div>
    </div>
  );
}

function ResultHeader({
  result,
  onCopyAll,
}: {
  result: ScrapeResult;
  onCopyAll: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-primary" />

            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Scraped successfully
            </span>
          </div>

          <h2 className="mt-2 text-lg font-bold tracking-tight">
            {result.title}
          </h2>

          {result.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {result.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {result.wordCount.toLocaleString()} words
            </span>

            <span className="max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {result.url}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onCopyAll}
        >
          <Clipboard className="size-3.5" />
          Copy all
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />

      <h3 className="text-sm font-semibold">
        {title}
      </h3>
    </div>
  );
}

function PenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
