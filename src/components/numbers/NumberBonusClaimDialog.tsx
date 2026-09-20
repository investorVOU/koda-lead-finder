import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  claimNumberBonus,
  getEligibleNumberBonusOptions,
} from "@/lib/number-bonus.functions";
import {
  trackNumberBonusClaimed,
  trackNumberBonusClaimFailed,
  trackNumberBonusClaimStarted,
} from "@/lib/analytics";

type BonusOption = { service: string; serviceLabel: string };

export function NumberBonusClaimDialog({
  open,
  onOpenChange,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
}) {
  const runOptions = useServerFn(getEligibleNumberBonusOptions);
  const runClaim = useServerFn(claimNumberBonus);
  const [options, setOptions] = useState<BonusOption[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setOptions([]);
    setSelectedService("");
    runOptions()
      .then((result) => {
        const availableOptions = result.options as BonusOption[];
        setOptions(availableOptions);
        setSelectedService(availableOptions[0]?.service ?? "");
      })
      .catch(() => toast.error("Unable to load temporary-number options."))
      .finally(() => setLoading(false));
  }, [open]);

  const claim = async () => {
    if (!selectedService || claiming) return;
    setClaiming(true);
    trackNumberBonusClaimStarted(selectedService);
    try {
      const result = await runClaim({ data: { service: selectedService } });
      if ("error" in result) {
        trackNumberBonusClaimFailed(selectedService);
        toast.error(result.message);
        return;
      }
      trackNumberBonusClaimed(selectedService);
      toast.success("Your U.S. temporary number is ready.");
      onOpenChange(false);
      onClaimed();
    } catch {
      trackNumberBonusClaimFailed(selectedService);
      toast.error("Unable to claim your number right now. Your bonus is still available.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Claim your U.S. temporary number</DialogTitle>
          <DialogDescription>
            Included with your first KodarAI plan. No separate Numbers deposit is needed for this bonus number.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-36 items-center justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : options.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No eligible U.S. temporary-number services are available right now. Your bonus remains available—please check again later.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">U.S. temporary number</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Valid for up to 20 minutes or until the provider closes the temporary order. Supported service availability varies.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Choose a supported service</p>
              {options.map((option) => (
                <button
                  key={option.service}
                  type="button"
                  onClick={() => setSelectedService(option.service)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors ${selectedService === option.service ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <span>{option.serviceLabel}</span>
                  {selectedService === option.service && <CheckCircle2 className="size-4 text-primary" />}
                </button>
              ))}
            </div>

            <Button className="w-full" variant="hero" disabled={!selectedService || claiming} onClick={claim}>
              {claiming ? <><Loader2 className="size-4 animate-spin" /> Claiming number…</> : "Claim number"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}