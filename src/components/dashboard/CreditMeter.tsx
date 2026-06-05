import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { PLAN_LABELS } from "@/lib/billing";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlansDialog } from "@/components/dashboard/PlansDialog";

export function CreditMeter({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data: sub } = useSubscription(user?.id);

  const total = sub?.search_credits_total ?? 0;
  const used = sub?.search_credits_used ?? 0;
  const topup = sub?.topup_credits ?? 0;
  const monthlyRemaining = Math.max(total - used, 0);
  const remaining = monthlyRemaining + topup;
  const pct = total > 0 ? (used / total) * 100 : 0;
  const planLabel = PLAN_LABELS[sub?.plan ?? "none"] ?? "No active plan";

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
        <Zap className="size-4 text-primary" />
        <span className="font-semibold">{remaining}</span>
        <span className="text-muted-foreground">leads</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Leads available</span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          {planLabel}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-3xl font-bold">{remaining}</span>
        <span className="mb-1 text-sm text-muted-foreground">leads left</span>
      </div>

      {total > 0 ? (
        <>
          <Progress value={pct} className="mt-3 h-2" />
          <p className="mt-2.5 text-xs text-muted-foreground">
            {monthlyRemaining} of {total} monthly leads
            {topup > 0 ? ` · +${topup} top-up` : ""}
          </p>
          {sub?.credits_reset_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Renews {new Date(sub.credits_reset_at).toLocaleDateString()}
            </p>
          )}
        </>
      ) : topup > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{topup} top-up leads · never expire</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            No leads yet — subscribe or buy a lead pack to start searching.
          </p>
          <PlansDialog>
            <Button variant="hero" size="sm" className="mt-3 w-full">
              <Zap className="size-4" /> Buy a plan
            </Button>
          </PlansDialog>
        </>
      )}
    </div>
  );
}

