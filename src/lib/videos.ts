// Demo + sales-training video library for KodaRai.
// Paste real YouTube video IDs into `youtubeId` (the part after watch?v=).
// Cards render beautifully even before IDs are added; the player shows a
// friendly "coming soon" state until a valid ID is present.

export type LearnCategory = "Cold Calling" | "Sales & Closing" | "Using KodaRai";

export interface LearnVideo {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  category: LearnCategory;
  duration: string;
}

export const DEMO_VIDEO = {
  youtubeId: "", // ← paste your product demo YouTube ID here
  title: "See KodaRai in action",
  description:
    "Watch how freelancers find top-rated businesses with no website, generate a site in minutes, and get paid.",
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  "Cold Calling",
  "Sales & Closing",
  "Using KodaRai",
];

export const LEARN_VIDEOS: LearnVideo[] = [
  {
    id: "cc-1",
    title: "Your first cold call, step by step",
    description: "A simple, repeatable opener that gets local business owners to actually listen.",
    youtubeId: "",
    category: "Cold Calling",
    duration: "8 min",
  },
  {
    id: "cc-2",
    title: "Handling 'we're not interested'",
    description: "Turn the most common brush-off into a real conversation without being pushy.",
    youtubeId: "",
    category: "Cold Calling",
    duration: "6 min",
  },
  {
    id: "cc-3",
    title: "Cold call tonality & confidence",
    description: "How to sound calm, credible, and human — even on your very first calls.",
    youtubeId: "",
    category: "Cold Calling",
    duration: "10 min",
  },
  {
    id: "sc-1",
    title: "Pricing a website so they say yes",
    description: "Frame your offer around results, not hours, and close at higher rates.",
    youtubeId: "",
    category: "Sales & Closing",
    duration: "12 min",
  },
  {
    id: "sc-2",
    title: "The follow-up that closes deals",
    description: "Most sales happen after the 3rd touch. Here's the follow-up sequence that works.",
    youtubeId: "",
    category: "Sales & Closing",
    duration: "9 min",
  },
  {
    id: "sc-3",
    title: "Closing without being salesy",
    description: "Natural closing lines that move prospects to a decision and protect the relationship.",
    youtubeId: "",
    category: "Sales & Closing",
    duration: "7 min",
  },
  {
    id: "kr-1",
    title: "Finding no-website leads in 60 seconds",
    description: "Use the Lead Finder to surface high-rated businesses missing a website.",
    youtubeId: "",
    category: "Using KodaRai",
    duration: "5 min",
  },
  {
    id: "kr-2",
    title: "From lead to live site with AI prompts",
    description: "Generate a build prompt and ship a demo site the same day you call.",
    youtubeId: "",
    category: "Using KodaRai",
    duration: "6 min",
  },
];
