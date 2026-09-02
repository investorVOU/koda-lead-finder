import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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

    const timer = window.setTimeout(() => setOpen(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!MARKETING_PROMO_ENABLED) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-border p-0 shadow-2xl">
        <div className="relative bg-primary px-5 pb-5 pt-6 text-primary-foreground sm:px-7 sm:pb-6 sm:pt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
            For web designers
          </p>
          <DialogTitle className="mt-2 pr-7 text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]">
            Find businesses that need a new or better website.
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-primary-foreground/80">
            Turn the best opportunities into paid website projects—and grow your income with every client you close.
          </DialogDescription>
        </div>

        <div className="bg-background px-5 py-5 sm:px-7 sm:py-6">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[
              "Find businesses that need a new or better website",
              "Get context for a more relevant pitch",
              "Turn a promising lead into a paid website project",
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <Button variant="hero" size="lg" className="mt-5 w-full" asChild>
            <a href="/login">
              Start finding leads <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            No thanks, keep exploring
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
