import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PLANS, PACKS, formatNgn } from "@/lib/billing";
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
              Use Kodarai to find prospects, make a stronger pitch, and deliver
              a website worth paying for. Every paid plan includes Kodarai Studio
              and Website Builder access. Pay securely in Naira with Paystack.
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
        {/* Monthly plans */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border bg-card p-7 ${
                p.highlight
                  ? "border-primary shadow-[var(--shadow-lg)] lg:-translate-y-3"
                  : "border-border"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.tagline}
              </p>
              {/* Monthly price */}
              <div className="mt-5 flex items-end gap-1">
                <span className="font-display text-4xl font-bold">
                  {formatNgn(p.ngn)}
                </span>
                <span className="mb-1 text-sm text-muted-foreground">
                  /mo
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.credits.toLocaleString("en-NG")} leads included each month
              </p>
              <Button
                variant={p.highlight ? "hero" : "outline"}
                size="lg"
                className="mt-6 w-full"
                asChild
              >
                <Link to="/signup">Get {p.name}</Link>
              </Button>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* One-time lead packs */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="text-xl font-bold">
            Not ready to subscribe?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Buy a one-time lead pack. Your leads never expire, so you can top
            up whenever you need more.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PACKS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border bg-card p-6 text-center ${
                p.highlight
                  ? "border-primary shadow-[var(--shadow-md)]"
                  : "border-border"
              }`}
            >
              {p.highlight && (
                <span className="mb-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  Best value
                </span>
              )}
              <h4 className="font-semibold">{p.name}</h4>
              {/* One-time price */}
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="font-display text-3xl font-bold">
                  {formatNgn(p.ngn)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.credits.toLocaleString("en-NG")} leads
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                One-time payment via Paystack
              </p>
              <Button
                variant="soft"
                size="sm"
                className="mt-4 w-full"
                asChild
              >
                <Link to="/signup">
                  Buy {p.credits.toLocaleString("en-NG")} leads
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
