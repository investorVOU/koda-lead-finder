import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
      "Went from 0 to 6 retainer clients in two months. KodaRai basically became my sales team.",
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
  return (
    <section id="reviews" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Loved by freelancers worldwide</h2>
        <p className="mt-4 text-muted-foreground">
          Designers and agencies use KodaRai to fill their pipeline every week.
        </p>
      </div>

      <Carousel opts={{ align: "start", loop: true }} className="mt-14">
        <CarouselContent className="-ml-4">
          {testimonials.map((t) => (
            <CarouselItem key={t.name} className="pl-4 sm:basis-1/2 lg:basis-1/3">
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-warning text-warning" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
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
        <div className="mt-6 flex justify-center gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </section>
  );
}
