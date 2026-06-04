import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-[image:var(--gradient-primary)] px-6 py-12 text-center sm:px-12 sm:py-14">
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-primary-foreground sm:text-4xl">
            Start finding clients today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90">
            Grab a $2 lead pack and land your first client this week. Pay by card or Paystack —
            cancel anytime.
          </p>
          <Button
            variant="secondary"
            size="xl"
            className="mt-8 bg-card text-foreground hover:bg-card/90"
            asChild
          >
            <Link to="/signup">
              Get your first client for $2
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
