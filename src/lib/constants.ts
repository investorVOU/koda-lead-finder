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
      "Borehole Services",
      "Water Treatment",
      "Building Contractor",
      "Interior Design",
      "Welder",
      "Aluminium Fabricator",
      "Furniture Maker",
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
      "Supermarket",
      "African Restaurant",
      "Nigerian Restaurant",
      "Local Food Restaurant",
      "Shawarma Spot",
      "Grill & Barbecue",
      "Suya Spot",
      "Food Vendor",
      "Provision Store",
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
      "Diagnostic Centre",
      "Laboratory",
      "Maternity Clinic",
      "Dental Clinic",
      "Aesthetic Clinic",
      "Beauty & Wellness Centre",
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
      "Hair Salon",
      "Spa",
      "Skincare",
      "Lash Studio",
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
      "Fashion Store",
      "Cosmetics Store",
      "Building Materials",
      "Home Appliances",
      "Computer Store",
      "Phone Accessories",
      "Phone Store",
      "Gadget Store",
      "Spare Parts Dealer",
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
      "Consulting",
      "Business Consultant",
      "HR Services",
      "Recruitment Agency",
      "Architecture Firm",
      "Facility Management",
      "Property Management",
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
      "Car Detailing",
      "Motorcycle Dealer",
      "Vehicle Tracking",
      "Transport Company",
      "Mechanic",
      "Auto Electrician",
      "Panel Beater",
      "Vulcanizer",
      "Dispatch Rider",
      "Courier Service",
      "Car Hire",
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
      "Event Centre",
      "Shortlet",
      "Guest House",
      "Resort",
      "Banquet Hall",
      "Shortlet Apartment",
    ],
  },

  {
    group: "Laundry & Cleaning",
    items: [
      "Laundry & Dry Cleaning",
      "Car Detailing",
      "Commercial Cleaning",
      "Carpet Cleaning",
      "Home Cleaning",
      "Industrial Cleaning",
      "Laundry",
      "Cleaning Company",
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
      "Fashion Boutique",
      "Native Wear",
      "Ready To Wear",
      "Tailoring",
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
      "Phone Store",
      "Gadget Store",
      "Web Design Agency",
      "Cyber Cafe",
      "Phone Accessories",
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
      "Loan Company",
      "Financial Consultant",
      "Fintech",
      "POS Business",
      "Agent Banking",
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
      "Livestock Farm",
      "Crop Farm",
      "Agricultural Equipment",
      "Agro Processing",
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
      "Ministry",
      "Religious Organisation",
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
      "University",
      "College",
      "Training Centre",
      "Tutorial Centre",
      "Montessori School",
      "Private School",
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
      "Football Academy",
      "Sports Centre",
      "Recreation Centre",
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
      "Estate Developer",
      "Property Developer",
      "Facility Management",
      "Property Agent",
    ],
  },

  {
    group: "Nigeria-Specific Services",
    items: [
      "POS Business",
      "Agent Banking",
      "Generator Repair",
      "Generator Sales",
      "Inverter Installation",
      "Solar Installation",
      "Borehole Drilling",
      "Borehole Services",
      "Water Delivery",
      "Water Treatment",
      "Pure Water Factory",
      "Car Hire",
      "Dispatch Rider",
      "Courier Service",
      "Laundry",
      "Provision Store",
      "Phone Accessories",
      "Phone Repair",
      "Printing Press",
      "Cyber Cafe",
      "Event Centre",
      "Shortlet Apartment",
      "Property Agent",
      "Fashion Boutique",
      "Tailoring",
      "Catering",
      "Food Vendor",
      "Suya Spot",
      "Bakery",
      "Church",
      "Private School",
      "Tutorial Centre",
      "Security Company",
      "Cleaning Company",
      "Furniture Maker",
      "Aluminium Fabricator",
      "Welder",
      "Mechanic",
      "Auto Electrician",
      "Panel Beater",
      "Vulcanizer",
      "Spare Parts Dealer",
      "Generator Services",
    ],
  },
];

