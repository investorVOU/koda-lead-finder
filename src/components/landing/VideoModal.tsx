import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Extract the shortcode from an Instagram post or reel URL
function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

function InstagramEmbed({ url }: { url: string }) {
  const shortcode = extractInstagramShortcode(url);
  if (!shortcode) return null;

  return (
    <div className="flex w-full items-center justify-center bg-black" style={{ height: "75vh" }}>
      <iframe
        src={`https://www.instagram.com/p/${shortcode}/embed/`}
        className="h-full w-full border-none"
        allow="encrypted-media"
        allowFullScreen
        title="Instagram video"
        scrolling="no"
      />
    </div>
  );
}

// Extract numeric TikTok video ID from a full TikTok URL or bare ID string
function extractTikTokId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(url.trim())) return url.trim();
  return null;
}

function TikTokEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="flex w-full items-center justify-center bg-black" style={{ height: "75vh" }}>
      <iframe
        src={`https://www.tiktok.com/embed/v2/${videoId}`}
        style={{ width: 340, height: "100%", border: "none" }}
        allow="encrypted-media"
        allowFullScreen
        title="TikTok video"
      />
    </div>
  );
}

export function VideoModal({
  open,
  onOpenChange,
  youtubeId,
  instagramUrl,
  tiktokUrl,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeId: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  title: string;
  description?: string;
}) {
  const hasYoutube = Boolean(youtubeId?.trim().length >= 6);
  const hasInstagram = Boolean(instagramUrl?.trim());
  const tiktokId = tiktokUrl ? extractTikTokId(tiktokUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`overflow-hidden p-0 ${hasYoutube ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        {hasYoutube && open ? (
          <div className="aspect-video w-full bg-foreground/95">
            <iframe
              key={youtubeId}
              className="size-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerated-data; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : hasInstagram && open ? (
          <InstagramEmbed url={instagramUrl!} />
        ) : tiktokId && open ? (
          <TikTokEmbed videoId={tiktokId} />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-[image:var(--gradient-primary)] text-center text-primary-foreground">
            <PlayCircle className="size-12 opacity-90" />
            <div className="px-6">
              <p className="font-display text-lg font-semibold">Video coming soon</p>
              <p className="mt-1 text-sm text-primary-foreground/85">
                This walkthrough is being added shortly. Check back in a moment.
              </p>
            </div>
          </div>
        )}
        <DialogHeader className="space-y-1 p-5 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
