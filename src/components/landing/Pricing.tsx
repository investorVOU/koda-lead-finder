import { Link } from "@tanstack/react-router";
import { Check, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PACKS, PLANS, formatNgn } from "@/lib/billing";
import { FadeUp } from "./FadeUp";

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
        <FadeUp>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-4xl">
              Plans built to help you win paying work
            </h2>
            <p className="mt-4 text-muted-foreground">
              Find prospects, make a stronger pitch, and deliver a website worth paying for. Pay securely in Naira with Paystack.
            </p>
          </div>
        </FadeUp>

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-primary/15 bg-primary/5 p-3 text-left sm:p-4">
          <p className="px-1 text-xs font-semibold text-primary sm:text-sm">How Kodarai helps you get clients</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-background/70 p-2.5 sm:p-3"><p className="text-xs font-bold text-primary">1. Find</p><p className="mt-1 text-xs font-medium leading-5 sm:text-sm">A business without a website</p></div>
            <div className="rounded-xl bg-background/70 p-2.5 sm:p-3"><p className="text-xs font-bold text-primary">2. Build</p><p className="mt-1 text-xs font-medium leading-5 sm:text-sm">A website sample for them</p></div>
            <div className="rounded-xl bg-background/70 p-2.5 sm:p-3"><p className="text-xs font-bold text-primary">3. Send</p><p className="mt-1 text-xs font-medium leading-5 sm:text-sm">The link and start talking</p></div>
          </div>
        </div>

        <Tabs defaultValue="plans" className="mt-9 sm:mt-12">
          <TabsList className="mx-auto grid h-auto w-full max-w-md grid-cols-2 gap-1 p-1.5">
            <TabsTrigger value="plans" className="gap-1.5 py-2">
              <CreditCard className="size-4" /> Monthly plans
            </TabsTrigger>
            <TabsTrigger value="packs" className="gap-1.5 py-2">
              <Zap className="size-4" /> Lead packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-8">
            <p className="mb-5 text-center text-sm text-muted-foreground">
              Every monthly plan includes Kodarai Studio and Website Builder access.
            </p>
            <div className="grid items-start gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border bg-card p-7 ${
                    plan.highlight
                      ? "border-primary shadow-[var(--shadow-lg)] lg:-translate-y-3"
                      : "border-border"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="font-display text-4xl font-bold">{formatNgn(plan.ngn)}</span>
                    <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.credits.toLocaleString("en-NG")} leads included each month
                  </p>
                  <Button variant={plan.highlight ? "hero" : "outline"} size="lg" className="mt-6 w-full" asChild>
                    <Link to="/signup">Get {plan.name}</Link>
                  </Button>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="packs" className="mt-8">
            <div className="mx-auto mb-6 max-w-xl text-center">
              <p className="font-semibold">Only need leads for now?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Buy once and use them whenever you are ready. Lead credits never expire.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`rounded-2xl border bg-card p-6 text-center ${
                    pack.highlight ? "border-primary shadow-[var(--shadow-md)]" : "border-border"
                  }`}
                >
                  {pack.highlight && (
                    <span className="mb-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                      Best value
                    </span>
                  )}
                  <h3 className="font-semibold">{pack.name}</h3>
                  <div className="mt-2">
                    <span className="font-display text-3xl font-bold">{formatNgn(pack.ngn)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pack.credits.toLocaleString("en-NG")} leads, once
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Never expires</p>
                  <Button variant={pack.highlight ? "hero" : "soft"} size="sm" className="mt-4 w-full" asChild>
                    <Link to="/signup">Buy {pack.credits.toLocaleString("en-NG")} leads</Link>
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
