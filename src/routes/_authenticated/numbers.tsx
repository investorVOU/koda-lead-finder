import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, Plus, Trash2, ChevronDown, ChevronUp, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BuyNumberDialog } from "@/components/numbers/BuyNumberDialog";
import { SmsInbox } from "@/components/numbers/SmsInbox";
import { getUserNumbers, releaseNumber } from "@/lib/numbers.functions";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import type { VirtualNumber } from "@/lib/numbers";

export const Route = createFileRoute("/_authenticated/numbers")({
  head: () => ({ meta: [{ title: "Virtual Numbers — Kodarai" }] }),
  component: NumbersPage,
});

function NumbersPage() {
  const navigate = useNavigate();
  const runGetNumbers = useServerFn(getUserNumbers);
  const runRelease    = useServerFn(releaseNumber);

  const [numbers,    setNumbers]    = useState<VirtualNumber[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [buyOpen,    setBuyOpen]    = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [releasing,  setReleasing]  = useState<string | null>(null);

  // Handle redirect back from checkout
  const { status } = Route.useSearch() as { status?: string };
  useEffect(() => {
    if (status === "success") {
      toast.success("Payment confirmed! Your number is being activated.");
      navigate({ to: "/numbers", replace: true });
    } else if (status === "cancel") {
      toast.info("Number purchase cancelled.");
      navigate({ to: "/numbers", replace: true });
    }
  }, [status]);

  const load = async () => {
    setLoading(true);
    const res = await runGetNumbers();
    if ("numbers" in res) setNumbers(res.numbers as VirtualNumber[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRelease = async (numberId: string, phoneNumber: string) => {
    if (!confirm(`Release ${phoneNumber}? This cannot be undone.`)) return;
    setReleasing(numberId);
    const res = await runRelease({ data: { numberId } });
    setReleasing(null);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number released.");
    load();
  };

  const countryName = (code: string) =>
    NUMBER_COUNTRIES.find((c) => c.code === code)?.flag ?? "🌐";

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Virtual Numbers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get real phone numbers for SMS verification, WhatsApp, and client calls.
            </p>
          </div>
          <Button variant="hero" onClick={() => setBuyOpen(true)}>
            <Plus className="size-4" /> Buy a number
          </Button>
        </div>

        {/* Empty state */}
        {!loading && numbers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Phone className="size-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">No numbers yet</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Get a US, UK, or Canadian number to receive SMS for verifications, WhatsApp, or client calls.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <span>🇺🇸 $3.99/mo</span>
              <span>🇬🇧 $3.99/mo</span>
              <span>🇨🇦 $3.99/mo</span>
              <span>🇦🇺 $4.99/mo</span>
            </div>
            <Button variant="hero" className="mt-2" onClick={() => setBuyOpen(true)}>
              <Plus className="size-4" /> Get your first number
            </Button>
          </div>
        )}

        {/* Numbers list */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {numbers.map((num) => (
            <div key={num.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              {/* Number row */}
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{countryName(num.country_code)}</span>
                  <div>
                    <p className="font-mono text-base font-bold">{num.phone_number}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {num.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="size-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                          <Clock className="size-3" /> Pending payment
                        </span>
                      )}
                      {num.expires_at && num.status === "active" && (
                        <span className="text-xs text-muted-foreground">
                          · Expires {new Date(num.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {num.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(expanded === num.id ? null : num.id)}
                    >
                      {expanded === num.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      Inbox
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleRelease(num.id, num.phone_number)}
                    disabled={releasing === num.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* SMS Inbox */}
              {expanded === num.id && num.status === "active" && (
                <div className="border-t border-border px-5 py-4">
                  <SmsInbox numberId={num.id} phoneNumber={num.phone_number} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BuyNumberDialog open={buyOpen} onOpenChange={(o) => { setBuyOpen(o); if (!o) load(); }} />
    </DashboardShell>
  );
}