// Flat list for components that just need a string[]
export const LEAD_CATEGORIES: string[] =
  LEAD_CATEGORY_GROUPS
    .flatMap((g) => g.items)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a.localeCompare(b));

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "proposal",
  "closed",
  "paid",
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatusValue, string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal",
  closed: "Closed",
  paid: "Paid",
};

export const PLAN_LABELS: Record<string, string> = {
  none: "No active plan",
  pro: "Pro",
  max: "Max",
};

export interface LeadResult {
  placeId: string;
  name: string;
  category?: string;
  address: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  websiteUrl: string | null;
  mapsUrl: string;
}

// ── Website Deal Estimator ────────────────────────────────────────────────
// Completely deterministic.
// No AI/API call is made.
//
// The estimator gives the user a practical Nigerian website
// pricing range based on:
// - business category
// - business traction
// - review count
// - rating
// - whether the business already has a website
// - Nigerian market/location
//
// These are suggested sales ranges, NOT guaranteed market prices.

export type DealTier = "Starter" | "Growth" | "Premium";

export interface WebsiteEstimate {
  low: number;
  high: number;
  recommended: number;

  // Potential deal value is the amount the freelancer could
  // reasonably target for the project.
  potentialDealValue: number;

  tier: DealTier;

  confidence: "Low" | "Medium" | "High";

  reasons: string[];
}

