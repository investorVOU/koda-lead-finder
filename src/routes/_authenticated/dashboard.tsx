import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { SearchForm } from "@/components/dashboard/SearchForm";
import { LeadResultCard } from "@/components/dashboard/LeadResultCard";
import { LeadResultSkeleton } from "@/components/dashboard/LeadResultSkeleton";
import { Button } from "@/components/ui/button";

import { findLeads } from "@/lib/search.functions";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import {
  trackFinderSearch,
  trackFirstFinderSearch,
} from "@/lib/analytics";

import type { LeadResult } from "@/lib/constants";

export const Route = createFileRoute(
  "/_authenticated/dashboard",
)({
  head: () => ({
    meta: [
      {
        title: "Lead Finder — Kodarai",
      },
    ],
  }),
  component: DashboardPage,
});

const PAGE_SIZE = 6;

type WebsiteFilter =
  | "no-website"
  | "all"
  | "with-website";

function DashboardPage() {
  const { user } = useAuth();

  const { data: profile } =
    useProfile(user?.id);

  const queryClient =
    useQueryClient();

  const runSearch =
    useServerFn(findLeads);

  const [results, setResults] =
    useState<LeadResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [meta, setMeta] =
    useState<{
      category: string;
      location: string;
    }>({
      category: "",
      location: "",
    });

  const [
    websiteFilter,
    setWebsiteFilter,
  ] = useState<WebsiteFilter>(
    "no-website",
  );

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(PAGE_SIZE);

  const [
    newLeadIds,
    setNewLeadIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    savedSearchRun,
    setSavedSearchRun,
  ] = useState(false);

  const handleSearch = async (
    category: string,
    location: string,
  ) => {
    setLoading(true);
    setSearched(false);

    setMeta({
      category,
      location,
    });

    setVisibleCount(PAGE_SIZE);
    setNewLeadIds(new Set());
    setSavedSearchRun(false);

    const res = await runSearch({
      data: {
        category,
        location,
      },
    });

    setLoading(false);
    setSearched(true);

    if ("error" in res) {
      toast.error(res.message);
      setResults([]);
      return;
    }

    setResults(res.results);

    const [city, state] = location
      .split(",")
      .map((part) => part.trim());

    trackFinderSearch({
      category,
      state,
      city,
      website_filter: websiteFilter,
    });

    trackFirstFinderSearch(user?.id);

    setNewLeadIds(
      new Set(res.newPlaceIds),
    );

    setSavedSearchRun(
      res.hadPreviousSavedSearchRun,
    );

    if (user) {
      queryClient.invalidateQueries({
        queryKey: [
          "subscription",
          user.id,
        ],
      });
    }

    if (res.demo) {
      toast.info(
        "Showing sample results — connect Google Places for live data.",
      );
    }

    const noWebsiteCount =
      res.results.filter(
        (result) =>
          !result.hasWebsite,
      ).length;

    toast.success(
      `Found ${res.results.length} businesses · ${noWebsiteCount} without a website`,
    );
  };

  const shown =
    websiteFilter ===
    "no-website"
      ? results.filter(
          (result) =>
            !result.hasWebsite,
        )
      : websiteFilter ===
          "with-website"
        ? results.filter(
            (result) =>
              result.hasWebsite,
          )
        : results;

  const visible =
    shown.slice(
      0,
      visibleCount,
    );

  const hasMore =
    visibleCount <
    shown.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [websiteFilter]);

  const sentinelRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const loadMore =
    useCallback(() => {
      setVisibleCount(
        (current) =>
          Math.min(
            current + PAGE_SIZE,
            shown.length,
          ),
      );
    }, [shown.length]);

  useEffect(() => {
    if (!hasMore) return;

    const node =
      sentinelRef.current;

    if (!node) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries[0]
              ?.isIntersecting
          ) {
            loadMore();
          }
        },
        {
          rootMargin: "200px",
        },
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-3xl pb-4">
        {/* PAGE TITLE */}

        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Lead Finder
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Find businesses that need a
            website.
          </p>
        </header>

        {/* WEBSITE FILTER */}

        <div
          className="
            mb-3
            grid
            grid-cols-3
            rounded-xl
            border
            border-border
            bg-muted/30
            p-1
          "
        >
          <FilterButton
            active={
              websiteFilter ===
              "no-website"
            }
            onClick={() =>
              setWebsiteFilter(
                "no-website",
              )
            }
          >
            No website
          </FilterButton>

          <FilterButton
            active={
              websiteFilter === "all"
            }
            onClick={() =>
              setWebsiteFilter("all")
            }
          >
            All
          </FilterButton>

          <FilterButton
            active={
              websiteFilter ===
              "with-website"
            }
            onClick={() =>
              setWebsiteFilter(
                "with-website",
              )
            }
          >
            With website
          </FilterButton>
        </div>

        {/* SEARCH */}

        <section
          className="
            rounded-[20px]
            border
            border-border
            bg-card
            p-3.5
            shadow-sm
            sm:p-4
          "
        >
          <SearchForm
            onSearch={handleSearch}
            loading={loading}
            defaultCategory={
              profile?.primary_niche ??
              undefined
            }
            defaultLocation={
              profile?.target_location ??
              undefined
            }
          />
        </section>

        {/* SLIM CREDIT STATUS */}

        <div className="mt-3">
          <CreditMeter slim />
        </div>

        {/* RESULT HEADER */}

        {(loading || searched) && (
          <div
            className="
              mt-6
              flex
              items-center
              justify-between
              border-b
              border-border
              pb-3
            "
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                {loading
                  ? "Searching..."
                  : `${shown.length} lead${
                      shown.length === 1
                        ? ""
                        : "s"
                    }`}
              </p>

              {!loading &&
                savedSearchRun && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {
                      newLeadIds.size
                    }{" "}
                    new since your last
                    search
                  </p>
                )}
            </div>

            {!loading &&
              searched && (
                <span className="text-xs text-muted-foreground">
                  {websiteFilter ===
                  "no-website"
                    ? "No website"
                    : websiteFilter ===
                        "with-website"
                      ? "With website"
                      : "All businesses"}
                </span>
              )}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <LeadResultSkeleton
                key={index}
              />
            ))}
          </div>
        )}

        {/* RESULTS */}

        {!loading &&
          visible.length > 0 && (
            <>
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                {visible.map(
                  (lead) => (
                    <LeadResultCard
                      key={
                        lead.placeId
                      }
                      lead={lead}
                      category={
                        meta.category
                      }
                      location={
                        meta.location
                      }
                      isNew={newLeadIds.has(
                        lead.placeId,
                      )}
                    />
                  ),
                )}
              </div>

              {hasMore && (
                <div
                  ref={
                    sentinelRef
                  }
                  className="mt-6 flex justify-center"
                >
                  <Button
                    variant="outline"
                    onClick={
                      loadMore
                    }
                  >
                    Load more leads
                  </Button>
                </div>
              )}

              {!hasMore &&
                shown.length >
                  PAGE_SIZE && (
                  <p className="mt-6 text-center text-xs text-muted-foreground">
                    {shown.length} leads
                    shown.
                  </p>
                )}
            </>
          )}

        {/* EMPTY */}

        {!searched &&
          !loading && (
            <div
              className="
                mt-4
                flex
                min-h-[210px]
                flex-col
                items-center
                justify-center
                rounded-[20px]
                border
                border-dashed
                border-border
                px-5
                py-8
                text-center
              "
            >
              <span
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Search className="size-5" />
              </span>

              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Find your next client
              </h3>

              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                Pick a category and
                location to start
                searching.
              </p>
            </div>
          )}

        {searched &&
          !loading &&
          shown.length === 0 && (
            <div
              className="
                mt-4
                flex
                min-h-[180px]
                flex-col
                items-center
                justify-center
                rounded-[20px]
                border
                border-dashed
                border-border
                px-5
                py-8
                text-center
              "
            >
              <Search className="size-5 text-muted-foreground" />

              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No matching leads
              </h3>

              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                Try another business
                category, location, or
                website filter.
              </p>
            </div>
          )}
      </div>
    </DashboardShell>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg
        px-2
        py-2
        text-[11px]
        font-semibold
        transition
        sm:text-xs

        ${
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}
