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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function UpgradeDialog({ open, onOpenChange, feature = "This feature" }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-5 text-primary" />
        </div>
        <DialogHeader className="items-center">
          <DialogTitle>{feature} requires a paid plan</DialogTitle>
          <DialogDescription>
            Unlock saving leads, AI website prompts, and cold-call scripts.
            Plans start from <strong className="text-foreground">$2</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => { onOpenChange(false); navigate({ to: "/billing" }); }}
          >
            See plans — from $2
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