const CATEGORY_BASE_PRICES: Record<string, [number, number]> = {
  // ── High-value businesses ──────────────────────────────────────────────

  "Law Firm": [250_000, 600_000],
  "Real Estate": [250_000, 650_000],
  "Real Estate Agency": [250_000, 650_000],
  "Property Management": [250_000, 650_000],
  "Property Agent": [180_000, 450_000],
  "Estate Developer": [350_000, 900_000],
  "Property Developer": [350_000, 900_000],

  "Hotel & Lodging": [300_000, 750_000],
  "Shortlet": [250_000, 600_000],
  "Shortlet Apartment": [250_000, 600_000],
  "Guest House": [220_000, 500_000],
  "Resort": [300_000, 750_000],

  "Event Centre": [250_000, 600_000],
  "Conference & Venue": [250_000, 600_000],
  "Banquet Hall": [220_000, 550_000],
  "Wedding Services": [200_000, 500_000],

  "Hospital": [350_000, 900_000],
  "Medical Clinic": [250_000, 600_000],
  "Dental Clinic": [250_000, 600_000],
  "Dentist": [250_000, 600_000],
  "Diagnostic Centre": [250_000, 600_000],
  "Laboratory": [200_000, 500_000],
  "Maternity Clinic": [250_000, 600_000],

  "Private School": [250_000, 650_000],
  "Primary School": [200_000, 500_000],
  "Secondary School": [250_000, 600_000],
  "University": [400_000, 1_000_000],
  "College": [300_000, 750_000],
  "Training Centre": [180_000, 450_000],

  // ── Professional services ─────────────────────────────────────────────

  "Accounting": [200_000, 500_000],
  "Insurance Agency": [200_000, 500_000],
  "Marketing Agency": [200_000, 500_000],
  "Consulting": [200_000, 550_000],
  "Business Consultant": [200_000, 550_000],
  "Architecture Firm": [250_000, 650_000],
  "Interior Design": [250_000, 600_000],
  "Immigration Services": [200_000, 500_000],
  "Security Services": [200_000, 500_000],
  "Security Company": [200_000, 500_000],
  "Recruitment Agency": [200_000, 500_000],
  "HR Services": [180_000, 450_000],

  // ── Trades ────────────────────────────────────────────────────────────

  "Solar Installation": [200_000, 500_000],
  "Generator Services": [150_000, 400_000],
  "Generator Repair": [120_000, 350_000],
  "Generator Sales": [150_000, 400_000],
  "Inverter Installation": [180_000, 450_000],
  "Borehole Services": [150_000, 400_000],
  "Borehole Drilling": [180_000, 450_000],
  "Water Treatment": [150_000, 400_000],
  "Water Delivery": [120_000, 300_000],

  "Building Contractor": [250_000, 600_000],
  "Plumbing": [150_000, 350_000],
  "Electrician": [150_000, 350_000],
  "Roofing": [180_000, 400_000],
  "Landscaping": [150_000, 350_000],
  "Painting": [120_000, 300_000],
  "Carpentry": [150_000, 350_000],
  "Welder": [120_000, 300_000],
  "Aluminium Fabricator": [150_000, 350_000],
  "Furniture Maker": [150_000, 400_000],

  // ── Food ──────────────────────────────────────────────────────────────

  "Restaurant": [180_000, 450_000],
  "Nigerian Restaurant": [180_000, 450_000],
  "African Restaurant": [180_000, 450_000],
  "Local Food Restaurant": [150_000, 350_000],
  "Suya Spot": [120_000, 300_000],
  "Shawarma Spot": [120_000, 300_000],
  "Grill & Barbecue": [150_000, 350_000],
  "Bakery": [150_000, 400_000],
  "Catering": [150_000, 400_000],
  "Fast Food": [150_000, 350_000],
  "Coffee Shop": [150_000, 350_000],
  "Food Vendor": [100_000, 250_000],
  "Provision Store": [100_000, 250_000],

  // ── Retail ────────────────────────────────────────────────────────────

  "Clothing Store": [150_000, 350_000],
  "Fashion Store": [150_000, 350_000],
  "Fashion Boutique": [150_000, 400_000],
  "Shoe Store": [150_000, 350_000],
  "Jewelry Store": [200_000, 500_000],
  "Electronics Store": [180_000, 450_000],
  "Furniture Store": [200_000, 500_000],
  "Supermarket": [200_000, 500_000],
  "Building Materials": [200_000, 500_000],
  "Home Appliances": [180_000, 450_000],
  "Computer Store": [180_000, 450_000],
  "Phone Store": [150_000, 350_000],
  "Gadget Store": [150_000, 350_000],
  "Spare Parts Dealer": [150_000, 400_000],

  // ── Beauty ─────────────────────────────────────────────────────────────

  "Salon & Beauty": [120_000, 300_000],
  "Barbershop": [100_000, 250_000],
  "Nail Salon": [120_000, 280_000],
  "Spa": [150_000, 350_000],
  "Spa & Wellness": [150_000, 350_000],
  "Makeup Artist": [120_000, 300_000],
  "Hair Salon": [120_000, 300_000],
  "Skincare": [120_000, 300_000],
  "Lash Studio": [120_000, 280_000],

  // ── Auto ──────────────────────────────────────────────────────────────

  "Auto Repair": [150_000, 350_000],
  "Mechanic": [120_000, 300_000],
  "Auto Electrician": [120_000, 300_000],
  "Panel Beater": [120_000, 300_000],
  "Vulcanizer": [100_000, 250_000],
  "Car Wash": [120_000, 300_000],
  "Car Dealership": [250_000, 650_000],
  "Car Rental": [200_000, 500_000],
  "Car Hire": [180_000, 450_000],
  "Logistics & Courier": [200_000, 500_000],
  "Courier Service": [150_000, 400_000],
  "Transport Company": [200_000, 500_000],

  // ── Technology ────────────────────────────────────────────────────────

  "Software Company": [250_000, 700_000],
  "IT Support": [200_000, 500_000],
  "CCTV & Security Tech": [180_000, 450_000],
  "Web Design Agency": [200_000, 500_000],
  "Phone Repair": [120_000, 300_000],
  "Computer Repair": [150_000, 350_000],

  // ── Finance ───────────────────────────────────────────────────────────

  "Microfinance Bank": [300_000, 750_000],
  "POS Agent": [100_000, 250_000],
  "POS Business": [100_000, 250_000],
  "Agent Banking": [100_000, 250_000],
  "Bureau de Change": [200_000, 500_000],
  "Money Transfer": [150_000, 400_000],
  "Loan Company": [200_000, 500_000],
  "Financial Consultant": [200_000, 500_000],
  "Fintech": [300_000, 800_000],
};

const HIGH_VALUE_CATEGORIES = new Set([
  "Law Firm",
  "Real Estate",
  "Real Estate Agency",
  "Property Management",
  "Property Agent",
  "Estate Developer",
  "Property Developer",
  "Hotel & Lodging",
  "Shortlet",
  "Shortlet Apartment",
  "Hospital",
  "University",
  "College",
  "Software Company",
  "Car Dealership",
  "Private School",
  "Event Centre",
  "Conference & Venue",
  "Architecture Firm",
  "Solar Installation",
  "Microfinance Bank",
  "Fintech",
]);

