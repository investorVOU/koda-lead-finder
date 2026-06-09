import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NUMBER_COUNTRIES } from "@/lib/numbers";

interface VirtualNumberModalProps {
  storageKey?: string;
}

export function VirtualNumberModal({ storageKey = "virtual_number_modal_shown" }: VirtualNumberModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastShown = localStorage.getItem(storageKey);
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown, 10) > 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.setItem(storageKey, String(now));
      }, 2000); // Show after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Get a virtual number</DialogTitle>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <DialogDescription className="mt-2 text-sm">
            Receive SMS for verifications, WhatsApp calls, and client inquiries. Available in 150+ countries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Available in these countries and more.
          </p>
          <div className="grid max-h-72 gap-3 overflow-y-auto text-center text-xs sm:grid-cols-3">
            {NUMBER_COUNTRIES.map((country) => (
              <div key={country.code} className="rounded-lg bg-muted p-3">
                <p className="font-semibold text-foreground">{country.flag}</p>
                <p className="mt-1 text-muted-foreground">{country.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => {
              window.location.href = "/numbers";
            }}
          >
            <Phone className="size-4" /> Get started
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
