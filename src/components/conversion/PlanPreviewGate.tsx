import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PlanPreviewGate({ open, onOpenChange, action = "this action" }: { open: boolean; onOpenChange: (open: boolean) => void; action?: string }) {
  const navigate = useNavigate();
  const viewPlans = () => {
    trackEvent("preview_upgrade_clicked", { action });
    onOpenChange(false);
    navigate({ to: "/choose-plan" });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Lock className="size-5" /></span>
          <DialogTitle>Choose a plan to start using Kodarai</DialogTitle>
          <DialogDescription>You can look around first. When you&apos;re ready to find businesses and build websites, choose a plan.</DialogDescription>
        </DialogHeader>
        <Button className="w-full" onClick={viewPlans}>View plans</Button>
      </DialogContent>
    </Dialog>
  );
}
