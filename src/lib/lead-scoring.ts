import type { LeadResult } from "@/lib/constants";

export type LeadOpportunity = "High" | "Medium" | "Low";

export interface LeadScore {
  score: number;
  opportunity: LeadOpportunity;
  reasons: string[];
}

export function scoreLeadOpportunity(lead: LeadResult): LeadScore {
  let score = 0;
  const reasons: string[] = [];

  if (!lead.hasWebsite) {
    score += 35;
    reasons.push("No website gives you a clear, relevant opening.");
  } else {
    score += 5;
  }

  if ((lead.rating ?? 0) >= 4.5) {
    score += 25;
    reasons.push(`Strong ${lead.rating!.toFixed(1)} rating signals an established business.`);
  } else if ((lead.rating ?? 0) >= 4) {
    score += 15;
    reasons.push("A solid customer rating supports a credible outreach angle.");
  }

  if (lead.reviewCount >= 100) {
    score += 20;
    reasons.push(`${lead.reviewCount} reviews show proven customer demand.`);
  } else if (lead.reviewCount >= 30) {
    score += 12;
    reasons.push(`${lead.reviewCount} reviews show active customer interest.`);
  }

  if (lead.phone) {
    score += 10;
    reasons.push("A phone number is available for direct outreach.");
  }

  const finalScore = Math.min(score, 100);
  const opportunity: LeadOpportunity = finalScore >= 70 ? "High" : finalScore >= 45 ? "Medium" : "Low";

  return { score: finalScore, opportunity, reasons: reasons.slice(0, 3) };
}
