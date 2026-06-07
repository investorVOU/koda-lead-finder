import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Zap,
  PhoneCall,
  MapPinned,
  FileText,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { FREE_PLAN } from "@/lib/billing";

export const Route = createFileRoute("/trial-welcome")({
  head: () => ({ meta: [{ title: "Welcome to Kodarai Pro — Free 3-Day Trial" }] }),
  component: TrialWelcomePage,
});

const TRIAL_PERKS = [
  { icon: MapPinned, text: "250 leads / month — find businesses without websites worldwide" },
  { icon: Sparkles, text: "AI website prompts tuned for Lovable, v0, Framer & Claude" },
  { icon: PhoneCall, text: "Personalized cold-call scripts for every lead" },
  { icon: FileText, text: "Full pipeline — track leads from New to Paid" },
  { icon: Zap, text: "Export leads & cold email generator" },
];

function CountdownDots() {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className="block size-3 rounded-full bg-primary"
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
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)]" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div
        className="relative mx-auto max-w-2xl px-4 pb-20 pt-8"
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">
            <Sparkles className="size-4" /> Free 3-Day Trial Unlocked
          </span>
        </div>

        {/* Headline */}
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Hey {firstName}, you've unlocked
            <br />
            <span className="text-primary">Kodarai Pro — free for 3 days!</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            No payment required. No card saved. Experience the full power of Kodarai Pro and
            start landing clients today.
          </p>
        </div>

        {/* Trial card */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-[var(--shadow-lg)]">
          {/* Header band */}
          <div className="bg-[image:var(--gradient-primary)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
                  Your plan
                </p>
                <p className="mt-0.5 text-2xl font-bold text-primary-foreground">
                  Kodarai Pro
                </p>
              </div>
              <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold text-primary-foreground">
                3 days free
              </span>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-primary-foreground/80">Trial days remaining</p>
              <CountdownDots />
            </div>
          </div>

          {/* Perks list */}
          <div className="px-6 py-5">
            <p className="mb-4 text-sm font-semibold text-foreground">What's included in your trial:</p>
            <ul className="space-y-3">
              {TRIAL_PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="size-3 text-primary" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* After trial notice */}
          <div className="border-t border-border bg-muted/40 px-6 py-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">After 3 days</strong> — you'll
                automatically drop to the{" "}
                <strong className="font-medium text-foreground">Free plan</strong> ({FREE_PLAN.credits} leads/month)
                with no charge. Upgrade any time to keep Pro.
              </p>
            </div>
          </div>
        </div>

        {/* Plan comparison chips */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Free", sub: "2 leads/mo", muted: true },
            { label: "Starter", sub: "$4/mo · 60 leads", muted: true },
            { label: "Pro", sub: "$12/mo · 250 leads", muted: false, current: true },
          ].map(({ label, sub, current, muted }) => (
            <div
              key={label}
              className={`rounded-xl border p-3 text-center text-sm transition-all ${
                current
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card opacity-60"
              }`}
            >
              <p className={`font-semibold ${current ? "text-primary" : "text-foreground"}`}>
                {label}
                {current && (
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
            className="w-full sm:w-auto px-12"
            onClick={() => navigate({ to: "/onboarding" })}
          >
            Start my free trial <ArrowRight className="size-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Takes 30 seconds · No credit card required
          </p>
        </div>

        {/* Social proof nudge */}
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
            <strong className="text-foreground">2,400+</strong> freelancers already finding clients with Kodarai
          </p>
        </div>
      </div>
    </div>
  );
}
