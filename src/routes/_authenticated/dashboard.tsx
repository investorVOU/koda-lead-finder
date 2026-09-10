import { createFileRoute } from "@tanstack/react-router";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Search,
  BookmarkPlus,
  Clock3,
  Lock,
  Trash2,
  ArrowRight,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { SearchForm } from "@/components/dashboard/SearchForm";
import { LeadResultCard } from "@/components/dashboard/LeadResultCard";
import { LeadResultSkeleton } from "@/components/dashboard/LeadResultSkeleton";
import { Button } from "@/components/ui/button";

import { findLeads } from "@/lib/search.functions";
import { useAuth } from "@/lib/auth";

import {
  useProfile,
  useSubscription,
  isFreeTrial,
} from "@/lib/queries";

import { hasPlanAccess } from "@/lib/billing";

import { UpgradeDialog } from "@/components/dashboard/UpgradeDialog";

import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearch,
} from "@/lib/saved-searches.functions";

import type { LeadResult } from "@/lib/constants";

export const Route = createFileRoute(
  "/_authenticated/dashboard",
)({
  head: () => ({
    meta: [
      {
        title:
          "Lead Finder — Kodarai",
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

  const {
    data: subscription,
  } = useSubscription(user?.id);

  const queryClient =
    useQueryClient();

  const runSearch =
    useServerFn(findLeads);

  const runListSavedSearches =
    useServerFn(
      listSavedSearches,
    );

  const runCreateSavedSearch =
    useServerFn(
      createSavedSearch,
    );

  const runDeleteSavedSearch =
    useServerFn(
      deleteSavedSearch,
    );

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
    savedSearches,
    setSavedSearches,
  ] = useState<SavedSearch[]>([]);

  const [
    savedSearchesLoading,
    setSavedSearchesLoading,
  ] = useState(false);

  const [
    savingSearch,
    setSavingSearch,
  ] = useState(false);

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

  const [
    upgradeOpen,
    setUpgradeOpen,
  ] = useState(false);

  const agencyUser =
    !isFreeTrial(subscription) &&
    hasPlanAccess(
      subscription?.plan,
      "agency",
    );

  const loadSavedSearches =
    useCallback(async () => {
      if (!agencyUser) {
        setSavedSearches([]);
        return;
      }

      setSavedSearchesLoading(
        true,
      );

      const res =
        await runListSavedSearches();

      setSavedSearchesLoading(
        false,
      );

      if ("error" in res) {
        toast.error(
          res.message,
        );
        return;
      }

      setSavedSearches(
        res.searches,
      );
    }, [
      agencyUser,
      runListSavedSearches,
    ]);

  useEffect(() => {
    void loadSavedSearches();
  }, [loadSavedSearches]);

  const handleSearch = async (
    category: string,
    location: string,
    savedSearchId?: string,
  ) => {
    setLoading(true);

    setMeta({
      category,
      location,
    });

    setVisibleCount(
      PAGE_SIZE,
    );

    setNewLeadIds(
      new Set(),
    );

    setSavedSearchRun(
      false,
    );

    const res =
      await runSearch({
        data: {
          category,
          location,
          savedSearchId,
        },
      });

    setLoading(false);
    setSearched(true);

    if ("error" in res) {
      toast.error(
        res.message,
      );

      setResults([]);
      return;
    }

    setResults(
      res.results,
    );

    setNewLeadIds(
      new Set(
        res.newPlaceIds,
      ),
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

    if (
      savedSearchId
    ) {
      void loadSavedSearches();
    }

    if (res.demo) {
      toast.info(
        "Showing sample results — connect Google Places for live data.",
      );
    }

    const noSite =
      res.results.filter(
        (r) =>
          !r.hasWebsite,
      ).length;

    toast.success(
      `Found ${res.results.length} businesses · ${noSite} without a website`,
    );
  };

  const saveCurrentSearch =
    async () => {
      if (!agencyUser) {
        setUpgradeOpen(true);
        return;
      }

      if (
        !meta.category ||
        !meta.location
      ) {
        return;
      }

      const alreadySaved =
        savedSearches.some(
          (search) =>
            search.category ===
              meta.category &&
            search.location ===
              meta.location,
        );

      if (alreadySaved) {
        toast.info(
          "This search is already saved.",
        );
        return;
      }

      setSavingSearch(true);

      const res =
        await runCreateSavedSearch({
          data: meta,
        });

      setSavingSearch(false);

      if ("error" in res) {
        toast.error(
          res.message,
        );
        return;
      }

      setSavedSearches(
        (current) => [
          res.search,
          ...current,
        ],
      );

      toast.success(
        "Search saved.",
      );
    };

  const removeSavedSearch =
    async (id: string) => {
      const res =
        await runDeleteSavedSearch({
          data: {
            id,
          },
        });

      if ("error" in res) {
        toast.error(
          res.message,
        );
        return;
      }

      setSavedSearches(
        (current) =>
          current.filter(
            (search) =>
              search.id !== id,
          ),
      );

      toast.success(
        "Saved search removed.",
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
    setVisibleCount(
      PAGE_SIZE,
    );
  }, [websiteFilter]);

  const sentinelRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const loadMore =
    useCallback(() => {
      setVisibleCount(
        (count) =>
          Math.min(
            count +
              PAGE_SIZE,
            shown.length,
          ),
      );
    }, [shown.length]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const node =
      sentinelRef.current;

    if (!node) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries[0]
              .isIntersecting
          ) {
            loadMore();
          }
        },
        {
          rootMargin:
            "200px",
        },
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, [
    hasMore,
    loadMore,
  ]);

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-3xl pb-6">
        {/* HEADER */}

        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Lead Finder
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Find businesses
            that need a
            website.
          </p>
        </div>

        {/* WEBSITE FILTER */}

        <div
          className="
            mb-4
            grid
            grid-cols-3
            rounded-xl
            border
            border-border
            bg-muted/40
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
              websiteFilter ===
              "all"
            }
            onClick={() =>
              setWebsiteFilter(
                "all",
              )
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

        {/* SEARCH CARD */}

        <section
          className="
            rounded-[24px]
            border
            border-border
            bg-card
            p-4
            shadow-sm
            sm:p-5
          "
        >
          <SearchForm
            onSearch={
              handleSearch
            }
            loading={
              loading
            }
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

        {/* RECENT SEARCHES */}

        <section className="mt-6">
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent searches
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Quickly run a
                search again.
              </p>
            </div>

            {!agencyUser && (
              <button
                type="button"
                onClick={() =>
                  setUpgradeOpen(
                    true,
                  )
                }
                className="text-xs font-semibold text-primary"
              >
                Agency
              </button>
            )}
          </div>

          {agencyUser ? (
            savedSearchesLoading ? (
              <div
                className="
                  rounded-xl
                  border
                  border-border
                  bg-card
                  px-4
                  py-4
                  text-xs
                  text-muted-foreground
                "
              >
                Loading
                searches...
              </div>
            ) : savedSearches.length >
              0 ? (
              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-border
                  bg-card
                "
              >
                {savedSearches
                  .slice(0, 4)
                  .map(
                    (
                      search,
                      index,
                    ) => (
                      <div
                        key={
                          search.id
                        }
                        className={
                          index >
                          0
                            ? "border-t border-border"
                            : ""
                        }
                      >
                        <div
                          className="
                            group
                            flex
                            items-center
                            gap-3
                            px-4
                            py-3
                          "
                        >
                          <button
                            type="button"
                            disabled={
                              loading
                            }
                            onClick={() =>
                              handleSearch(
                                search.category,
                                search.location,
                                search.id,
                              )
                            }
                            className="
                              min-w-0
                              flex-1
                              text-left
                            "
                          >
                            <p className="truncate text-sm font-medium text-foreground">
                              {
                                search.category
                              }
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {
                                search.location
                              }
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeSavedSearch(
                                search.id,
                              )
                            }
                            className="
                              rounded-lg
                              p-2
                              text-muted-foreground
                              opacity-0
                              transition
                              hover:bg-destructive/10
                              hover:text-destructive
                              group-hover:opacity-100
                              focus-visible:opacity-100
                            "
                            aria-label={`Delete saved search for ${search.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>

                          <ArrowRight className="size-4 text-muted-foreground" />
                        </div>
                      </div>
                    ),
                  )}
              </div>
            ) : (
              <div
                className="
                  rounded-2xl
                  border
                  border-dashed
                  border-border
                  bg-card/60
                  px-4
                  py-5
                  text-sm
                  text-muted-foreground
                "
              >
                Your saved
                searches will
                appear here.
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() =>
                setUpgradeOpen(
                  true,
                )
              }
              className="
                flex
                w-full
                items-center
                justify-between
                rounded-2xl
                border
                border-dashed
                border-border
                bg-card
                px-4
                py-4
                text-left
              "
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" />
                Save repeatable
                searches
              </span>

              <span className="text-xs font-semibold text-primary">
                Agency
              </span>
            </button>
          )}
        </section>

        {/* CREDIT */}

        <div className="mt-6">
          <CreditMeter />
        </div>

        {/* RESULTS HEADER */}

        {(loading ||
          searched) && (
          <div
            className="
              mt-7
              flex
              items-center
              justify-between
              gap-3
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
                      shown.length ===
                      1
                        ? ""
                        : "s"
                    }`}
              </p>

              {savedSearchRun && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {
                    newLeadIds.size
                  }{" "}
                  new since
                  last run
                </p>
              )}
            </div>

            {searched &&
              !loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    saveCurrentSearch
                  }
                  disabled={
                    savingSearch
                  }
                >
                  {agencyUser ? (
                    <BookmarkPlus className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}

                  {savingSearch
                    ? "Saving..."
                    : "Save"}
                </Button>
              )}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from({
              length: 4,
            }).map((_, i) => (
              <LeadResultSkeleton
                key={i}
              />
            ))}
          </div>
        )}

        {/* RESULTS */}

        {!loading &&
          visible.length >
            0 && (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {visible.map(
                  (lead) => (
                    <LeadResultCard
                      key={
                        lead.placeId
                      }
                      lead={
                        lead
                      }
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
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}

        {/* EMPTY STATE */}

        {!searched &&
          !loading && (
            <div
              className="
                mt-7
                flex
                flex-col
                items-center
                justify-center
                rounded-2xl
                border
                border-dashed
                border-border
                px-5
                py-12
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

              <h3 className="mt-3 text-sm font-semibold">
                Find your next
                client
              </h3>

              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                Pick a category
                and location to
                start searching.
              </p>
            </div>
          )}

        {searched &&
          !loading &&
          shown.length ===
            0 && (
            <div
              className="
                mt-7
                rounded-2xl
                border
                border-dashed
                border-border
                px-5
                py-10
                text-center
              "
            >
              <Search className="mx-auto size-5 text-muted-foreground" />

              <h3 className="mt-3 text-sm font-semibold">
                No matching
                leads
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Try changing
                your location,
                category or
                website filter.
              </p>
            </div>
          )}
      </div>

      <UpgradeDialog
        open={
          upgradeOpen
        }
        onOpenChange={
          setUpgradeOpen
        }
        feature="Saved searches"
        requiredPlan="agency"
      />
    </DashboardShell>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children:
    React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        rounded-lg
        px-2
        py-2.5
        text-[11px]
        font-semibold
        transition-all
        sm:text-xs

        ${
          active
            ? "bg-background text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}
