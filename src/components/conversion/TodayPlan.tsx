import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTodayPlan } from "@/lib/client-pack.functions";
import { trackEvent } from "@/lib/analytics";

export function TodayPlan() {
  const getPlan = useServerFn(getTodayPlan);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["today-plan"], queryFn: () => getPlan(), staleTime: 30_000 });
  const plan = query.data && "progress" in query.data ? query.data : null;

  useEffect(() => {
    if (open) trackEvent("daily_plan_viewed");
  }, [open]);

  if (!plan) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          size="icon"
          aria-label="Open today''s plan"
          title="Today''s plan"
          className="fixed bottom-20 left-5 z-40 size-12 rounded-full border border-primary/20 bg-card text-primary shadow-lg hover:bg-primary hover:text-primary-foreground md:bottom-6 md:left-6"
          onClick={() => setOpen(true)}
        >
          <Settings className="size-5 animate-[spin_8s_linear_infinite]" />
          <span className="sr-only">Open today''s plan</span>
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your plan for today</DialogTitle>
            <DialogDescription>Small steps to move closer to your next client.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Loading your plan…</p>
        </DialogContent>
      </Dialog>
    );
  }

  const rows = [
    { key: "found", label: "Find businesses", count: plan.progress.found, target: plan.targets.found },
    { key: "built", label: "Build a sample website", count: plan.progress.built, target: plan.targets.built },
    { key: "contacted", label: "Contact business owners", count: plan.progress.contacted, target: plan.targets.contacted },
    { key: "followedUp", label: "Follow up", count: plan.progress.followedUp, target: plan.targets.followedUp },
  ];
  const complete = plan.next === "done";

  const continuePlan = () => {
    trackEvent("daily_plan_continue_clicked", { next: plan.next });
    if (plan.next === "find" && location.pathname === "/dashboard") {
      setOpen(false);
      const finder = document.querySelector<HTMLElement>("[data-first-client-finder]");
      finder?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => finder?.querySelector<HTMLInputElement>("input")?.focus(), 300);
      return;
    }
    if ((plan.next === "build" || plan.next === "contact") && plan.nextLeadId) {
      navigate({ to: "/client-pack/$leadId", params: { leadId: plan.nextLeadId } });
      return;
    }
    navigate({ to: "/leads" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="icon"
        aria-label="Open today's plan"
        title="Today's plan"
        className="fixed bottom-20 left-5 z-40 size-12 rounded-full border border-primary/20 bg-card text-primary shadow-lg hover:bg-primary hover:text-primary-foreground md:bottom-6 md:left-6"
        onClick={() => setOpen(true)}
      >
        <Settings className="size-5 animate-[spin_8s_linear_infinite]" />
        <span className="sr-only">Open today's plan</span>
      </Button>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Your plan for today
            {complete && <CheckCircle2 className="size-5 text-primary" />}
          </DialogTitle>
          <DialogDescription>Small steps to move closer to your next client.</DialogDescription>
        </DialogHeader>

        {complete ? (
          <div className="rounded-xl bg-primary/5 px-3 py-3 text-sm">
            <p className="font-medium">Nice work — today’s plan is complete.</p>
            <p className="mt-1 text-muted-foreground">Come back tomorrow for your next steps.</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {rows.map((row) => {
              const done = row.count >= row.target;
              return (
                <div key={row.key} className="flex items-center justify-between gap-3 px-3 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={done ? "text-primary" : "text-muted-foreground"}>
                      {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                    </span>
                    {row.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.key === "followedUp" && plan.followUpsWaiting ? `${plan.followUpsWaiting} waiting` : `${row.count}/${row.target}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {plan.recentDemoBusiness && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
            <Eye className="size-4 text-primary" />
            <span><strong>{plan.recentDemoBusiness}</strong> opened a website demo today.</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={continuePlan}>
            {complete ? "View your progress" : plan.next === "follow_up" ? "Follow up now" : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}