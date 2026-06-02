import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[image:var(--gradient-hero)]">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            AI-powered lead gen for web designers
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Find High-Rated Businesses{" "}
            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
              Without Websites
            </span>{" "}
            & Close Them Fast
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            KodaRai finds top-rated local businesses with no website, generates a ready-to-build AI
            website prompt, and writes your cold-call script — so you can land clients in minutes.
          </p>

          <div class="" className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="hero" size="xl" className="w-full sm:w-auto" asChild>
              <Link to="/signup">
                Start 7-day free trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5 fill-warning text-warning" /> 20 free searches
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> Works worldwide
            </span>
            <span>No credit card required</span>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="absolute -inset-x-8 -top-8 -z-10 h-40 bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
          <img
            src={dashboardPreview}
            alt="KodaRai lead finder dashboard showing local businesses without websites"
            width={1280}
            height={896}
            className="w-full rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]"
          />
        </div>
      </div>
    </section>
  );
}
