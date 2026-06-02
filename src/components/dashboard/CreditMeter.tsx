import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { PLAN_LABELS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";

export function CreditMeter({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data: sub } = useSubscription(user?.id);

  const total = sub?.search_credits_total ?? 0;
  const used = sub?.search_credits_used ?? 0;
  const remaining = Math.max(total - used, 0);
  const pct = total > 0 ? (used / total) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
        <Zap className="size-4 text-primary" />
        <span className="font-semibold">{remaining}</span>
        <span className="text-muted-foreground">left</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Search credits</span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          {PLAN_LABELS[sub?.plan ?? "trial"]}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-3xl font-bold">{remaining}</span>
        <span className="mb-1 text-sm text-muted-foreground">/ {total} remaining</span>
      </div>
      <Progress value={pct} className="mt-3 h-2" />
      {sub?.credits_reset_at && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Resets {new Date(sub.credits_reset_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
