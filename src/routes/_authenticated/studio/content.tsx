import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio/content")({
  head: () => ({ meta: [{ title: "Content Studio — Kodarai" }] }),
  component: ContentPage,
});

function ContentPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-5">
          <Link to="/studio">
            <ArrowLeft className="size-4" />
            Studio
          </Link>
        </Button>

        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <PenLine className="size-5 text-primary" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Content Studio
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Turn ideas and research into scripts, stories, hooks, titles and
              complete content.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 text-base font-semibold">
            Your AI content workspace
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            We'll build separate workflows for YouTube scripts, Shorts,
            stories, hooks, titles and other creator content.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
