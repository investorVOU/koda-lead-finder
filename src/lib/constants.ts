export const LEAD_CATEGORIES = [
  "HVAC",
  "Plumbing",
  "Electrician",
  "Restaurant",
  "Salon & Beauty",
  "Barbershop",
  "Auto Repair",
  "Dentist",
  "Gym & Fitness",
  "Cleaning Services",
  "Real Estate",
  "Landscaping",
  "Roofing",
  "Pest Control",
  "Catering",
  "Photography",
  "Law Firm",
  "Accounting",
  "Car Wash",
  "Laundry & Dry Cleaning",
  "Bakery",
  "Pharmacy",
  "Hotel & Lodging",
  "Event Planning",
] as const;

export const LEAD_STATUSES = ["new", "contacted", "proposal", "closed"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatusValue, string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal",
  closed: "Closed",
};

export const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  pro: "Pro",
  max: "Max",
};

export interface LeadResult {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  websiteUrl: string | null;
  mapsUrl: string;
}
