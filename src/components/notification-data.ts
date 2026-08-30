export type NotificationCategory = "deal" | "leads" | "upgrade" | "activity";

export interface LiveNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
}

export const NOTIFICATION_POOL: LiveNotification[] = [
  // Deals
  {
    id: "deal-001",
    category: "deal",
    title: "A $750 website deal was just closed",
    description: "Found through Lead Finder.",
  },
  {
    id: "deal-002",
    category: "deal",
    title: "A $1,200 deal was closed this week",
    description: "Started with a single search.",
  },
  {
    id: "deal-003",
    category: "deal",
    title: "A user just landed their 3rd client this month",
    description: "All found through Lead Finder.",
  },
  {
    id: "deal-004",
    category: "deal",
    title: "A $600 deal was closed in under 48 hours",
    description: "From lead to signed client.",
  },
  {
    id: "deal-005",
    category: "deal",
    title: "A user closed a $900 website deal",
    description: "Reached out the same day it was found.",
  },
  {
    id: "deal-006",
    category: "deal",
    title: "A call was just booked with a potential client",
    description: "Sourced through Lead Finder.",
  },
  {
    id: "deal-007",
    category: "deal",
    title: "A $450 deal was closed from a single outreach",
    description: "Cold email, warm response.",
  },
  {
    id: "deal-008",
    category: "deal",
    title: "A user just closed their first deal this month",
    description: "Found the business, made the pitch.",
  },
  {
    id: "deal-009",
    category: "deal",
    title: "A $1,500 deal was closed this week",
    description: "One of the highest deal values this week.",
  },
  {
    id: "deal-010",
    category: "deal",
    title: "A user booked 2 client calls this week",
    description: "Both came from Lead Finder searches.",
  },
  {
    id: "deal-011",
    category: "deal",
    title: "A $350 starter deal was closed",
    description: "First client, first week.",
  },
  {
    id: "deal-012",
    category: "deal",
    title: "A user just got a response from a lead",
    description: "The outreach turned into a conversation.",
  },
  {
    id: "deal-013",
    category: "deal",
    title: "A $800 website opportunity turned into a client",
    description: "The business was found through Lead Finder.",
  },
  {
    id: "deal-014",
    category: "deal",
    title: "A user turned 14 leads into 3 client conversations",
    description: "Now working on closing the deals.",
  },
  {
    id: "deal-015",
    category: "deal",
    title: "A $950 website project was landed",
    description: "The opportunity started with one lead.",
  },
  {
    id: "deal-016",
    category: "deal",
    title: "A user closed 2 deals from the same niche",
    description: "Found both opportunities with Lead Finder.",
  },

  // Lead discovery
  {
    id: "leads-001",
    category: "leads",
    title: "47 potential leads were just found",
    description: "One search, dozens of opportunities.",
  },
  {
    id: "leads-002",
    category: "leads",
    title: "38 businesses without websites were found",
    description: "Ready to reach out.",
  },
  {
    id: "leads-003",
    category: "leads",
    title: "64 potential clients found in one search",
    description: "Sorted by deal value.",
  },
  {
    id: "leads-004",
    category: "leads",
    title: "27 high-potential leads were uncovered",
    description: "Filtered by rating and reviews.",
  },
  {
    id: "leads-005",
    category: "leads",
    title: "91 businesses without websites found",
    description: "In a single niche search.",
  },
  {
    id: "leads-006",
    category: "leads",
    title: "43 new opportunities were found",
    description: "Ready to pitch.",
  },
  {
    id: "leads-007",
    category: "leads",
    title: "18 leads were added to a pipeline",
    description: "Tracked and ready for follow-up.",
  },
  {
    id: "leads-008",
    category: "leads",
    title: "22 businesses were researched in minutes",
    description: "Reviews, ratings and deal estimates included.",
  },
  {
    id: "leads-009",
    category: "leads",
    title: "A niche search returned 55 leads",
    description: "Businesses with strong sales potential.",
  },
  {
    id: "leads-010",
    category: "leads",
    title: "12 outreach messages were sent",
    description: "Businesses identified through Lead Finder.",
  },
  {
    id: "leads-011",
    category: "leads",
    title: "A pipeline just hit 30 tracked leads",
    description: "Organized and ready to follow up.",
  },
  {
    id: "leads-012",
    category: "leads",
    title: "76 potential clients were found",
    description: "Across three different niches.",
  },
  {
    id: "leads-013",
    category: "leads",
    title: "52 businesses were flagged as potential clients",
    description: "Strong ratings and room for a better online presence.",
  },
  {
    id: "leads-014",
    category: "leads",
    title: "34 new website opportunities were identified",
    description: "Businesses ready for a better online presence.",
  },
  {
    id: "leads-015",
    category: "leads",
    title: "61 businesses were added to a lead list",
    description: "Ready for research and outreach.",
  },
  {
    id: "leads-016",
    category: "leads",
    title: "29 promising businesses were discovered",
    description: "Potential clients ready to be contacted.",
  },

  // Upgrades
  {
    id: "upgrade-001",
    category: "upgrade",
    title: "A user just upgraded to Pro",
    description: "Ready to find more clients.",
  },
  {
    id: "upgrade-002",
    category: "upgrade",
    title: "A new user started on the Growth plan",
    description: "Unlocking more searches.",
  },
  {
    id: "upgrade-003",
    category: "upgrade",
    title: "A user upgraded after their first deal",
    description: "Scaling up their outreach.",
  },
  {
    id: "upgrade-004",
    category: "upgrade",
    title: "Someone just activated the Pro plan",
    description: "More leads, more content, more capacity.",
  },
  {
    id: "upgrade-005",
    category: "upgrade",
    title: "A user just renewed their subscription",
    description: "Sticking with what's working.",
  },
  {
    id: "upgrade-006",
    category: "upgrade",
    title: "A new Pro subscriber joined",
    description: "Ready to grow faster.",
  },
  {
    id: "upgrade-007",
    category: "upgrade",
    title: "A user upgraded their plan",
    description: "More capacity for research and outreach.",
  },
  {
    id: "upgrade-008",
    category: "upgrade",
    title: "Someone just moved up to the Growth plan",
    description: "More leads per month.",
  },
  {
    id: "upgrade-009",
    category: "upgrade",
    title: "A user moved to Pro after finding their first client",
    description: "Now scaling their lead generation.",
  },
  {
    id: "upgrade-010",
    category: "upgrade",
    title: "A user upgraded to unlock more lead searches",
    description: "More opportunities to reach out to.",
  },

  // Studio / activity
  {
    id: "activity-001",
    category: "activity",
    title: "12 video ideas were just generated",
    description: "Titles, hooks and angles included.",
  },
  {
    id: "activity-002",
    category: "activity",
    title: "A full YouTube script was just generated",
    description: "Ready to record.",
  },
  {
    id: "activity-003",
    category: "activity",
    title: "25 businesses were researched",
    description: "Reviews and ratings analyzed by AI.",
  },
  {
    id: "activity-004",
    category: "activity",
    title: "A channel review was just completed",
    description: "Patterns and content gaps identified.",
  },
  {
    id: "activity-005",
    category: "activity",
    title: "18 new content opportunities were found",
    description: "Based on real channel data.",
  },
  {
    id: "activity-006",
    category: "activity",
    title: "A niche research session just finished",
    description: "Ready to plan the next video.",
  },
  {
    id: "activity-007",
    category: "activity",
    title: "10 title ideas were generated",
    description: "Built around different angles.",
  },
  {
    id: "activity-008",
    category: "activity",
    title: "A Shorts script was just written",
    description: "Ready to film.",
  },
  {
    id: "activity-009",
    category: "activity",
    title: "A channel's top videos were analyzed",
    description: "Outlier videos identified.",
  },
  {
    id: "activity-010",
    category: "activity",
    title: "8 hooks were generated for a new video",
    description: "Each with a different angle.",
  },
  {
    id: "activity-011",
    category: "activity",
    title: "A complete outreach pitch was generated",
    description: "Personalized for a newly discovered business.",
  },
  {
    id: "activity-012",
    category: "activity",
    title: "A user's next video angle was found",
    description: "Based on what's already performing.",
  },
  {
    id: "activity-013",
    category: "activity",
    title: "15 video topics were researched",
    description: "Ideas ready for the content calendar.",
  },
  {
    id: "activity-014",
    category: "activity",
    title: "A competitor channel was analyzed",
    description: "Top-performing patterns identified.",
  },
];
