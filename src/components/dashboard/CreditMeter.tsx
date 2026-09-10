import {
  ArrowRight,
  BarChart3,
  Zap,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { PLAN_LABELS } from "@/lib/billing";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlansDialog } from "@/components/dashboard/PlansDialog";

export function CreditMeter({
  compact = false,
  slim = false,
}: {
  compact?: boolean;
  slim?: boolean;
}) {
  const { user } = useAuth();

  const { data: sub } =
    useSubscription(user?.id);

  const total =
    sub?.search_credits_total ?? 0;

  const used =
    sub?.search_credits_used ?? 0;

  const topup =
    sub?.topup_credits ?? 0;

  const monthlyRemaining =
    Math.max(total - used, 0);

  const remaining =
    monthlyRemaining + topup;

  const pct =
    total > 0
      ? (used / total) * 100
      : 0;

  const planLabel =
    PLAN_LABELS[sub?.plan ?? "none"] ??
    "No active plan";

  const resetDate =
    sub?.credits_reset_at
      ? new Date(
          sub.credits_reset_at,
        ).toLocaleDateString()
      : null;

  /*
   * Header pill.
   * Keep this unchanged because DashboardShell uses it.
   */
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
        <Zap className="size-4 text-primary" />

        <span className="font-semibold">
          {remaining}
        </span>

        <span className="text-muted-foreground">
          leads
        </span>
      </div>
    );
  }

  /*
   * Finder slim card.
   */
  if (slim) {
    return (
      <div
        className="
          flex
          min-h-[76px]
          items-center
          gap-3
          rounded-2xl
          border
          border-border
          bg-card
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            size-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-primary/10
            text-primary
          "
        >
          <BarChart3 className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-lg font-bold tracking-tight text-foreground">
              {remaining}
            </span>

            <span className="text-sm text-muted-foreground">
              leads left this month
            </span>
          </div>

          {total > 0 ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {monthlyRemaining} of{" "}
              {total}
              {topup > 0
                ? ` · +${topup} top-up`
                : ""}
              {resetDate
                ? ` · Renews ${resetDate}`
                : ""}
            </p>
          ) : topup > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {topup} top-up leads ·
              never expire
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              No leads available
            </p>
          )}
        </div>

        {total === 0 &&
        topup === 0 ? (
          <PlansDialog>
            <button
              type="button"
              className="
                flex
                size-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-primary
                transition
                hover:bg-primary/10
              "
              aria-label="View plans"
            >
              <ArrowRight className="size-4" />
            </button>
          </PlansDialog>
        ) : (
          <span
            className="
              shrink-0
              rounded-full
              bg-primary/10
              px-2.5
              py-1
              text-[10px]
              font-semibold
              text-primary
            "
          >
            {planLabel}
          </span>
        )}
      </div>
    );
  }

  /*
   * Existing full card used elsewhere.
   */
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Leads available
        </span>

        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          {planLabel}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-3xl font-bold">
          {remaining}
        </span>

        <span className="mb-1 text-sm text-muted-foreground">
          leads left
        </span>
      </div>

      {total > 0 ? (
        <>
          <Progress
            value={pct}
            className="mt-3 h-2"
          />

          <p className="mt-2.5 text-xs text-muted-foreground">
            {monthlyRemaining} of{" "}
            {total} monthly leads
            {topup > 0
              ? ` · +${topup} top-up`
              : ""}
          </p>

          {resetDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Renews {resetDate}
            </p>
          )}
        </>
      ) : topup > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {topup} top-up leads · never
          expire
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            No leads yet — subscribe or
            buy a lead pack to start
            searching.
          </p>

          <PlansDialog>
            <Button
              variant="hero"
              size="sm"
              className="mt-3 w-full"
            >
              <Zap className="size-4" />
              Buy a plan
            </Button>
          </PlansDialog>
        </>
      )}
    </div>
  );
}
