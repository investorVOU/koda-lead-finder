import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Youtube, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio/channel-review")({
  head: () => ({ meta: [{ title: "Channel Review — Kodarai" }] }),
  component: ChannelReviewPage,
});

function ChannelReviewPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <BackButton />

        <ModuleHeader
          icon={Youtube}
          title="Channel Review"
          description="Analyze a YouTube channel and discover what's working, what's missing, and what to create next."
        />

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 text-base font-semibold">
            Channel intelligence is coming here
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Enter a YouTube channel and KodarAI will break down its content,
            titles, topics, positioning and opportunities.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}

function BackButton() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-5">
      <Link to="/studio">
        <ArrowLeft className="size-4" />
        Studio
      </Link>
    </Button>
  );
}

function ModuleHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Youtube;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
