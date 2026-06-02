import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function GenerateDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  content: string;
  loading: boolean;
}) {
  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Generating with AI…</p>
          </div>
        ) : (
          <>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border bg-muted/40 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {content}
              </pre>
            </div>
            <Button variant="hero" onClick={copy} disabled={!content}>
              <Copy className="size-4" /> Copy
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
