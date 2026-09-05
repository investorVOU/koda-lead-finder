import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, BookmarkPlus, Clock3, Lock, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { SearchForm } from "@/components/dashboard/SearchForm";
import { LeadResultCard } from "@/components/dashboard/LeadResultCard";
import { LeadResultSkeleton } from "@/components/dashboard/LeadResultSkeleton";
import { Button } from "@/components/ui/button";
import { findLeads } from "@/lib/search.functions";
import { useAuth } from "@/lib/auth";
import { useProfile, useSubscription, isFreeTrial } from "@/lib/queries";
import { hasPlanAccess } from "@/lib/billing";
import { UpgradeDialog } from "@/components/dashboard/UpgradeDialog";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearch,
} from "@/lib/saved-searches.functions";
import type { LeadResult } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Lead Finder — Kodarai" }] }),
  component: DashboardPage,
});

const PAGE_SIZE = 6;

function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: subscription } = useSubscription(user?.id);
  const queryClient = useQueryClient();
  const runSearch = useServerFn(findLeads);
  const runListSavedSearches = useServerFn(listSavedSearches);
  const runCreateSavedSearch = useServerFn(createSavedSearch);
  const runDeleteSavedSearch = useServerFn(deleteSavedSearch);

  const [results, setResults] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [meta, setMeta] = useState<{ category: string; location: string }>({ category: "", location: "" });
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const [savedSearchRun, setSavedSearchRun] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const agencyUser = !isFreeTrial(subscription) && hasPlanAccess(subscription?.plan, "agency");

  const loadSavedSearches = useCallback(async () => {
    if (!agencyUser) {
      setSavedSearches([]);
      return;
    }
    setSavedSearchesLoading(true);
    const res = await runListSavedSearches();
    setSavedSearchesLoading(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setSavedSearches(res.searches);
  }, [agencyUser, runListSavedSearches]);

  useEffect(() => {
    void loadSavedSearches();
  }, [loadSavedSearches]);

  const handleSearch = async (category: string, location: string, savedSearchId?: string) => {
    setLoading(true);
    setMeta({ category, location });
    setVisibleCount(PAGE_SIZE);
    setNewLeadIds(new Set());
    setSavedSearchRun(false);
    const res = await runSearch({ data: { category, location, savedSearchId } });
    setLoading(false);
    setSearched(true);

    if ("error" in res) {
      toast.error(res.message);
      setResults([]);
      return;
    }
    setResults(res.results);
    setNewLeadIds(new Set(res.newPlaceIds));
    setSavedSearchRun(res.hadPreviousSavedSearchRun);
    if (user) queryClient.invalidateQueries({ queryKey: ["subscription", user.id] });
    if (savedSearchId) void loadSavedSearches();
    if (res.demo) {
      toast.info("Showing sample results — connect Google Places for live data.");
    }
    const noSite = res.results.filter((r) => !r.hasWebsite).length;
    toast.success(`Found ${res.results.length} businesses · ${noSite} without a website`);
  };

  const saveCurrentSearch = async () => {
    if (!agencyUser) {
      setUpgradeOpen(true);
      return;
    }
    if (!meta.category || !meta.location) return;
    if (savedSearches.some((search) => search.category === meta.category && search.location === meta.location)) {
      toast.info("This search is already saved.");
      return;
    }

    setSavingSearch(true);
    const res = await runCreateSavedSearch({ data: meta });
    setSavingSearch(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setSavedSearches((current) => [res.search, ...current]);
    toast.success("Search saved. Run it again later to see what is new.");
  };

  const removeSavedSearch = async (id: string) => {
    const res = await runDeleteSavedSearch({ data: { id } });
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setSavedSearches((current) => current.filter((search) => search.id !== id));
    toast.success("Saved search removed.");
  };

  const shown = onlyNoWebsite ? results.filter((r) => !r.hasWebsite) : results;
  const visible = shown.slice(0, visibleCount);
  const hasMore = visibleCount < shown.length;

  // Reset paging when the filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [onlyNoWebsite]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, shown.length));
  }, [shown.length]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <DashboardShell>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">Lead Finder</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search high-rated local businesses without a website.
            </p>
          </div>

          <SearchForm
            onSearch={handleSearch}
            loading={loading}
            defaultCategory={profile?.primary_niche ?? undefined}
            defaultLocation={profile?.target_location ?? undefined}
          />

          {searched && !loading && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={saveCurrentSearch} disabled={savingSearch}>
                {agencyUser ? <BookmarkPlus className="size-4" /> : <Lock className="size-4" />}
                {savingSearch ? "Saving..." : "Save search"}
              </Button>
            </div>
          )}

          {(loading || searched) && (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {savedSearchRun && `${newLeadIds.size} new since last run · `}
                {loading ? "Searching…" : `${shown.length} result${shown.length === 1 ? "" : "s"}`}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyNoWebsite}
                  onChange={(e) => setOnlyNoWebsite(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                  disabled={loading}
                />
                No-website only
              </label>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <LeadResultSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && visible.length > 0 && (
            <>
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                {visible.map((lead) => (
                  <LeadResultCard
                    key={lead.placeId}
                    lead={lead}
                    category={meta.category}
                    location={meta.location}
                    isNew={newLeadIds.has(lead.placeId)}
                  />
                ))}
              </div>

              {hasMore && (
                <div ref={sentinelRef} className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={loadMore}>
                    Load more leads
                  </Button>
                </div>
              )}
              {!hasMore && shown.length > PAGE_SIZE && (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  You've reached the end — {shown.length} leads shown.
                </p>
              )}
            </>
          )}

          {/* Empty states */}
          {!searched && !loading && (
            <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Search className="size-6" />
              </span>
              <h3 className="mt-4 font-semibold">Run your first search</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Pick a category and location to find businesses that need a website.
              </p>
            </div>
          )}

          {searched && shown.length === 0 && !loading && (
            <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Search className="size-6 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No matching leads</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Try a different category or location, or uncheck "No-website only".
              </p>
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="space-y-4">
            <CreditMeter />
            <section className="hidden sm:block rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Saved searches</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Re-run a proven search and see businesses that appeared since your last run.
              </p>

              {agencyUser ? (
                savedSearchesLoading ? (
                  <p className="mt-4 text-xs text-muted-foreground">Loading searches...</p>
                ) : savedSearches.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {savedSearches.map((search) => (
                      <div key={search.id} className="group flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSearch(search.category, search.location, search.id)}
                          disabled={loading}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-medium text-foreground">{search.category}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{search.location}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedSearch(search.id)}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Delete saved search for ${search.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-muted/50 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                    Save a search after running it to build your repeatable prospecting list.
                  </p>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3 py-3 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5" /> Save repeatable searches</span>
                  <span className="text-primary">Agency</span>
                </button>
              )}
            </section>
          </div>
        </aside>
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="Saved searches"
        requiredPlan="agency"
      />
    </DashboardShell>
  );
}
