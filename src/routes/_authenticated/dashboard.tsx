import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { SearchForm } from "@/components/dashboard/SearchForm";
import { LeadResultCard } from "@/components/dashboard/LeadResultCard";
import { LeadResultSkeleton } from "@/components/dashboard/LeadResultSkeleton";
import { Button } from "@/components/ui/button";
import { findLeads } from "@/lib/search.functions";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import type { LeadResult } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Lead Finder — Kodarai" }] }),
  component: DashboardPage,
});

const PAGE_SIZE = 6;

function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const runSearch = useServerFn(findLeads);

  const [results, setResults] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [meta, setMeta] = useState<{ category: string; location: string }>({ category: "", location: "" });
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleSearch = async (category: string, location: string) => {
    setLoading(true);
    setMeta({ category, location });
    setVisibleCount(PAGE_SIZE);
    const res = await runSearch({ data: { category, location } });
    setLoading(false);
    setSearched(true);

    if ("error" in res) {
      toast.error(res.message);
      setResults([]);
      return;
    }
    setResults(res.results);
    if (user) queryClient.invalidateQueries({ queryKey: ["subscription", user.id] });
    if (res.demo) {
      toast.info("Showing sample results — connect Google Places for live data.");
    }
    const noSite = res.results.filter((r) => !r.hasWebsite).length;
    toast.success(`Found ${res.results.length} businesses · ${noSite} without a website`);
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
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="order-2 lg:order-1">
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

          {(loading || searched) && (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <LeadResultSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && visible.length > 0 && (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {visible.map((lead) => (
                  <LeadResultCard
                    key={lead.placeId}
                    lead={lead}
                    category={meta.category}
                    location={meta.location}
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
          <CreditMeter />
        </aside>
      </div>
    </DashboardShell>
  );
}
