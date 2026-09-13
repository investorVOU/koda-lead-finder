import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { trackPreviewLockedAction, trackPreviewUpgradeClicked } from "@/lib/analytics";
import { isPreviewMode } from "@/lib/plan-access";
import { useSubscription } from "@/lib/queries";

type PreviewFeature = "finder_search" | "studio_new_website" | "studio_generate" | "studio_ai_edit" | "lead_paid_action";
type PlanPreviewContextValue = { isPreview: boolean; guardAction: (feature: PreviewFeature) => boolean };

const PlanPreviewContext = createContext<PlanPreviewContextValue | null>(null);

export function PlanPreviewGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: subscription } = useSubscription(user?.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isPreview = isPreviewMode(subscription?.status);

  useEffect(() => {
    if (!isPreview) setOpen(false);
  }, [isPreview]);

  const guardAction = useCallback((feature: PreviewFeature) => {
    if (!isPreview) return false;
    trackPreviewLockedAction(feature);
    setOpen(true);
    return true;
  }, [isPreview]);

  return (
    <PlanPreviewContext.Provider value={{ isPreview, guardAction }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose a plan to start using Kodarai</DialogTitle>
            <DialogDescription>
              You can look around first. When you&apos;re ready to find businesses and build websites, choose a plan.
            </DialogDescription>
          </DialogHeader>
          <Button variant="hero" className="w-full" onClick={() => {
            trackPreviewUpgradeClicked();
            setOpen(false);
            navigate({ to: "/choose-plan" });
          }}>
            View plans
          </Button>
        </DialogContent>
      </Dialog>
    </PlanPreviewContext.Provider>
  );
}

export function usePlanPreviewGate(): PlanPreviewContextValue {
  const context = useContext(PlanPreviewContext);
  if (!context) throw new Error("usePlanPreviewGate must be used inside PlanPreviewGate.");
  return context;
}

export function PreviewModeBanner() {
  const { isPreview } = usePlanPreviewGate();
  const navigate = useNavigate();
  if (!isPreview) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">You&apos;re exploring Kodarai</p>
        <p className="mt-0.5 text-muted-foreground">Choose a plan when you&apos;re ready to start finding businesses,building websites and making money.</p>
      </div>
      <Button variant="link" className="h-auto shrink-0 justify-start px-0 sm:justify-center" onClick={() => {
        trackPreviewUpgradeClicked();
        navigate({ to: "/choose-plan" });
      }}>
        View plans →
      </Button>
    </div>
  );
}
