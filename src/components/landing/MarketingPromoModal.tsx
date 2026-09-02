import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const MARKETING_PROMO_ENABLED =
  import.meta.env.VITE_ENABLE_MARKETING_PROMO_MODAL !== "false";
const DISMISSAL_KEY = "kodarai.marketing-promo-dismissed-at";
const DISMISSAL_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export function MarketingPromoModal() {
  const [open, setOpen] = useState(false);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    } catch {
      // A blocked storage setting should not prevent the visitor from browsing.
    }
  };

  useEffect(() => {
    if (!MARKETING_PROMO_ENABLED) return;

    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISSAL_KEY));
      if (dismissedAt && Date.now() - dismissedAt < DISMISSAL_PERIOD_MS) return;
    } catch {
      // Show the offer once when storage is unavailable.
    }

    const timer = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!MARKETING_PROMO_ENABLED) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl gap-0 overflow-y-auto border-border p-0 sm:rounded-2xl">
        <div className="bg-primary px-6 py-7 text-primary-foreground sm:px-9 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            Kodarai for web designers
          </p>
          <DialogTitle className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Your next website client is already nearby.
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-lg text-base leading-relaxed text-primary-foreground/80">
            Find strong local businesses without a website, prepare a sharper pitch, and move from research to a real project in one workflow.
          </DialogDescription>
        </div>

        <div className="bg-background p-6 sm:p-9">
          <p className="text-sm font-semibold text-foreground">A clearer path to your next client</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Spot the gap", "Search for businesses that need a better online presence."],
              ["02", "Make it personal", "Use the business details to prepare a relevant outreach."],
              ["03", "Build momentum", "Turn a good lead into a site project with Studio."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-xl border border-border bg-muted/35 p-4">
                <p className="text-xs font-bold tracking-wider text-primary">{number}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="hero" size="lg" className="flex-1" asChild>
              <a href="/signup">Start finding leads</a>
            </Button>
            <Button variant="outline" size="lg" className="flex-1" asChild>
              <a href="/#pricing">See plans and pricing</a>
            </Button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Continue exploring
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
