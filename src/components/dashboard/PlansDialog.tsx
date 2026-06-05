import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Zap, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PLANS, PACKS, formatNgn, type Provider } from "@/lib/billing";
import { createCheckout } from "@/lib/billing.functions";

export function PlansDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const runCheckout = useServerFn(createCheckout);

  const checkout = async (
    provider: Provider,
    kind: "subscription" | "pack",
    id: string,
    key: string,
  ) => {
    setBusy(key);
    const res = await runCheckout({
      data: { provider, kind, id, origin: window.location.origin },
    });
    if ("error" in res) {
      toast.error(res.message);
      setBusy(null);
      return;
    }
    window.location.href = res.url!;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            Subscribe for monthly leads or grab a one-time pack. Pay by card (USD) or Paystack (₦).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="plans" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">
              <CreditCard className="mr-1.5 size-4" /> Monthly plans
            </TabsTrigger>
            <TabsTrigger value="packs">
              <Zap className="mr-1.5 size-4" /> Lead packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4 grid gap-4 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border bg-card p-5 ${
                  p.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                }`}
              >
                <h3 className="text-base font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-2xl font-bold">${p.usd}</span>
                  <span className="mb-0.5 text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.credits} leads / month</p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={() => checkout("stripe", "subscription", p.id, p.id + "stripe")}
                  >
                    {busy === p.id + "stripe" ? <Loader2 className="size-4 animate-spin" /> : "Pay with Card"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={() => checkout("paystack", "subscription", p.id, p.id + "paystack")}
                  >
                    {busy === p.id + "paystack" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      `Paystack · ${formatNgn(p.ngn)}`
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="packs" className="mt-4 grid gap-4 sm:grid-cols-3">
            {PACKS.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border bg-card p-5 ${
                  p.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                }`}
              >
                {p.highlight && (
                  <span className="mb-2 w-fit rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Best value
                  </span>
                )}
                <h3 className="text-base font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-2xl font-bold">${p.usd}</span>
                  <span className="mb-0.5 text-xs text-muted-foreground">= {p.credits} leads</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Never expire</p>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="soft"
                    size="sm"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={() => checkout("stripe", "pack", p.id, p.id + "stripe")}
                  >
                    {busy === p.id + "stripe" ? <Loader2 className="size-4 animate-spin" /> : "Buy with Card"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={() => checkout("paystack", "pack", p.id, p.id + "paystack")}
                  >
                    {busy === p.id + "paystack" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      `Paystack · ${formatNgn(p.ngn)}`
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
