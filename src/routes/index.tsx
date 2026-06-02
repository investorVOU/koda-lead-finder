import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/landing/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KodaRai — Find Businesses Without Websites & Close Them Fast" },
      {
        name: "description",
        content:
          "KodaRai helps web designers find high-rated local businesses with no website, generate AI website prompts, and get cold-call scripts to close clients fast.",
      },
      { property: "og:title", content: "KodaRai — Lead Gen for Web Designers" },
      {
        property: "og:description",
        content:
          "Find high-rated businesses without websites, generate AI build prompts and cold-call scripts, and close clients fast.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
