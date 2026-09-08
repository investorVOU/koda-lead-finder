import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeDollarSign,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  PlayCircle,
  Search,
  Smartphone,
  Star,
  Users,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoModal } from "@/components/landing/VideoModal";
import { DEMO_VIDEO } from "@/lib/videos";

const HERO_PHRASES = [
  {
    line1: "Find businesses that need websites,",
    highlight: "turn them into clients",
    line2: "and get paid for your skill",
  },
  {
    line1: "Turn one good lead into",
    highlight: "a paid website project",
    line2: "with a better pitch",
  },
  {
    line1: "Stop waiting for referrals and",
    highlight: "go find your next client",
    line2: "yourself",
  },
  {
    line1: "Find leads, build websites,",
    highlight: "send the link",
    line2: "then sell the work",
  },
  {
    line1: "Use YouTube content to build",
    highlight: "authority that brings opportunities",
    line2: "to your business",
  },
];

const HERO_TICKERS = [
  "Find a business that needs a website.",
  "Build a quick website sample for them.",
  "Send the sample and start the conversation.",
  "Use YouTube to grow your audience.",
  "Turn more conversations into paid work.",
];

const LEAD_FINDER_SEARCHES = [
  {
    query: "Restaurants in Lagos",
    leads: [
      { name: "The Orchid Bistro", location: "Victoria Island, Lagos", rating: "4.8", reviews: "214" },
      { name: "Prime Cuts Kitchen", location: "Lekki, Lagos", rating: "4.6", reviews: "96" },
      { name: "Bloom Events & Decor", location: "Ikeja, Lagos", rating: "4.9", reviews: "173" },
    ],
  },
  {
    query: "Salons in Abuja",
    leads: [
      { name: "Velvet Hair Lounge", location: "Wuse 2, Abuja", rating: "4.8", reviews: "189" },
      { name: "The Grooming Room", location: "Garki, Abuja", rating: "4.7", reviews: "128" },
      { name: "Luxe Beauty House", location: "Maitama, Abuja", rating: "4.9", reviews: "205" },
    ],
  },
] as const;

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [leadSearchIndex, setLeadSearchIndex] = useState(0);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setLeadSearchIndex((current) => (current + 1) % LEAD_FINDER_SEARCHES.length);
    }, 4_000);
    return () => clearInterval(interval);
  }, []);

  const activeLeadSearch = LEAD_FINDER_SEARCHES[leadSearchIndex];

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Ambient background */}
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
          {/* Left */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              Built for freelancers ready to turn skills into income.
            </span>

            <h1
              className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible
                  ? "translateY(0)"
                  : "translateY(10px)",
                transition:
                  "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {HERO_PHRASES[index].line1}{" "}
              <span className="text-primary">
                {HERO_PHRASES[index].highlight}
              </span>{" "}
              {HERO_PHRASES[index].line2}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:mt-5 sm:text-lg lg:mx-0">
              Find businesses that need websites, show them what you can build,
              and turn the conversation into paid work.
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
                Watch sales walkthrough
              </Button>
            </div>

            <div className="hero-news mt-5 flex items-center gap-2 overflow-hidden rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-left">
              <span className="hero-news-live shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">How it works</span>
              <p key={index} className="hero-news-message min-w-0 truncate text-xs font-medium text-foreground">{HERO_TICKERS[index]}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 fill-warning text-warning" />
                Lead packs from ₦3,200
              </span>

              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                Nigeria & worldwide
              </span>

              <span>
                Pay with Paystack
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-primary" />
                Virtual & foreign numbers
              </span>
            </div>
          </div>

          {/* Right: Product preview */}
          <div className="lead-finder-demo relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[image:var(--gradient-primary)] opacity-15 blur-3xl" />

            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-lg)] backdrop-blur">
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Search className="size-3.5" />
                  </span>
                  Lead Finder
                </div>

                <span key={leadSearchIndex} className="lead-finder-status text-xs font-medium text-primary">
                  {activeLeadSearch.leads.length} opportunities found
                </span>
              </div>

              <div className="lead-finder-search mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                <Search className="size-3.5 text-primary" />
                <span key={leadSearchIndex} className="lead-finder-search-text min-w-0 flex-1 truncate">{activeLeadSearch.query}</span>
                <span className="lead-finder-search-dot size-1.5 rounded-full bg-primary" />
              </div>

              <div className="space-y-3">
                {activeLeadSearch.leads.map((lead, leadIndex) => (
                  <LeadCard
                    key={`${leadSearchIndex}-${lead.name}`}
                    {...lead}
                    highlight={leadIndex === 0}
                    animationOrder={(leadIndex + 1) as 1 | 2 | 3}
                  />
                ))}
              </div>

              {/* Product capability row */}
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3">
                <Capability
                  icon={Search}
                  label="Find"
                />
                <Capability
                  icon={Globe}
                  label="Build"
                />
                <Capability
                  icon={PhoneCall}
                  label="Reach"
                />
                <Capability
                  icon={BadgeDollarSign}
                  label="Get Paid"
                />
              </div>

              {/* Additional products */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-2">
                  <Youtube className="size-3.5 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold">
                      YouTube Studio
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      Research & content
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-2">
                  <Smartphone className="size-3.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold">
                      Virtual Numbers
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      Reach more leads
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  animationOrder,
}: {
  name: string;
  location: string;
  rating: string;
  reviews: string;
  highlight?: boolean;
  animationOrder?: 1 | 2 | 3;
}) {
  return (
    <div
      className={`lead-finder-card lead-finder-card-${animationOrder} rounded-xl border bg-card p-4 transition-shadow ${
        highlight
          ? "border-primary/40 shadow-[var(--shadow-md)]"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {name}
          </h3>

          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-warning text-warning" />

              <span className="font-medium text-foreground">
                {rating}
              </span>

              <span>({reviews})</span>
            </span>

            <span className="size-1 rounded-full bg-border" />

            <span className="truncate">
              {location}
            </span>
          </p>
        </div>

        <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
          No website
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <span className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-[11px] font-semibold text-primary ${highlight ? "lead-finder-build-cta" : ""}`}>
          <Globe className="size-3" />
          Build
        </span>

        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-[11px] font-semibold text-accent-foreground">
          <Phone className="size-3" />
          Reach
        </span>
      </div>
    </div>
  );
}

function Capability({
  icon: Icon,
  label,
}: {
  icon: typeof Search;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-background/60 py-2">
      <Icon className="size-3.5 text-primary" />
      <span className="text-[9px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
