import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirstClientProgress } from "@/lib/conversion.functions";
import { trackEvent } from "@/lib/analytics";

const steps = [
  { key: "found", label: "Find 10 businesses", target: 10, to: "/dashboard" as const },
  { key: "built", label: "Build 3 samples", target: 3, to: "/studio" as const },
  { key: "contacted", label: "Contact 3 owners", target: 3, to: "/leads" as const },
  { key: "followedUp", label: "Follow up", target: 1, to: "/leads" as const },
  { key: "closed", label: "Close your first deal", target: 1, to: "/revenue" as const },
] as const;

type Progress = Record<(typeof steps)[number]["key"], number>;

export function FirstClientChallenge() {
  const getProgress = useServerFn(getFirstClientProgress);
  const navigate = useNavigate();
  const progressQuery = useQuery({ queryKey: ["first-client-progress"], queryFn: () => getProgress(), staleTime: 30_000 });
  const location = useLocation();
  const progress = (progressQuery.data && "progress" in progressQuery.data ? progressQuery.data.progress : null) as Progress | null;
  const total = progress ? steps.reduce((sum, step) => sum + Math.min(progress[step.key] ?? 0, step.target), 0) : 0;
  const available = steps.reduce((sum, step) => sum + step.target, 0);
  const next = steps.find((step) => !progress || (progress[step.key] ?? 0) < step.target) ?? steps[steps.length - 1];

  useEffect(() => { trackEvent("first_client_progress_viewed"); }, []);

  const continueToNextStep = () => {
    trackEvent("first_client_step_clicked", { step: next.key, source: "continue" });
    if (next.key === "found" && location.pathname === "/dashboard") {
      const finder = document.querySelector<HTMLElement>("[data-first-client-finder]");
      finder?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => finder?.querySelector<HTMLInputElement>("input")?.focus(), 350);
      return;
    }
    navigate({ to: next.to });
  };

  const continueLabel = next.key === "found" ? "Find businesses" :
    next.key === "built" ? "Build a sample" :
    next.key === "contacted" ? "Contact owners" :
    next.key === "followedUp" ? "Follow up" : "View Revenue";
  return (
    <section className="mb-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Your first client challenge</h2>
            <p className="mt-1 text-sm text-muted-foreground">Follow these steps to work toward your first paying client.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary">{total}/{available}</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-label={`${total} of ${available} challenge actions completed`}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${available ? (total / available) * 100 : 0}%` }} /></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {steps.map((step) => {
            const count = progress?.[step.key] ?? 0;
            const complete = count >= step.target;
            return <Link key={step.key} to={step.to} onClick={() => trackEvent("first_client_step_clicked", { step: step.key })} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/60">
              <span className="flex items-center gap-2"><span className={complete ? "text-primary" : "text-muted-foreground"}>{complete ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}</span>{step.label}</span>
              <span className="text-xs text-muted-foreground">{Math.min(count, step.target)}/{step.target}</span>
            </Link>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-sm text-muted-foreground">{total ? "You're one step closer. Keep going!" : "Start with one small step today."}</p><Button size="sm" onClick={continueToNextStep}>{continueLabel} <ArrowRight className="size-4" /></Button></div>
      </div>

    </section>
  );
}
