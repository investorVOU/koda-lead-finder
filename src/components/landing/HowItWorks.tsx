const steps = [
  {
    n: "01",
    title: "Search a niche & location",
    desc: "Pick a category like HVAC, Plumbing or Restaurant and enter a city — “Lagos, Nigeria” or “Chicago, USA”.",
  },
  {
    n: "02",
    title: "Get businesses with no website",
    desc: "KodaRai returns high-rated local businesses missing a website, with phone, address and ratings.",
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
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">From search to signed client</h2>
          <p className="mt-4 text-muted-foreground">Four simple steps. Minutes, not weeks.</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <span className="font-display text-3xl font-bold text-primary/30">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
