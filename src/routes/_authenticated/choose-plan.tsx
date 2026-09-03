import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PACKS, PLANS, formatNgn } from "@/lib/billing";
import { Logo } from "@/components/landing/Logo";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({ meta: [{ title: "Choose your plan — Kodarai" }] }),
  component: ChoosePlanPage,
});

function ChoosePlanPage() {
  const navigate = useNavigate();
  const goToBilling = () => navigate({ to: "/billing" });

  return (
    <div className="min-h-screen bg-[image:var(--gradient-hero)] px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose how you want to find clients</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Start a monthly plan for the full Kodarai workflow, or buy leads once and use them whenever you are ready.
          </p>
        </div>

        <Tabs defaultValue="plans" className="mt-8 sm:mt-10">
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 p-1.5 mx-auto">
            <TabsTrigger value="plans" className="gap-1.5 py-2">
              <CreditCard className="size-4" />
              Monthly plans
            </TabsTrigger>
            <TabsTrigger value="packs" className="gap-1.5 py-2">
              <Zap className="size-4" />
              Lead packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-7">
            <div className="mb-5 text-center">
              <p className="font-semibold">For freelancers building a steady client pipeline</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every monthly plan includes Studio and Website Builder access.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm ${
                    plan.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                  }`}
                >
                  {plan.highlight && (
                    <span className="mb-2 inline-flex items-center gap-1 self-start rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Zap className="size-3" /> Most popular
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatNgn(plan.ngn)}
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlight ? "hero" : "outline"}
                    onClick={goToBilling}
                  >
                    Get {plan.name}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="packs" className="mt-7">
            <div className="mb-5 text-center">
              <p className="font-semibold">For when you only need leads right now</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay once. Your lead credits never expire. A monthly plan is required for Studio and Website Builder.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm ${
                    pack.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                  }`}
                >
                  {pack.highlight && (
                    <span className="mb-2 inline-flex items-center gap-1 self-start rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Zap className="size-3" /> Best value
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{pack.name}</p>
                  <p className="mt-2 text-3xl font-bold">{formatNgn(pack.ngn)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pack.credits} lead searches, once</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> Leads never expire
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> Buy only when you need more
                    </li>
                  </ul>
                  <Button className="mt-6 w-full" variant={pack.highlight ? "hero" : "outline"} onClick={goToBilling}>
                    Buy {pack.name}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
