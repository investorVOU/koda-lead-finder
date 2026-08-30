import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/landing/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { LogosCarousel } from "@/components/landing/LogosCarousel";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LearnPreview } from "@/components/landing/LearnPreview";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { VirtualNumberModal } from "@/components/landing/VirtualNumberModal";
import { LiveNotification } from "@/components/LiveNotification";
import { SupportChat } from "@/components/support/SupportChat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Kodarai — Find Businesses Without Websites & Close Them Fast",
      },
      {
        name: "description",
        content:
          "Kodarai helps web designers find high-rated local businesses with no website, generate AI website prompts, and get cold-call scripts to close clients fast.",
      },
      {
        property: "og:title",
        content: "Kodarai — Lead Gen for Web Designers",
      },
      {
        property: "og:description",
        content:
          "Find high-rated businesses without websites, generate AI build prompts and cold-call scripts, and close clients fast.",
      },
      {
        property: "og:type",
        content: "website",
      },
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
        <LogosCarousel />
        <Features />
        <HowItWorks />
        <LearnPreview />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCta />
      </main>

      <SiteFooter />

      <LiveNotification />
      <SupportChat />

      <VirtualNumberModal
        storageKey="virtual_number_modal_shown_public"
      />
    </div>
  );
}
