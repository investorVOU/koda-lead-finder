import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-[image:var(--gradient-primary)] px-6 py-14 text-center sm:px-12">
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Start finding clients today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90">
            Get 20 free searches. No credit card required. Land your first client before your trial
            ends.
          </p>
          <Button
            variant="secondary"
            size="xl"
            className="mt-8 bg-card text-foreground hover:bg-card/90"
          >
            Start 7-day free trial
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
