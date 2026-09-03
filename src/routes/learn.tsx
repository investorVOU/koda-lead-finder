import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { VideoCard } from "@/components/landing/VideoCard";
import { VideoModal } from "@/components/landing/VideoModal";
import { Button } from "@/components/ui/button";
import { LEARN_VIDEOS, LEARN_CATEGORIES, type LearnVideo } from "@/lib/videos";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Sales Academy — Cold Calling & Closing | Kodarai" },
      {
        name: "description",
        content:
          "Free video lessons on cold calling, sales, and closing web design clients — plus how to get the most out of Kodarai.",
      },
      { property: "og:title", content: "Kodarai Sales Academy" },
      {
        property: "og:description",
        content: "Learn cold calling and sales to land more web design clients — free video lessons.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kodarai.xyz/learn" },
      { name: "twitter:title", content: "Kodarai Sales Academy" },
      { name: "twitter:description", content: "Free video lessons on cold calling, sales, and closing web design clients." },
    ],
    links: [{ rel: "canonical", href: "https://kodarai.xyz/learn" }],
  }),
  component: LearnPage,
});

function LearnPage() {
  const [active, setActive] = useState<LearnVideo | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        <section className="border-b border-border bg-[image:var(--gradient-hero)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <Button variant="ghost" size="sm" className="mb-5" asChild>
              <Link to="/">
                <ArrowLeft className="size-4" /> Back home
              </Link>
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <GraduationCap className="size-3.5 text-primary" /> Free Sales Academy
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl md:text-5xl">
              Learn to cold call & close like a pro
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Short, practical video lessons to help you start conversations, handle objections, and
              turn local businesses into paying clients.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {LEARN_CATEGORIES.map((category) => {
            const videos = LEARN_VIDEOS.filter((v) => v.category === category);
            if (videos.length === 0) return null;
            return (
              <section key={category} className="mb-12 last:mb-0">
                <h2 className="mb-5 text-xl font-bold sm:text-2xl">{category}</h2>
                <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((v) => (
                    <VideoCard
                      key={v.id}
                      title={v.title}
                      description={v.description}
                      duration={v.duration}
                      category={v.category}
                      youtubeId={v.youtubeId}
                      onPlay={() => setActive(v)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <SiteFooter />

      <VideoModal
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
        youtubeId={active?.youtubeId ?? ""}
        title={active?.title ?? ""}
        description={active?.description}
      />
    </div>
  );
}
