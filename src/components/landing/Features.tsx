import { Code2, FileText, MapPinned, Phone, ShieldCheck, Workflow } from "lucide-react";
import { FadeUp } from "./FadeUp";

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
    icon: Code2,
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
    <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-28">
      <FadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-4xl">Everything you need to land clients</h2>
          <p className="mt-3 text-muted-foreground sm:mt-4">
            From finding the right prospect to closing the deal — Kodarai handles the busywork so you
            can focus on building websites.
          </p>
        </div>
      </FadeUp>

      <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {features.map((f, i) => (
          <FadeUp key={f.title} delay={i * 80}>
            <div className="group flex h-full gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-[var(--shadow-md)] sm:block sm:p-6 sm:hover:-translate-y-1">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-[image:var(--gradient-primary)] group-hover:text-primary-foreground">
                <f.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold sm:mt-4 sm:text-lg">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{f.desc}</p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}
