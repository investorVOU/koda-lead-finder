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
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Globe2,
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
        title: "Lead Finder — Kodarai",
      },
    ],
  }),
  component: DashboardPage,
});

const PAGE_SIZE = 6;

function DashboardPage() {
  const { user } = useAuth();

  const { data: profile } = useProfile(
    user?.id,
  );

  const { data: subscription } =
    useSubscription(user?.id);

  const queryClient = useQueryClient();

  const runSearch = useServerFn(findLeads);
  const runListSavedSearches =
    useServerFn(listSavedSearches);
  const runCreateSavedSearch =
    useServerFn(createSavedSearch);
  const runDeleteSavedSearch =
    useServerFn(deleteSavedSearch);

  const [results, setResults] = useState<
    LeadResult[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [meta, setMeta] = useState<{
    category: string;
    location: string;
  }>({
    category: "",
    location: "",
  });

  const [
    onlyNoWebsite,
    setOnlyNoWebsite,
  ] = useState(true);

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

  const [newLeadIds, setNewLeadIds] =
    useState<Set<string>>(new Set());

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

      setSavedSearchesLoading(true);

      const res =
        await runListSavedSearches();

      setSavedSearchesLoading(false);

      if ("error" in res) {
        toast.error(res.message);
        return;
      }

      setSavedSearches(res.searches);
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
    setVisibleCount(PAGE_SIZE);
    setNewLeadIds(new Set());
    setSavedSearchRun(false);

    const res = await runSearch({
      data: {
        category,
        location,
        savedSearchId,
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

    if (savedSearchId) {
      void loadSavedSearches();
    }

    if (res.demo) {
      toast.info(
        "Showing sample results — connect Google Places for live data.",
      );
    }

    const noSite =
      res.results.filter(
        (r) => !r.hasWebsite,
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

      if (
        savedSearches.some(
          (search) =>
            search.category ===
              meta.category &&
            search.location ===
              meta.location,
        )
      ) {
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
        toast.error(res.message);
        return;
      }

      setSavedSearches((current) => [
        res.search,
        ...current,
      ]);

      toast.success(
        "Search saved. Run it again later to see what is new.",
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
        toast.error(res.message);
        return;
      }

      setSavedSearches((current) =>
        current.filter(
          (search) =>
            search.id !== id,
        ),
      );

      toast.success(
        "Saved search removed.",
      );
    };

  const shown = onlyNoWebsite
    ? results.filter(
        (r) => !r.hasWebsite,
      )
    : results;

  const visible = shown.slice(
    0,
    visibleCount,
  );

  const hasMore =
    visibleCount < shown.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [onlyNoWebsite]);

  const sentinelRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const loadMore = useCallback(() => {
    setVisibleCount((c) =>
      Math.min(
        c + PAGE_SIZE,
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
            entries[0].isIntersecting
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
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* HERO */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-border
            bg-card
            px-5
            py-6
            shadow-sm
            sm:px-7
            sm:py-8
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-20
              -top-24
              size-64
              rounded-full
              bg-primary/10
              blur-3xl
            "
          />

          <div className="relative z-10">
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-primary/15
                bg-primary/[0.06]
                px-3
                py-1.5
                text-xs
                font-semibold
                text-primary
              "
            >
              <Sparkles className="size-3.5" />
              Lead discovery
            </div>

            <h1
              className="
                mt-4
                max-w-2xl
                text-3xl
                font-semibold
                tracking-tight
                text-foreground
                sm:text-4xl
              "
            >
              Find businesses that need
              a website.
            </h1>

            <p
              className="
                mt-3
                max-w-xl
                text-sm
                leading-6
                text-muted-foreground
                sm:text-base
              "
            >
              Search local businesses,
              spot strong prospects, and
              turn them into client
              opportunities.
            </p>

            <div
              className="
                mt-5
                flex
                flex-wrap
                items-center
                gap-2
                text-xs
                text-muted-foreground
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-border
                  bg-background/70
                  px-3
                  py-1.5
                "
              >
                <Globe2 className="size-3.5 text-primary" />
                Local business search
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-border
                  bg-background/70
                  px-3
                  py-1.5
                "
              >
                <Search className="size-3.5 text-primary" />
                Website opportunity filter
              </span>
            </div>
          </div>
        </section>

        {/* SEARCH + SIDEBAR */}

        <div
          className="
            grid
            min-w-0
            gap-6
            lg:grid-cols-[minmax(0,1fr)_300px]
          "
        >
          <div className="min-w-0">
            <section
              className="
                rounded-[26px]
                border
                border-border
                bg-card
                p-4
                shadow-sm
                sm:p-5
              "
            >
              <div
                className="
                  mb-4
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Search criteria
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Choose the business and
                    location you want to
                    target.
                  </p>
                </div>

                <span
                  className="
                    flex
                    size-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <SlidersHorizontal className="size-4" />
                </span>
              </div>

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

            {/* MOBILE SAVED SEARCHES */}

            <section
              className="
                mt-4
                rounded-[22px]
                border
                border-border
                bg-card
                p-4
                sm:hidden
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Clock3 className="size-4 text-primary" />

                  <div>
                    <p className="text-sm font-semibold">
                      Recent searches
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Run a saved search
                      again.
                    </p>
                  </div>
                </div>

                {!agencyUser && (
                  <span className="text-[10px] font-semibold text-primary">
                    Agency
                  </span>
                )}
              </div>

              {agencyUser ? (
                savedSearchesLoading ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Loading searches...
                  </p>
                ) : savedSearches.length >
                  0 ? (
                  <div className="mt-3 space-y-2">
                    {savedSearches
                      .slice(0, 3)
                      .map((search) => (
                        <button
                          key={
                            search.id
                          }
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
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-3
                            rounded-xl
                            border
                            border-border
                            bg-background/60
                            px-3
                            py-2.5
                            text-left
                            transition
                            hover:border-primary/30
                          "
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-foreground">
                              {
                                search.category
                              }
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {
                                search.location
                              }
                            </span>
                          </span>

                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Save a search after
                    running it and it will
                    appear here.
                  </p>
                )
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setUpgradeOpen(true)
                  }
                  className="
                    mt-3
                    w-full
                    rounded-xl
                    border
                    border-dashed
                    border-border
                    px-3
                    py-3
                    text-left
                    text-xs
                    text-muted-foreground
                  "
                >
                  Save repeatable searches
                  with Agency.
                </button>
              )}
            </section>

            {/* RESULTS TOOLBAR */}

            {(loading || searched) && (
              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  p-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {loading
                      ? "Searching..."
                      : `${shown.length} result${
                          shown.length === 1
                            ? ""
                            : "s"
                        }`}
                  </p>

                  {savedSearchRun && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {
                        newLeadIds.size
                      }{" "}
                      new since your last
                      run
                    </p>
                  )}
                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <label
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-border
                      bg-background
                      px-3
                      py-2
                      text-xs
                      font-medium
                    "
                  >
                    <input
                      type="checkbox"
                      checked={
                        onlyNoWebsite
                      }
                      onChange={(e) =>
                        setOnlyNoWebsite(
                          e.target
                            .checked,
                        )
                      }
                      className="size-4 accent-[var(--primary)]"
                      disabled={
                        loading
                      }
                    />
                    No website only
                  </label>

                  {!loading &&
                    searched && (
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
              </div>
            )}

            {/* LOADING */}

            {loading && (
              <div
                className="
                  mt-4
                  grid
                  min-w-0
                  gap-4
                  sm:grid-cols-2
                "
              >
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
              visible.length > 0 && (
                <>
                  <div
                    className="
                      mt-4
                      grid
                      min-w-0
                      gap-4
                      sm:grid-cols-2
                    "
                  >
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
                        You've reached the
                        end —{" "}
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
                    mt-5
                    flex
                    flex-col
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-dashed
                    border-border
                    bg-card/60
                    px-5
                    py-14
                    text-center
                  "
                >
                  <span
                    className="
                      flex
                      size-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-primary/10
                      text-primary
                    "
                  >
                    <Search className="size-6" />
                  </span>

                  <h3 className="mt-4 font-semibold">
                    Ready when you are
                  </h3>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                    Choose a category and
                    location above to start
                    finding potential
                    clients.
                  </p>
                </div>
              )}

            {searched &&
              shown.length === 0 &&
              !loading && (
                <div
                  className="
                    mt-5
                    flex
                    flex-col
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-dashed
                    border-border
                    bg-card/60
                    px-5
                    py-14
                    text-center
                  "
                >
                  <Search className="size-6 text-muted-foreground" />

                  <h3 className="mt-3 font-semibold">
                    No matching leads
                  </h3>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                    Try another category
                    or location, or turn
                    off the no-website
                    filter.
                  </p>
                </div>
              )}
          </div>

          {/* DESKTOP SIDE */}

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <CreditMeter />

              <section
                className="
                  rounded-[22px]
                  border
                  border-border
                  bg-card
                  p-4
                  shadow-sm
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Clock3 className="size-4 text-primary" />

                  <h2 className="text-sm font-semibold">
                    Saved searches
                  </h2>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Re-run proven searches
                  and spot newly added
                  businesses.
                </p>

                {agencyUser ? (
                  savedSearchesLoading ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Loading searches...
                    </p>
                  ) : savedSearches.length >
                    0 ? (
                    <div className="mt-4 space-y-2">
                      {savedSearches.map(
                        (search) => (
                          <div
                            key={
                              search.id
                            }
                            className="
                              group
                              flex
                              items-center
                              gap-2
                              rounded-xl
                              border
                              border-border
                              bg-background/50
                              px-3
                              py-2.5
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleSearch(
                                  search.category,
                                  search.location,
                                  search.id,
                                )
                              }
                              disabled={
                                loading
                              }
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-xs font-medium text-foreground">
                                {
                                  search.category
                                }
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
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
                                rounded-md
                                p-1
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
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-muted/50 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                      Save a search after
                      running it to build a
                      repeatable
                      prospecting list.
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setUpgradeOpen(true)
                    }
                    className="
                      mt-4
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-xl
                      border
                      border-dashed
                      border-border
                      px-3
                      py-3
                      text-left
                      text-xs
                      font-medium
                      text-muted-foreground
                      transition
                      hover:border-primary/40
                      hover:bg-primary/[0.03]
                    "
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="size-3.5" />
                      Save repeatable
                      searches
                    </span>

                    <span className="text-primary">
                      Agency
                    </span>
                  </button>
                )}
              </section>
            </div>
          </aside>
        </div>

        {/* MOBILE CREDIT METER BOTTOM */}

        <div className="lg:hidden">
          <CreditMeter />
        </div>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={
          setUpgradeOpen
        }
        feature="Saved searches"
        requiredPlan="agency"
      />
    </DashboardShell>
  );
}
