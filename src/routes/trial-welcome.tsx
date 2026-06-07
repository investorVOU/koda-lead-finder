import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, MapPin, Phone, BarChart2, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { FREE_PLAN } from "@/lib/billing";

export const Route = createFileRoute("/trial-welcome")({
  head: () => ({ meta: [{ title: "Welcome to Kodarai — Free 3-Day Trial" }] }),
  component: TrialWelcomePage,
});

const PERKS = [
  { icon: MapPin,       text: "250 lead searches / month — any city, worldwide" },
  { icon: Phone,        text: "Cold-call scripts written for every lead you find" },
  { icon: BarChart2,    text: "Full pipeline — track leads from first contact to paid" },
  { icon: Download,     text: "Export leads to CSV or open directly in Google Sheets" },
  { icon: CheckCircle2, text: "Website prompt generator — ready to paste into any builder" },
];

function TrialDots() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-2.5 w-2.5 rounded-full bg-primary-foreground"
          style={{ opacity: 1 - i * 0.25 }}
        />
      ))}
    </div>
  );
}

export default function TrialWelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [animIn, setAnimIn] = useState(false);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 80);

    const fire = (x: number, angle: number) =>
      confetti({
        particleCount: 90,
        spread: 70,
        angle,
        origin: { x, y: 0.6 },
        colors: ["#2a9d6f", "#1ec98a", "#a7f3d0", "#fbbf24", "#f87171", "#818cf8"],
      });

    const b1 = setTimeout(() => { fire(0.15, 60); fire(0.85, 120); }, 300);
    const b2 = setTimeout(() => { fire(0.2, 55);  fire(0.8, 125);  }, 750);
    const b3 = setTimeout(() =>
      confetti({ particleCount: 130, spread: 110, origin: { x: 0.5, y: 0.45 },
        colors: ["#2a9d6f", "#1ec98a", "#fbbf24", "#f87171", "#818cf8"], scalar: 1.1 }),
    1300);

    return () => { clearTimeout(t); clearTimeout(b1); clearTimeout(b2); clearTimeout(b3); };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)]" />

      {/* Nav */}
      <div className="relative flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </div>

      {/* Content */}
      <div
        className="relative mx-auto max-w-2xl px-4 pb-20 pt-6"
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            3-Day Trial Active
          </span>
        </div>

        {/* Headline */}
        <div className="mt-5 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Welcome, {firstName} — you're all set.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            No card needed. No strings attached. Try the full tool free for 3 days.
          </p>
        </div>

        {/* Trial card */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[var(--shadow-lg)]">
          {/* Green header */}
          <div className="bg-[image:var(--gradient-primary)] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                  Your current plan
                </p>
                <p className="mt-1 text-2xl font-bold text-primary-foreground">
                  Kodarai Pro
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold text-primary-foreground">
                  Free for 3 days
                </span>
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-primary-foreground/70">Days remaining</p>
                  <TrialDots />
                </div>
              </div>
            </div>
          </div>

          {/* Perks */}
          <div className="px-6 py-5">
            <p className="mb-4 text-sm font-semibold">What you get during the trial:</p>
            <ul className="space-y-3">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* After trial */}
          <div className="border-t border-border bg-muted/30 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">After 3 days</span> — you'll drop to the free plan ({FREE_PLAN.credits} searches/month) at no charge. Upgrade any time to keep your full access.
            </p>
          </div>
        </div>

        {/* Plan tier chips */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Free",    sub: "2 leads/mo" },
            { label: "Starter", sub: "$4/mo · 60 leads" },
            { label: "Pro",     sub: "$12/mo · 250 leads", active: true },
          ].map(({ label, sub, active }) => (
            <div
              key={label}
              className={`rounded-xl border p-3 text-center text-sm ${
                active ? "border-primary bg-primary/5" : "border-border bg-card opacity-50"
              }`}
            >
              <p className={`font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                {label}
                {active && (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Active
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            variant="hero"
            size="xl"
            className="w-full px-12 sm:w-auto"
            onClick={() => navigate({ to: "/onboarding" })}
          >
            Set up my profile <ArrowRight className="size-4" />
          </Button>
          <button
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Skip to dashboard
          </button>
        </div>

        {/* Social proof */}
        <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-4">
          <div className="flex -space-x-2">
            {["D", "S", "A", "M"].map((initial) => (
              <span
                key={initial}
                className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-accent text-xs font-bold text-accent-foreground"
              >
                {initial}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">2,400+</strong> freelancers finding clients with Kodarai
          </p>
        </div>
      </div>
    </div>
  );
}
