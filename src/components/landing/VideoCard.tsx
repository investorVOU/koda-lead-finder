import { Play, Phone, Handshake, Sparkles } from "lucide-react";
import type { LearnCategory } from "@/lib/videos";

const ICONS: Record<LearnCategory, typeof Phone> = {
  "Cold Calling": Phone,
  "Sales & Closing": Handshake,
  "Using Kodarai": Sparkles,
};

export function categoryIcon(category: LearnCategory) {
  return ICONS[category];
}

export function VideoCard({
  title,
  description,
  duration,
  category,
  youtubeId,
  onPlay,
}: {
  title: string;
  description: string;
  duration: string;
  category: LearnCategory;
  youtubeId: string;
  onPlay: () => void;
}) {
  const Icon = ICONS[category];
  const thumbnailUrl = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : undefined;
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group block w-full text-left"
      aria-label={`Play ${title}`}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-[image:var(--gradient-hero)]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-[0.07]" />
            <Icon className="pointer-events-none absolute -bottom-4 -right-3 size-28 text-primary/10" />
          </>
        )}
        {thumbnailUrl && <div className="absolute inset-0 bg-foreground/25" />}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Icon className="size-3.5 text-primary" /> {category}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
          {duration}
        </span>

        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-background/90 text-primary shadow-[var(--shadow-md)] transition-transform duration-200 group-hover:scale-110">
            <Play className="size-6 translate-x-0.5 fill-primary" />
          </span>
        </span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
