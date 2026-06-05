import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, PlayCircle, Star, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoModal } from "@/components/landing/VideoModal";
import { DEMO_VIDEO } from "@/lib/videos";

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)]" />
      {/* Technical grid, faded toward edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(120% 80% at 50% 0%, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 80% at 50% 0%, black 35%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              AI-powered lead generation
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Find high-rated businesses{" "}
              <span className="text-primary">without websites</span>{" "}
              & close them fast
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              KodaRai surfaces top-rated local businesses with no website, generates a
              ready-to-build AI prompt, and writes your cold-call script — so you land
              clients in minutes, not weeks.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button variant="hero" size="xl" className="w-full sm:w-auto" asChild>
                <Link to="/signup">
                  Get your first client for $2
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => setDemoOpen(true)}
              >
                <PlayCircle className="size-5" /> Watch 2-min demo
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 fill-warning text-warning" /> Lead packs from $2
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Works worldwide
              </span>
              <span>Pay by card or Paystack</span>
            </div>
          </div>

          {/* Right: product preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[image:var(--gradient-primary)] opacity-15 blur-3xl" />

            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-lg)] backdrop-blur">
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Sparkles className="size-3.5" />
                  </span>
                  Lead Finder
                </div>
                <span className="text-xs text-muted-foreground">HVAC · Chicago</span>
              </div>

              <div className="space-y-3">
                <LeadCard
                  name="Pietro's Italian Bistro"
                  location="Chicago, USA"
                  rating="4.8"
                  reviews="214"
                  highlight
                />
                <LeadCard
                  name="Apex Plumbing Co."
                  location="Chicago, USA"
                  rating="4.6"
                  reviews="96"
                />
                <LeadCard
                  name="Bloom & Branch Florist"
                  location="Chicago, USA"
                  rating="4.9"
                  reviews="173"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <VideoModal
        open={demoOpen}
        onOpenChange={setDemoOpen}
        youtubeId={DEMO_VIDEO.youtubeId}
        title={DEMO_VIDEO.title}
        description={DEMO_VIDEO.description}
      />
    </section>
  );
}

function LeadCard({
  name,
  location,
  rating,
  reviews,
  highlight = false,
}: {
  name: string;
  location: string;
  rating: string;
  reviews: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-shadow ${
        highlight ? "border-primary/40 shadow-[var(--shadow-md)]" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-warning text-warning" />
              <span className="font-medium text-foreground">{rating}</span>
              <span>({reviews})</span>
            </span>
            <span className="size-1 rounded-full bg-border" />
            <span className="truncate">{location}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
          No website
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-[11px] font-semibold text-primary">
          <Sparkles className="size-3" /> AI prompt
        </span>
        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-[11px] font-semibold text-accent-foreground">
          <Phone className="size-3" /> Call script
        </span>
      </div>
    </div>
  );
}
