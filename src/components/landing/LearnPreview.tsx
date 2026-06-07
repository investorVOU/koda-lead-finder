import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/landing/VideoCard";
import { VideoModal } from "@/components/landing/VideoModal";
import { LEARN_VIDEOS, type LearnVideo } from "@/lib/videos";

// One featured video per category for the homepage teaser.
const featured = ["cc-1", "sc-1", "kr-1"]
  .map((id) => LEARN_VIDEOS.find((v) => v.id === id))
  .filter((v): v is LearnVideo => Boolean(v));

export function LearnPreview() {
  const [active, setActive] = useState<LearnVideo | null>(null);

  return (
    <section id="academy" className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <GraduationCap className="size-3.5 text-primary" /> Free Sales Academy
          </span>
          <h2 className="mt-4 text-2xl font-bold sm:text-4xl">Don't know how to sell yet? Learn here.</h2>
          <p className="mt-3 text-muted-foreground">
            Bite-size video lessons on cold calling, handling objections, and closing — so finding
            leads actually turns into paying clients.
          </p>
        </div>
        <Button variant="outline" className="shrink-0" asChild>
          <Link to="/learn">
            Browse all lessons <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((v) => (
          <VideoCard
            key={v.id}
            title={v.title}
            description={v.description}
            duration={v.duration}
            category={v.category}
            onPlay={() => setActive(v)}
          />
        ))}
      </div>

      <VideoModal
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
        youtubeId={active?.youtubeId ?? ""}
        instagramUrl={active?.instagramUrl}
        tiktokUrl={active?.tiktokUrl}
        title={active?.title ?? ""}
        description={active?.description}
      />
    </section>
  );
}
