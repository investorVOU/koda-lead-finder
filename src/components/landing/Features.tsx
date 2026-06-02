import { Bot, FileText, MapPinned, Phone, ShieldCheck, Workflow } from "lucide-react";

const features = [
  {
    icon: MapPinned,
    title: "No-Website Lead Finder",
    desc: "Search any category and city worldwide. We surface high-rated businesses that have no website yet.",
  },
  {
    icon: ShieldCheck,
    title: "Ratings & Reviews Built In",
    desc: "Every lead shows its Google rating and review count, so you target businesses worth your time.",
  },
  {
    icon: Bot,
    title: "AI Website Prompts",
    desc: "Generate detailed prompts tuned for Lovable, Framer AI, v0 and Claude — built from real business data.",
  },
  {
    icon: Phone,
    title: "Cold Call Scripts",
    desc: "Get a personalized, ready-to-read sales script for each lead to start the conversation with confidence.",
  },
  {
    icon: Workflow,
    title: "Lead Pipeline",
    desc: "Move leads through New → Contacted → Proposal → Closed and never lose track of an opportunity.",
  },
  {
    icon: FileText,
    title: "Save & Export Leads",
    desc: "Bookmark your best prospects, add notes, and keep a clean, organized list of who to reach next.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to land clients</h2>
        <p className="mt-4 text-muted-foreground">
          From finding the right prospect to closing the deal — KodaRai handles the busywork so you
          can focus on building websites.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-[image:var(--gradient-primary)] group-hover:text-primary-foreground">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
