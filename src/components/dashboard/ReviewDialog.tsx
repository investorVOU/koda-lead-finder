import { Star } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ReviewAnalysis } from "@/lib/reviews.functions";

export function ReviewDialog({
  open,
  onOpenChange,
  businessName,
  analysis,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessName: string;
  analysis: ReviewAnalysis | null;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Analysis</DialogTitle>
          <DialogDescription>What customers say about {businessName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Analyzing Google reviews…</p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-muted/40 p-3 text-sm italic text-muted-foreground">
              "{analysis.summary}"
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">
                  What they love
                </h4>
                <ul className="space-y-1.5">
                  {analysis.likes.map((like, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                      {like}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                  Pain points
                </h4>
                <ul className="space-y-1.5">
                  {analysis.dislikes.length > 0 ? (
                    analysis.dislikes.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                        {d}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground">No major pain points</li>
                  )}
                </ul>
              </div>
            </div>

            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="size-3 fill-warning text-warning" />
              Use these insights to sharpen your AI website prompt for this lead.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
