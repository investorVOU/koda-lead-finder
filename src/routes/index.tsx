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
import { MarketingPromoModal } from "@/components/landing/MarketingPromoModal";
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
      { property: "og:url", content: "https://kodarai.xyz/" },
      { property: "og:site_name", content: "Kodarai" },
      { property: "og:image", content: "https://kodarai.xyz/kodarai-social-preview.png" },
      { property: "og:image:width", content: "1731" },
      { property: "og:image:height", content: "909" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://kodarai.xyz/kodarai-social-preview.png" },
      { name: "twitter:title", content: "Kodarai — Lead Gen for Web Designers" },
      { name: "twitter:description", content: "Find high-rated businesses without websites, build a website, and close clients faster." },
    ],
    links: [{ rel: "canonical", href: "https://kodarai.xyz/" }],
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
        <Pricing />
        <Testimonials />
        <LearnPreview />
        <FAQ />
        <FinalCta />
      </main>

      <SiteFooter />

      <LiveNotification />
      <SupportChat />

      <VirtualNumberModal
        storageKey="virtual_number_modal_shown_public"
      />
      <MarketingPromoModal />
    </div>
  );
}
