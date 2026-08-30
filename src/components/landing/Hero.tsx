import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MapPin,
  PlayCircle,
  Star,
  Phone,
  Search,
  Smartphone,
  Globe,
  MessageSquare,
  Youtube,
  BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoModal } from "@/components/landing/VideoModal";
import { DEMO_VIDEO } from "@/lib/videos";
import { LiveNotification } from "@/components/LiveNotification";

const HERO_PHRASES = [
  {
    line1: "Find businesses that need",
    highlight: "a website",
    line2: "and turn them into clients",
  },
  {
    line1: "Don't know how to code?",
    highlight: "Build with AI",
    line2: "and sell the website",
  },
  {
    line1: "Find the opportunity",
    highlight: "build the site",
    line2: "and close the deal",
  },
  {
    line1: "Turn local businesses into",
    highlight: "paying clients",
    line2: "with Kodarai",
  },
  {
    line1: "Find leads, build websites,",
    highlight: "reach clients",
    line2: "and make money",
  },
  {
    line1: "Create better content",
    highlight: "in less time",
    line2: "with AI-powered research",
  },
  {
    line1: "Buy virtual numbers",
    highlight: "and foreign numbers",
    line2: "to reach more leads",
  },
];

const WORKFLOW = [
  {
    icon: Search,
    title: "Find",
    text: "Discover businesses that need a website.",
  },
  {
    icon: Globe,
    title: "Build",
    text: "Create the website with AI, even without coding.",
  },
  {
    icon: MessageSquare,
    title: "Reach",
    text: "Get scripts and tools to approach the client.",
  },
  {
  icon: BadgeDollarSign,
  title: "Get paid",
  text: "Turn opportunities into website projects.",
},
];

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setIndex((i) => (i + 1) % HERO_PHRASES.length);
        setVisible(true);
      }, 400);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-hero)]" />

      {/* Technical grid */}
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
            <p className="text-sm font-medium text-muted-foreground">
  Find more opportunities. Close more clients.
</p>

            <h1
              className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {HERO_PHRASES[index].line1}{" "}
              <span className="text-primary">
                {HERO_PHRASES[index].highlight}
              </span>{" "}
              {HERO_PHRASES[index].line2}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              Kodarai helps you find businesses that need websites, build sites
              with AI, reach out with confidence, and turn opportunities into
              paying clients. Research your niche and create content faster too.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button
                variant="hero"
                size="xl"
                className="w-full sm:w-auto"
                asChild
              >
                <Link to="/signup">
                  Get your first client
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => setDemoOpen(true)}
              >
                <PlayCircle className="size-5" />
                Watch 2-min demo
              </Button>
            </div>

            {/* Main capabilities */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Search className="size-3.5 text-primary" />
                Find real leads
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-3.5 text-primary" />
                Build with AI
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-primary" />
                Reach clients
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-primary" />
                Buy virtual & foreign numbers
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Youtube className="size-3.5 text-primary" />
                Grow your channel
              </span>
            </div>

            {/* Small trust row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 fill-warning text-warning" />
                Lead packs from $2
              </span>

              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                Works worldwide
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
                    <Search className="size-3.5" />
                  </span>
                  Lead Finder
                </div>

                <span className="text-xs text-muted-foreground">
                  HVAC · Chicago
                </span>
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

              {/* Workflow preview */}
              <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-border pt-4">
                {WORKFLOW.map((step, i) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex flex-col items-center text-center"
                    >
                      <div
                        className={`flex size-8 items-center justify-center rounded-lg ${
                          i === 0
                            ? "bg-primary/10 text-primary"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" />
                      </div>

                      <span className="mt-1.5 text-[9px] font-semibold">
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Find an opportunity → build → reach out → close
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live activity notification */}
      <LiveNotification />

      <VideoModal
        open={demoOpen}
        onOpenChange={setDemoOpen}
        youtubeId={DEMO_VIDEO.youtubeId}
        instagramUrl={DEMO_VIDEO.instagramUrl}
        tiktokUrl={DEMO_VIDEO.tiktokUrl}
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
        highlight
          ? "border-primary/40 shadow-[var(--shadow-md)]"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{name}</h3>

          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-warning text-warning" />

              <span className="font-medium text-foreground">
                {rating}
              </span>

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
          AI prompt
        </span>

        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-[11px] font-semibold text-accent-foreground">
          <Phone className="size-3" />
          Call script
        </span>
      </div>
    </div>
  );
}
