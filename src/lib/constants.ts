// ── Business categories ────────────────────────────────────────────────────
// Used in SearchForm (dropdown) and Onboarding (picker).
// "__custom__" is a UI sentinel — never passed to the search API.

export const LEAD_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Home & Trades",
    items: [
      "HVAC",
      "Plumbing",
      "Electrician",
      "Roofing",
      "Landscaping",
      "Cleaning Services",
      "Pest Control",
      "Painting",
      "Carpentry",
      "Flooring & Tiling",
      "Window & Door Installation",
      "Swimming Pool Services",
      "Solar Installation",
      "Generator Services",
      "Moving Company",
      "Storage Facility",
    ],
  },
  {
    group: "Food & Drink",
    items: [
      "Restaurant",
      "Bakery",
      "Catering",
      "Coffee Shop",
      "Bar & Pub",
      "Fast Food",
      "Pizza Place",
      "Chinese Restaurant",
      "Indian Restaurant",
      "Sushi Restaurant",
      "Food Truck",
      "Ice Cream Shop",
      "Juice Bar",
      "Butcher Shop",
      "Grocery Store",
    ],
  },
  {
    group: "Health & Wellness",
    items: [
      "Dentist",
      "Optometrist",
      "Chiropractor",
      "Physiotherapy",
      "Veterinarian",
      "Pharmacy",
      "Medical Clinic",
      "Hospital",
      "Spa & Wellness",
      "Mental Health Clinic",
      "Gym & Fitness",
      "Yoga Studio",
      "Massage Therapy",
    ],
  },
  {
    group: "Beauty & Personal Care",
    items: [
      "Salon & Beauty",
      "Barbershop",
      "Nail Salon",
      "Eyebrow & Threading",
      "Tattoo Studio",
      "Waxing Studio",
      "Makeup Artist",
      "Hair Braiding",
    ],
  },
  {
    group: "Retail & Shopping",
    items: [
      "Clothing Store",
      "Shoe Store",
      "Jewelry Store",
      "Electronics Store",
      "Furniture Store",
      "Book Store",
      "Florist",
      "Pet Store",
      "Toy Store",
      "Gift Shop",
      "Sports & Outdoors",
      "Optician",
      "Pharmacy",
      "Supermarket",
    ],
  },
  {
    group: "Professional Services",
    items: [
      "Law Firm",
      "Accounting",
      "Real Estate",
      "Insurance Agency",
      "Travel Agency",
      "Marketing Agency",
      "IT Support",
      "Printing & Design",
      "Photography",
      "Videography",
      "Security Services",
      "Immigration Services",
      "Notary",
      "Driving School",
      "Tutoring & Education",
    ],
  },
  {
    group: "Auto & Transport",
    items: [
      "Auto Repair",
      "Car Wash",
      "Car Dealership",
      "Car Rental",
      "Tyre Shop",
      "Auto Parts",
      "Taxi & Ride Service",
      "Logistics & Courier",
      "Truck Repair",
    ],
  },
  {
    group: "Hospitality & Events",
    items: [
      "Hotel & Lodging",
      "Airbnb Management",
      "Event Planning",
      "Wedding Services",
      "DJ & Entertainment",
      "Party Rentals",
      "Conference & Venue",
    ],
  },
  {
    group: "Laundry & Cleaning",
    items: [
      "Laundry & Dry Cleaning",
      "Car Detailing",
      "Commercial Cleaning",
      "Carpet Cleaning",
    ],
  },
  {
    group: "Fashion & Tailoring",
    items: [
      "Tailor",
      "Fashion Designer",
      "Fabric Store",
      "Alterations & Repairs",
      "Thrift & Vintage Store",
      "Embroidery & Printing",
      "Bridal Shop",
    ],
  },
  {
    group: "Technology & Gadgets",
    items: [
      "Phone Repair",
      "Computer Repair",
      "Electronics Store",
      "CCTV & Security Tech",
      "Cybercafe / Internet Cafe",
      "IT Support",
      "Software Company",
      "Tech Accessories Store",
    ],
  },
  {
    group: "Finance & Money",
    items: [
      "Microfinance Bank",
      "POS Agent",
      "Bureau de Change",
      "Money Transfer",
      "Insurance Agency",
      "Cooperative Society",
      "Pawnshop",
    ],
  },
  {
    group: "Agriculture & Farming",
    items: [
      "Farm & Agriculture",
      "Agro Dealer",
      "Feed Store",
      "Plant Nursery",
      "Fish Farm",
      "Poultry Farm",
      "Irrigation & Equipment",
    ],
  },
  {
    group: "Religious & Community",
    items: [
      "Church",
      "Mosque",
      "Temple & Shrine",
      "Community Centre",
      "Charity & NGO",
      "Cemetery & Memorial",
    ],
  },
  {
    group: "Children & Education",
    items: [
      "Daycare & Nursery",
      "Primary School",
      "Secondary School",
      "After-School Tutoring",
      "Driving School",
      "Vocational School",
      "Language School",
      "Music School",
      "Dance Studio",
    ],
  },
  {
    group: "Sports & Recreation",
    items: [
      "Sports Club",
      "Swimming Pool",
      "Snooker / Pool Hall",
      "Gaming Centre",
      "Bowling Alley",
      "Cycling & Fitness",
      "Martial Arts",
    ],
  },
  {
    group: "Construction & Real Estate",
    items: [
      "Building Contractor",
      "Architecture Firm",
      "Interior Design",
      "Real Estate Agency",
      "Property Management",
      "Surveyor",
      "Building Materials",
      "Steel & Aluminium",
    ],
  },
];

// Flat list for components that just need a string[]
export const LEAD_CATEGORIES: string[] = LEAD_CATEGORY_GROUPS.flatMap((g) => g.items)
  // deduplicate (e.g. Pharmacy appears in two groups)
  .filter((v, i, arr) => arr.indexOf(v) === i)
  .sort((a, b) => a.localeCompare(b));

export const LEAD_STATUSES = ["new", "contacted", "proposal", "closed", "paid"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatusValue, string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal",
  closed: "Closed",
  paid: "Paid",
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
