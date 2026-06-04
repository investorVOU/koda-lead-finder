import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function VideoModal({
  open,
  onOpenChange,
  youtubeId,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeId: string;
  title: string;
  description?: string;
}) {
  const valid = Boolean(youtubeId && youtubeId.trim().length >= 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
        <div className="aspect-video w-full bg-foreground/95">
          {valid && open ? (
            <iframe
              key={youtubeId}
              className="size-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerated-data; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 bg-[image:var(--gradient-primary)] text-center text-primary-foreground">
              <PlayCircle className="size-12 opacity-90" />
              <div className="px-6">
                <p className="font-display text-lg font-semibold">Video coming soon</p>
                <p className="mt-1 text-sm text-primary-foreground/85">
                  This walkthrough is being added shortly. Check back in a moment.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogHeader className="space-y-1 p-5 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
