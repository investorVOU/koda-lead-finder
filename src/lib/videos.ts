// Demo + sales-training video library for Kodarai.
// Priority order in the modal: youtubeId → instagramUrl → tiktokUrl → "coming soon"
// TikTok: paste the full video URL (https://www.tiktok.com/@user/video/ID) or just the numeric ID.

export type LearnCategory = "Cold Calling" | "Sales & Closing" | "Using Kodarai";

export interface LearnVideo {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  category: LearnCategory;
  duration: string;
}

export const DEMO_VIDEO = {
  youtubeId: "jsRqPL9gzbw",
  instagramUrl: "",
  tiktokUrl: "",
  title: "How to sell websites to local businesses",
  description:
    "A practical walkthrough for finding businesses without websites and turning them into web design clients.",
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  "Cold Calling",
  "Sales & Closing",
  "Using Kodarai",
];

export const LEARN_VIDEOS: LearnVideo[] = [
  {
    id: "cc-1",
    title: "Your first cold call, step by step",
    description: "A simple, repeatable opener that gets local business owners to actually listen.",
    youtubeId: "4OweikRF7bg",
    category: "Cold Calling",
    duration: "8 min",
  },
  {
    id: "cc-2",
    title: "Handling 'we're not interested'",
    description: "Turn the most common brush-off into a real conversation without being pushy.",
    youtubeId: "D2mjP-FTqlI",
    category: "Cold Calling",
    duration: "6 min",
  },
  {
    id: "cc-3",
    title: "Cold call tonality & confidence",
    description: "How to sound calm, credible, and human — even on your very first calls.",
    youtubeId: "5XN3rVeWecM",
    category: "Cold Calling",
    duration: "10 min",
  },
  {
    id: "sc-1",
    title: "Pricing a website so they say yes",
    description: "Frame your offer around results, not hours, and close at higher rates.",
    youtubeId: "E7G_xDCLHOA",
    category: "Sales & Closing",
    duration: "12 min",
  },
  {
    id: "sc-2",
    title: "The follow-up that closes deals",
    description: "Most sales happen after the 3rd touch. Here's the follow-up sequence that works.",
    youtubeId: "vlgiEQRtd98",
    category: "Sales & Closing",
    duration: "9 min",
  },
  {
    id: "sc-3",
    title: "Closing without being salesy",
    description: "Natural closing lines that move prospects to a decision and protect the relationship.",
    youtubeId: "XiZfG2u6SfQ",
    category: "Sales & Closing",
    duration: "7 min",
  },
  {
    id: "kr-1",
    title: "Finding no-website leads in 60 seconds",
    description: "Use the Lead Finder to surface high-rated businesses missing a website.",
    youtubeId: "oCpSfbdLJLM",
    category: "Using Kodarai",
    duration: "5 min",
  },
  {
    id: "kr-2",
    title: "From lead to live site with AI prompts",
    description: "Generate a build prompt and ship a demo site the same day you call.",
    youtubeId: "DGRx021xpsc",
    category: "Using Kodarai",
    duration: "6 min",
  },
];
