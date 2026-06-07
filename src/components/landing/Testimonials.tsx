import { useCallback, useEffect, useState } from "react";
import { FadeUp } from "./FadeUp";
import { Star } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote:
      "I closed 3 local restaurants in my first week. The AI prompts let me ship demo sites the same day I called.",
    name: "Daniel O.",
    role: "Freelance Web Designer · Lagos",
  },
  {
    quote:
      "The no-website filter is gold. No more wasting hours checking if businesses already have a site.",
    name: "Sarah M.",
    role: "Agency Owner · Austin, TX",
  },
  {
    quote:
      "Cold-call scripts removed my anxiety. I sound prepared and the leads are actually relevant.",
    name: "James K.",
    role: "Developer · Manchester, UK",
  },
  {
    quote:
      "Went from 0 to 6 retainer clients in two months. Kodarai basically became my sales team.",
    name: "Amara N.",
    role: "Studio Founder · Abuja",
  },
  {
    quote:
      "Clean, fast, and the data is accurate. The pipeline keeps every prospect in one place.",
    name: "Marco V.",
    role: "Freelancer · Toronto",
  },
];

export function Testimonials() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api],
  );

  return (
    <section id="reviews" className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
      <FadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-4xl">Loved by freelancers worldwide</h2>
          <p className="mt-3 text-muted-foreground sm:mt-4">
            Designers and agencies use Kodarai to fill their pipeline every week.
          </p>
        </div>
      </FadeUp>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true, containScroll: "trimSnaps" }}
        plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
        className="mt-10 sm:mt-14"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {testimonials.map((t) => (
            <CarouselItem key={t.name} className="pl-3 sm:basis-1/2 lg:basis-1/3 sm:pl-4">
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-warning text-warning" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground sm:text-[15px]">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground text-sm">
                    {t.name.charAt(0)}
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="mt-8 flex justify-center gap-2">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === current
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
