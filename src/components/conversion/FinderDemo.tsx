import { useEffect } from "react";
import { MapPin, Phone, Search, Star } from "lucide-react";
import { usePlanPreviewGate } from "@/components/billing/PlanPreviewGate";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

/** A clearly labelled illustration of Finder output for pending-plan accounts. */
export function FinderDemo() {
  const { guardAction } = usePlanPreviewGate();

  useEffect(() => {
    trackEvent("finder_demo_viewed");
  }, []);

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Example Finder result">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">Example</div>
          <h2 className="text-base font-semibold">See what Finder can help you find</h2>
          <p className="mt-1 text-sm text-muted-foreground">This is a demonstration, not a live search result.</p>
        </div>
        <Search className="mt-1 size-5 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">Restaurant</div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">Lagos</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Example filters">
        {["All", "No website", "Poor website", "Has website"].map((filter) => (
          <span key={filter} className={`rounded-full px-2.5 py-1 text-xs ${filter === "No website" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{filter}</span>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Example local restaurant</h3>
<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> Lagos, Nigeria</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" /> Contact preview: +234 80•• ••• 1234</p>
          </div>
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">No website</span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-sm"><Star className="size-4 fill-warning text-warning" /> 4.6 <span className="text-muted-foreground">(127 reviews)</span></p>
        <p className="mt-3 text-sm font-medium text-primary">Good opportunity</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">A popular restaurant without a website could be a great opportunity.</p>
        <Button className="mt-4 w-full sm:w-auto" onClick={() => { trackEvent("finder_demo_cta_clicked"); guardAction("finder_search"); }}>
          Find businesses like this
        </Button>
      </div>
    </section>
  );
}