const MAJOR_NIGERIAN_LOCATIONS = [
  "lagos",
  "abuja",
  "port harcourt",
  "lekki",
  "ikeja",
  "victoria island",
  "vi",
  "ikoyi",
  "yaba",
  "surulere",
  "ajah",
  "wuse",
  "maitama",
  "garki",
  "asokoro",
  "jabi",
  "kaduna",
  "ibadan",
  "benin city",
  "benin",
  "enugu",
  "warri",
  "owerri",
  "uyo",
  "calabar",
  "abeokuta",
  "ilorin",
  "jos",
  "kano",
  "onitsha",
  "aba",
];

function roundToNearest10k(value: number): number {
  return Math.round(value / 10_000) * 10_000;
}

export function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}

export function estimateWebsiteDeal(
  lead: LeadResult,
  category: string,
  location: string,
): WebsiteEstimate {
  const normalizedCategory = category.trim();

  const base =
    CATEGORY_BASE_PRICES[normalizedCategory] ??
    [150_000, 350_000];

  let low = base[0];
  let high = base[1];

  const reasons: string[] = [];

  // No website = stronger sales opportunity.
  if (!lead.hasWebsite) {
    low += 20_000;
    high += 50_000;
    reasons.push("No existing website");
  }

  // Strong rating = easier justification for a professional site.
  if ((lead.rating ?? 0) >= 4.5) {
    low += 20_000;
    high += 60_000;
    reasons.push("Strong customer rating");
  } else if ((lead.rating ?? 0) >= 4.0) {
    low += 10_000;
    high += 30_000;
    reasons.push("Good customer rating");
  }

  // Reviews act as a simple traction signal.
  if (lead.reviewCount >= 500) {
    low += 50_000;
    high += 120_000;
    reasons.push("500+ customer reviews");
  } else if (lead.reviewCount >= 200) {
    low += 30_000;
    high += 80_000;
    reasons.push("200+ customer reviews");
  } else if (lead.reviewCount >= 50) {
    low += 15_000;
    high += 40_000;
    reasons.push("Established review history");
  } else if (lead.reviewCount >= 10) {
    reasons.push("Active customer history");
  }

  const normalizedLocation = location.toLowerCase();

  if (
    MAJOR_NIGERIAN_LOCATIONS.some((city) =>
      normalizedLocation.includes(city),
    )
  ) {
    low += 20_000;
    high += 60_000;
    reasons.push("Major Nigerian business market");
  }

  if (HIGH_VALUE_CATEGORIES.has(normalizedCategory)) {
    low += 30_000;
    high += 100_000;
    reasons.push("High-value business category");
  }

  // Smaller businesses should not automatically receive
  // enterprise-level pricing.
  if (
    lead.reviewCount < 10 &&
    (lead.rating ?? 0) < 4.2
  ) {
    low = Math.max(100_000, low - 20_000);
    high = Math.max(180_000, high - 30_000);
    reasons.push("Smaller early-stage business");
  }

  low = roundToNearest10k(low);
  high = roundToNearest10k(high);

  if (high <= low) {
    high = low + 100_000;
  }

  const recommended = roundToNearest10k(
    (low + high) / 2,
  );

  // The recommended quote is the primary potential deal value.
  const potentialDealValue = recommended;

  let tier: DealTier = "Starter";

  if (recommended >= 350_000) {
    tier = "Premium";
  } else if (recommended >= 200_000) {
    tier = "Growth";
  }

  let confidence: WebsiteEstimate["confidence"] = "Low";

  if (lead.reviewCount >= 50) {
    confidence = "Medium";
  }

  if (
    lead.reviewCount >= 200 ||
    (lead.rating ?? 0) >= 4.5
  ) {
    confidence = "High";
  }

  return {
    low,
    high,
    recommended,
    potentialDealValue,
    tier,
    confidence,
    reasons: reasons.slice(0, 4),
  };
}
