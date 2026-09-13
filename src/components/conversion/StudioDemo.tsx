import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Globe2 } from "lucide-react";
import { usePlanPreviewGate } from "@/components/billing/PlanPreviewGate";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

/** Shows the value of Studio before a pending-plan user can create a project. */
export function StudioDemo() {
  const { guardAction } = usePlanPreviewGate();

  useEffect(() => {
    trackEvent("studio_demo_viewed");
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">Studio example</div>
          <h2 className="text-lg font-semibold">Create professional websites with AI</h2>
          <p className="mt-1 text-sm text-muted-foreground">See the difference a useful website can make for a local business.</p>
        </div>
        <Globe2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-background p-3">
            <p className="text-sm font-semibold">Example restaurant</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">No clear menu, opening hours, location, or simple way for customers to get in touch online.</p>
          </div>
        </div>
        <ArrowRight className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">After</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-primary/20 bg-background">
            <div className="h-5 bg-primary/15" />
            <div className="p-3">
              <p className="text-sm font-semibold">A clear, mobile-friendly website</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Menu, location, contact button and a professional first impression ? made from a clearly labelled demonstration.</p>
              <div className="mt-3 h-6 w-24 rounded bg-primary/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Choose a plan to start building websites.</p>
        <Button onClick={() => { trackEvent("studio_demo_cta_clicked"); guardAction("studio_new_website"); }}>
          Build one for a business <CheckCircle2 className="size-4" />
        </Button>
      </div>
    </section>
  );
}
