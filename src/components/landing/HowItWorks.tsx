import { FadeUp } from "./FadeUp";

const steps = [
  {
    n: "01",
    title: "Search a niche & location",
    desc: "Pick a category like HVAC, Plumbing or Restaurant and enter a city — “Lagos, Nigeria” or “Chicago, USA”.",
  },
  {
    n: "02",
    title: "Get businesses with no website",
    desc: "Kodarai returns high-rated local businesses missing a website, with phone, address and ratings.",
  },
  {
    n: "03",
    title: "Generate prompt & script",
    desc: "One click creates an AI website-build prompt and a tailored cold-call script for each lead.",
  },
  {
    n: "04",
    title: "Pitch, track & close",
    desc: "Reach out, move leads through your pipeline, and turn cold prospects into paying clients.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
        <FadeUp>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-4xl">From search to signed client</h2>
            <p className="mt-3 text-muted-foreground sm:mt-4">Four simple steps. Minutes, not weeks.</p>
          </div>
        </FadeUp>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-5 lg:grid-cols-4">
          {steps.map((s, i) => (
            <FadeUp key={s.n} delay={i * 100}>
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <span className="font-display text-2xl font-bold text-primary/30 sm:text-3xl">{s.n}</span>
                <h3 className="mt-2 text-base font-semibold sm:mt-3 sm:text-lg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2">{s.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
