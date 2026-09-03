import { useState } from "react";
import {
  Code2,
  FileText,
  MapPinned,
  Phone,
  ShieldCheck,
  Smartphone,
  Workflow,
  Youtube,
} from "lucide-react";
import { FadeUp } from "./FadeUp";

const features = [
  {
    icon: MapPinned,
    title: "No-Website Lead Finder",
    desc: "Search a city and business type. Find businesses that do not have a website yet.",
  },
  {
    icon: Code2,
    title: "Website Builder",
    desc: "Create a website sample from a real lead, edit it, and publish a link you can send to them.",
  },
  {
    icon: Youtube,
    title: "YouTube Channel Review",
    desc: "See what content is working, find better video ideas, and grow an audience that trusts you.",
  },
  {
    icon: ShieldCheck,
    title: "Ratings & Reviews Built In",
    desc: "See each lead's Google rating and review count, so you spend time on stronger businesses.",
  },
  {
    icon: Phone,
    title: "Cold Call Scripts",
    desc: "Get a simple script for each lead, so you know what to say when you call or message them.",
  },
  {
    icon: Workflow,
    title: "Lead Pipeline",
    desc: "Keep track of who is new, contacted, ready for a proposal, or already closed.",
  },
  {
    icon: FileText,
    title: "Save & Export Leads",
    desc: "Save your best leads, add notes, and keep a clean list of who to contact next.",
  },
  {
    icon: Smartphone,
    title: "Virtual Phone Numbers",
    desc: "Get a US, UK, Canadian, or Australian number for WhatsApp, SMS, and client callbacks.",
  },
];

export function Features() {
  const [showAllMobile, setShowAllMobile] = useState(false);

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:py-28">
      <FadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Tools that help you find clients and make more money
          </h2>
          <p className="mt-3 text-muted-foreground sm:mt-4">
            Find the right business, show them your work, and turn more conversations into paid jobs.
          </p>
        </div>
      </FadeUp>

      <div className="mt-7 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {features.map((feature, index) => (
          <FadeUp
            key={feature.title}
            delay={index * 80}
            className={index >= 3 && !showAllMobile ? "hidden sm:block" : undefined}
          >
            <div className="group flex h-full gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-[var(--shadow-md)] sm:block sm:gap-4 sm:p-6 sm:hover:-translate-y-1">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-[image:var(--gradient-primary)] group-hover:text-primary-foreground">
                <feature.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold sm:mt-4 sm:text-lg">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{feature.desc}</p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>

      <button
        type="button"
        className="mx-auto mt-5 flex items-center gap-2 text-sm font-semibold text-primary sm:hidden"
        onClick={() => setShowAllMobile((showing) => !showing)}
      >
        {showAllMobile ? "Show fewer tools" : `See all ${features.length} tools`}
        <span aria-hidden="true">{showAllMobile ? "↑" : "↓"}</span>
      </button>
    </section>
  );
}
