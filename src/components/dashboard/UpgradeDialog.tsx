import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLAN_LABELS, type PaidPlanId } from "@/lib/billing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredPlan?: PaidPlanId;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature = "This feature",
  requiredPlan,
}: Props) {
  const navigate = useNavigate();
  const planLabel = requiredPlan ? PLAN_LABELS[requiredPlan] : "a paid";
  const requiredPlanLabel = requiredPlan === "agency" ? "Agency" : `${planLabel} or Agency`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-5 text-primary" />
        </div>
        <DialogHeader className="items-center">
          <DialogTitle>
            {feature} requires {requiredPlan ? requiredPlanLabel : "a paid plan"}
          </DialogTitle>
          <DialogDescription>
            {requiredPlan
              ? `Upgrade to ${planLabel} to unlock this client-winning tool.`
              : "Unlock saving leads, AI website prompts, and cold-call scripts."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/billing" });
            }}
          >
            View plans
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
