import type { LeadResult } from "@/lib/constants";

export type BusinessSize = "Small" | "Medium" | "Large" | "Enterprise";
export type WebsiteComplexity = "Basic" | "Standard" | "Advanced" | "Premium";
export type LeadQuality = "Low" | "Medium" | "High" | "Very High";

export interface WebsiteEstimate {
  min: number;
  max: number;
  potentialDealValue: number;
  businessSize: BusinessSize;
  complexity: WebsiteComplexity;
  leadQuality: LeadQuality;
  score: number;
  reasons: string[];
}

interface PriceBand {
  min: number;
  max: number;
  complexity: WebsiteComplexity;
}

/**
 * Nigerian website pricing bands.
 *
 * These are not hard quotes.
 * They are prospecting estimates designed to help a freelancer
 * decide what a lead may realistically be worth.
 */
const CATEGORY_PRICES: Record<string, PriceBand> = {
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Home & Trades
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  HVAC: { min: 250000, max: 550000, complexity: "Standard" },
  Plumbing: { min: 220000, max: 500000, complexity: "Standard" },
  Electrician: { min: 220000, max: 500000, complexity: "Standard" },
  Roofing: { min: 280000, max: 650000, complexity: "Standard" },
  Landscaping: { min: 220000, max: 500000, complexity: "Standard" },
  "Cleaning Services": { min: 180000, max: 400000, complexity: "Basic" },
  "Pest Control": { min: 220000, max: 500000, complexity: "Standard" },
  Painting: { min: 180000, max: 400000, complexity: "Basic" },
  Carpentry: { min: 200000, max: 450000, complexity: "Standard" },
  "Flooring & Tiling": { min: 220000, max: 500000, complexity: "Standard" },
  "Window & Door Installation": { min: 220000, max: 500000, complexity: "Standard" },
  "Swimming Pool Services": { min: 250000, max: 600000, complexity: "Standard" },
  "Solar Installation": { min: 300000, max: 750000, complexity: "Advanced" },
  "Generator Services": { min: 220000, max: 550000, complexity: "Standard" },
  "Moving Company": { min: 250000, max: 550000, complexity: "Standard" },
  "Storage Facility": { min: 250000, max: 600000, complexity: "Standard" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Food & Drink
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  Restaurant: { min: 300000, max: 700000, complexity: "Standard" },
  Bakery: { min: 250000, max: 550000, complexity: "Standard" },
  Catering: { min: 250000, max: 600000, complexity: "Standard" },
  "Coffee Shop": { min: 250000, max: 550000, complexity: "Standard" },
  "Bar & Pub": { min: 300000, max: 650000, complexity: "Standard" },
  "Fast Food": { min: 280000, max: 650000, complexity: "Standard" },
  "Pizza Place": { min: 280000, max: 650000, complexity: "Standard" },
  "Chinese Restaurant": { min: 300000, max: 700000, complexity: "Standard" },
  "Indian Restaurant": { min: 300000, max: 700000, complexity: "Standard" },
  "Sushi Restaurant": { min: 350000, max: 750000, complexity: "Standard" },
  "Food Truck": { min: 180000, max: 400000, complexity: "Basic" },
  "Ice Cream Shop": { min: 220000, max: 500000, complexity: "Basic" },
  "Juice Bar": { min: 220000, max: 500000, complexity: "Basic" },
  "Butcher Shop": { min: 220000, max: 500000, complexity: "Standard" },
  "Grocery Store": { min: 250000, max: 600000, complexity: "Standard" },
  "Suya Spot": { min: 180000, max: 450000, complexity: "Basic" },
  "Shawarma Spot": { min: 180000, max: 450000, complexity: "Basic" },
  "Local Food Restaurant": { min: 220000, max: 500000, complexity: "Standard" },
  "African Restaurant": { min: 280000, max: 650000, complexity: "Standard" },
  "Cloud Kitchen": { min: 250000, max: 600000, complexity: "Standard" },
  "Food Vendor": { min: 150000, max: 350000, complexity: "Basic" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Health
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  Dentist: { min: 400000, max: 900000, complexity: "Advanced" },
  Optometrist: { min: 350000, max: 800000, complexity: "Advanced" },
  Chiropractor: { min: 300000, max: 650000, complexity: "Standard" },
  Physiotherapy: { min: 300000, max: 700000, complexity: "Standard" },
  Veterinarian: { min: 300000, max: 700000, complexity: "Standard" },
  Pharmacy: { min: 300000, max: 700000, complexity: "Standard" },
  "Medical Clinic": { min: 400000, max: 900000, complexity: "Advanced" },
  Hospital: { min: 800000, max: 2000000, complexity: "Premium" },
  "Spa & Wellness": { min: 300000, max: 700000, complexity: "Standard" },
  "Mental Health Clinic": { min: 350000, max: 800000, complexity: "Advanced" },
  "Gym & Fitness": { min: 300000, max: 750000, complexity: "Standard" },
  "Yoga Studio": { min: 250000, max: 600000, complexity: "Standard" },
  "Massage Therapy": { min: 250000, max: 600000, complexity: "Standard" },
  "Diagnostic Centre": { min: 450000, max: 1000000, complexity: "Advanced" },
  "Maternity Hospital": { min: 600000, max: 1500000, complexity: "Premium" },
  "Specialist Clinic": { min: 500000, max: 1200000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Beauty
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Salon & Beauty": { min: 220000, max: 550000, complexity: "Standard" },
  Barbershop: { min: 180000, max: 400000, complexity: "Basic" },
  "Nail Salon": { min: 180000, max: 450000, complexity: "Basic" },
  "Eyebrow & Threading": { min: 150000, max: 350000, complexity: "Basic" },
  "Tattoo Studio": { min: 220000, max: 500000, complexity: "Standard" },
  "Waxing Studio": { min: 180000, max: 450000, complexity: "Basic" },
  "Makeup Artist": { min: 180000, max: 450000, complexity: "Basic" },
  "Hair Braiding": { min: 180000, max: 450000, complexity: "Basic" },
  "Wig Vendor": { min: 250000, max: 650000, complexity: "Standard" },
  "Skincare & Cosmetics": { min: 300000, max: 750000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Retail
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Clothing Store": { min: 300000, max: 800000, complexity: "Advanced" },
  "Shoe Store": { min: 280000, max: 700000, complexity: "Advanced" },
  "Jewelry Store": { min: 350000, max: 900000, complexity: "Advanced" },
  "Electronics Store": { min: 350000, max: 900000, complexity: "Advanced" },
  "Furniture Store": { min: 350000, max: 900000, complexity: "Advanced" },
  "Book Store": { min: 250000, max: 600000, complexity: "Standard" },
  Florist: { min: 250000, max: 600000, complexity: "Standard" },
  "Pet Store": { min: 280000, max: 650000, complexity: "Standard" },
  "Toy Store": { min: 280000, max: 700000, complexity: "Advanced" },
  "Gift Shop": { min: 250000, max: 600000, complexity: "Standard" },
  "Sports & Outdoors": { min: 300000, max: 750000, complexity: "Advanced" },
  Optician: { min: 350000, max: 800000, complexity: "Advanced" },
  Supermarket: { min: 450000, max: 1200000, complexity: "Advanced" },
  "Phone Accessories": { min: 250000, max: 600000, complexity: "Standard" },
  "Computer Store": { min: 300000, max: 750000, complexity: "Advanced" },
  "Building Materials": { min: 350000, max: 900000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Professional
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Law Firm": { min: 400000, max: 1000000, complexity: "Advanced" },
  Accounting: { min: 350000, max: 800000, complexity: "Advanced" },
  "Real Estate": { min: 500000, max: 1200000, complexity: "Advanced" },
  "Insurance Agency": { min: 400000, max: 900000, complexity: "Advanced" },
  "Travel Agency": { min: 300000, max: 700000, complexity: "Standard" },
  "Marketing Agency": { min: 350000, max: 900000, complexity: "Advanced" },
  "IT Support": { min: 350000, max: 850000, complexity: "Advanced" },
  "Printing & Design": { min: 250000, max: 600000, complexity: "Standard" },
  Photography: { min: 250000, max: 650000, complexity: "Standard" },
  Videography: { min: 300000, max: 750000, complexity: "Standard" },
  "Security Services": { min: 350000, max: 850000, complexity: "Advanced" },
  "Immigration Services": { min: 400000, max: 900000, complexity: "Advanced" },
  Notary: { min: 250000, max: 550000, complexity: "Standard" },
  "Driving School": { min: 300000, max: 700000, complexity: "Standard" },
  "Tutoring & Education": { min: 300000, max: 750000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Auto
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Auto Repair": { min: 250000, max: 600000, complexity: "Standard" },
  "Car Wash": { min: 180000, max: 450000, complexity: "Basic" },
  "Car Dealership": { min: 500000, max: 1200000, complexity: "Advanced" },
  "Car Rental": { min: 400000, max: 900000, complexity: "Advanced" },
  "Tyre Shop": { min: 220000, max: 500000, complexity: "Standard" },
  "Auto Parts": { min: 300000, max: 750000, complexity: "Advanced" },
  "Taxi & Ride Service": { min: 350000, max: 900000, complexity: "Advanced" },
  "Logistics & Courier": { min: 400000, max: 1000000, complexity: "Advanced" },
  "Truck Repair": { min: 250000, max: 600000, complexity: "Standard" },
  "Car Detailing": { min: 220000, max: 550000, complexity: "Standard" },
  "Driving Service": { min: 200000, max: 500000, complexity: "Basic" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Hospitality
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Hotel & Lodging": { min: 600000, max: 1500000, complexity: "Premium" },
  "Airbnb Management": { min: 350000, max: 850000, complexity: "Advanced" },
  "Event Planning": { min: 300000, max: 750000, complexity: "Advanced" },
  "Wedding Services": { min: 300000, max: 800000, complexity: "Advanced" },
  "DJ & Entertainment": { min: 250000, max: 650000, complexity: "Standard" },
  "Party Rentals": { min: 250000, max: 600000, complexity: "Standard" },
  "Conference & Venue": { min: 450000, max: 1200000, complexity: "Advanced" },
  "Shortlet Apartment": { min: 400000, max: 1000000, complexity: "Advanced" },
  "Event Centre": { min: 450000, max: 1200000, complexity: "Advanced" },
  "Lounge & Nightlife": { min: 350000, max: 850000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Fashion
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  Tailor: { min: 200000, max: 500000, complexity: "Standard" },
  "Fashion Designer": { min: 300000, max: 800000, complexity: "Advanced" },
  "Fabric Store": { min: 250000, max: 600000, complexity: "Standard" },
  "Alterations & Repairs": { min: 180000, max: 400000, complexity: "Basic" },
  "Thrift & Vintage Store": { min: 250000, max: 650000, complexity: "Advanced" },
  "Embroidery & Printing": { min: 220000, max: 550000, complexity: "Standard" },
  "Bridal Shop": { min: 350000, max: 850000, complexity: "Advanced" },
  "Fashion Boutique": { min: 300000, max: 800000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Technology
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Phone Repair": { min: 220000, max: 550000, complexity: "Standard" },
  "Computer Repair": { min: 250000, max: 600000, complexity: "Standard" },
  "CCTV & Security Tech": { min: 300000, max: 750000, complexity: "Advanced" },
  "Cybercafe / Internet Cafe": { min: 220000, max: 500000, complexity: "Standard" },
  "Software Company": { min: 600000, max: 1800000, complexity: "Premium" },
  "Tech Accessories Store": { min: 250000, max: 650000, complexity: "Advanced" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Finance
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Microfinance Bank": { min: 600000, max: 1500000, complexity: "Premium" },
  "POS Agent": { min: 120000, max: 300000, complexity: "Basic" },
  "Bureau de Change": { min: 350000, max: 850000, complexity: "Advanced" },
  "Money Transfer": { min: 300000, max: 750000, complexity: "Advanced" },
  "Cooperative Society": { min: 350000, max: 800000, complexity: "Advanced" },
  Pawnshop: { min: 250000, max: 600000, complexity: "Standard" },
  "Loan Company": { min: 450000, max: 1000000, complexity: "Advanced" },
  Fintech: { min: 800000, max: 2500000, complexity: "Premium" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Agriculture
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Farm & Agriculture": { min: 300000, max: 750000, complexity: "Advanced" },
  "Agro Dealer": { min: 300000, max: 700000, complexity: "Advanced" },
  "Feed Store": { min: 250000, max: 600000, complexity: "Standard" },
  "Plant Nursery": { min: 250000, max: 600000, complexity: "Standard" },
  "Fish Farm": { min: 250000, max: 600000, complexity: "Standard" },
  "Poultry Farm": { min: 300000, max: 700000, complexity: "Standard" },
  "Irrigation & Equipment": { min: 350000, max: 850000, complexity: "Advanced" },
  "Water Factory": { min: 300000, max: 700000, complexity: "Standard" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Education
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Daycare & Nursery": { min: 300000, max: 700000, complexity: "Standard" },
  "Primary School": { min: 400000, max: 1000000, complexity: "Advanced" },
  "Secondary School": { min: 500000, max: 1200000, complexity: "Advanced" },
  "After-School Tutoring": { min: 250000, max: 650000, complexity: "Standard" },
  "Vocational School": { min: 350000, max: 800000, complexity: "Advanced" },
  "Language School": { min: 300000, max: 700000, complexity: "Advanced" },
  "Music School": { min: 300000, max: 750000, complexity: "Advanced" },
  "Dance Studio": { min: 250000, max: 650000, complexity: "Standard" },
  "Private School": { min: 450000, max: 1200000, complexity: "Advanced" },
  "Tutorial Centre": { min: 250000, max: 650000, complexity: "Standard" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Sports
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Sports Club": { min: 300000, max: 750000, complexity: "Advanced" },
  "Swimming Pool": { min: 250000, max: 600000, complexity: "Standard" },
  "Snooker / Pool Hall": { min: 220000, max: 500000, complexity: "Basic" },
  "Gaming Centre": { min: 250000, max: 600000, complexity: "Standard" },
  "Bowling Alley": { min: 350000, max: 800000, complexity: "Advanced" },
  "Cycling & Fitness": { min: 250000, max: 600000, complexity: "Standard" },
  "Martial Arts": { min: 250000, max: 600000, complexity: "Standard" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Construction / Real Estate
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Building Contractor": { min: 400000, max: 1000000, complexity: "Advanced" },
  "Architecture Firm": { min: 450000, max: 1100000, complexity: "Advanced" },
  "Interior Design": { min: 400000, max: 1000000, complexity: "Advanced" },
  "Real Estate Agency": { min: 500000, max: 1200000, complexity: "Advanced" },
  "Property Management": { min: 500000, max: 1200000, complexity: "Advanced" },
  Surveyor: { min: 350000, max: 800000, complexity: "Advanced" },
  "Steel & Aluminium": { min: 300000, max: 750000, complexity: "Advanced" },
  "Estate Developer": { min: 600000, max: 1500000, complexity: "Premium" },

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Nigerian-specific
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  "Generator Repair": { min: 220000, max: 550000, complexity: "Standard" },
  "Solar Dealer": { min: 300000, max: 750000, complexity: "Advanced" },
  "Pure Water": { min: 250000, max: 600000, complexity: "Standard" },
  "Dispatch Rider": { min: 200000, max: 500000, complexity: "Standard" },
  "POS Business": { min: 120000, max: 300000, complexity: "Basic" },
  "Phone Vendor": { min: 250000, max: 650000, complexity: "Advanced" },
  "Car Hire": { min: 350000, max: 850000, complexity: "Advanced" },
  "Property Developer": { min: 600000, max: 1500000, complexity: "Premium" },
};

const DEFAULT_PRICE: PriceBand = {
  min: 250000,
  max: 600000,
  complexity: "Standard",
};

const ENTERPRISE_CATEGORIES = new Set([
  "Hospital",
  "Hotel & Lodging",
  "Microfinance Bank",
  "Fintech",
  "Software Company",
  "Estate Developer",
  "Property Developer",
  "Primary School",
  "Secondary School",
  "Private School",
]);

const ADVANCED_CATEGORIES = new Set([
  "Real Estate",
  "Real Estate Agency",
  "Property Management",
  "Law Firm",
  "Dentist",
  "Medical Clinic",
  "Diagnostic Centre",
  "Car Dealership",
  "Logistics & Courier",
  "Fashion Designer",
  "Clothing Store",
  "Electronics Store",
  "Furniture Store",
  "Jewelry Store",
  "Supermarket",
  "Building Contractor",
  "Architecture Firm",
  "Interior Design",
]);

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

function findPriceBand(category: string): PriceBand {
  const direct = CATEGORY_PRICES[category];
  if (direct) return direct;

  const normalized = normalizeCategory(category);

  const match = Object.entries(CATEGORY_PRICES).find(
    ([key]) => normalizeCategory(key) === normalized,
  );

  return match?.[1] ?? DEFAULT_PRICE;
}

function estimateBusinessSize(lead: LeadResult): BusinessSize {
  const reviews = lead.reviewCount ?? 0;

  if (ENTERPRISE_CATEGORIES.has(lead.category ?? "")) {
    if (reviews >= 500) return "Enterprise";
    if (reviews >= 100) return "Large";
  }

  if (reviews >= 500) return "Large";
  if (reviews >= 100) return "Medium";
  if (reviews >= 25) return "Medium";

  return "Small";
}

function getMarketFactor(location: string): number {
  const value = location.toLowerCase();

  if (
    value.includes("lagos") ||
    value.includes("victoria island") ||
    value.includes("ikoyi") ||
    value.includes("lekki") ||
    value.includes("ikeja")
  ) {
    return 1.15;
  }

  if (
    value.includes("abuja") ||
    value.includes("wuse") ||
    value.includes("maitama") ||
    value.includes("asokoro") ||
    value.includes("garki")
  ) {
    return 1.12;
  }

  if (
    value.includes("port harcourt") ||
    value.includes("ph") ||
    value.includes("ibadan") ||
    value.includes("benin city") ||
    value.includes("enugu") ||
    value.includes("kano")
  ) {
    return 1.06;
  }

  return 1;
}

function getSizeFactor(size: BusinessSize): number {
  switch (size) {
    case "Enterprise":
      return 1.3;
    case "Large":
      return 1.18;
    case "Medium":
      return 1.08;
    default:
      return 1;
  }
}

function getComplexityFactor(complexity: WebsiteComplexity): number {
  switch (complexity) {
    case "Premium":
      return 1.3;
    case "Advanced":
      return 1.15;
    case "Standard":
      return 1;
    default:
      return 0.92;
  }
}

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function getLeadQuality(
  lead: LeadResult,
  businessSize: BusinessSize,
  score: number,
): LeadQuality {
  if (
    score >= 85 ||
    businessSize === "Enterprise" ||
    (lead.rating ?? 0) >= 4.7 && lead.reviewCount >= 100
  ) {
    return "Very High";
  }

  if (score >= 65 || lead.reviewCount >= 50) {
    return "High";
  }

  if (score >= 40 || lead.reviewCount >= 15) {
    return "Medium";
  }

  return "Low";
}

export function estimateWebsitePrice(
  lead: LeadResult,
  category: string,
  location: string,
): WebsiteEstimate {
  const band = findPriceBand(category);
  const businessSize = estimateBusinessSize({
    ...lead,
    category,
  });

  let min = band.min;
  let max = band.max;

  // Larger businesses generally justify a broader/more substantial site.
  const sizeFactor = getSizeFactor(businessSize);

  // Higher-complexity categories need more pages/features.
  const complexityFactor = getComplexityFactor(band.complexity);

  // Location is only a modest market-positioning adjustment.
  const marketFactor = getMarketFactor(`${location} ${lead.address}`);

  min *= sizeFactor * marketFactor;
  max *= sizeFactor * marketFactor;

  // Strong reputation is a signal that the business is established,
  // so the freelancer can reasonably position the project higher.
  if ((lead.rating ?? 0) >= 4.7 && lead.reviewCount >= 100) {
    min *= 1.08;
    max *= 1.08;
  } else if ((lead.rating ?? 0) >= 4.5 && lead.reviewCount >= 50) {
    min *= 1.04;
    max *= 1.04;
  }

  // If the business already has a website, this is more likely
  // to be a redesign/rebuild rather than a first website.
  if (lead.hasWebsite) {
    min *= 1.08;
    max *= 1.12;
  }

  min *= complexityFactor;
  max *= complexityFactor;

  min = Math.max(100000, roundTo(min, 50000));
  max = Math.max(min + 50000, roundTo(max, 50000));

  // Potential deal value is the midpoint, rounded to a sensible quote.
  const potentialDealValue = roundTo((min + max) / 2, 50000);

  let score = 35;

  if (!lead.hasWebsite) score += 20;
  if (lead.rating != null && lead.rating >= 4.5) score += 10;
  if (lead.reviewCount >= 100) score += 15;
  else if (lead.reviewCount >= 50) score += 10;
  else if (lead.reviewCount >= 20) score += 5;

  if (businessSize === "Medium") score += 5;
  if (businessSize === "Large") score += 10;
  if (businessSize === "Enterprise") score += 15;

  if (ADVANCED_CATEGORIES.has(category)) score += 5;

  score = Math.min(100, score);

  const reasons: string[] = [];

  if (!lead.hasWebsite) {
    reasons.push("No website detected");
  } else {
    reasons.push("Existing website creates a redesign opportunity");
  }

  if (lead.rating != null && lead.reviewCount > 0) {
    reasons.push(
      `${lead.rating.toFixed(1)}Γÿà rating with ${lead.reviewCount.toLocaleString()} reviews`,
    );
  }

  if (businessSize !== "Small") {
    reasons.push(`${businessSize.toLowerCase()} business signal`);
  }

  if (band.complexity === "Advanced" || band.complexity === "Premium") {
    reasons.push(`${band.complexity.toLowerCase()} website requirements`);
  }

  return {
    min,
    max,
    potentialDealValue,
    businessSize,
    complexity: band.complexity,
    leadQuality: getLeadQuality(
      lead,
      businessSize,
      score,
    ),
    score,
    reasons: reasons.slice(0, 4),
  };
}

export function formatNaira(value: number): string {
  return `Γéª${value.toLocaleString("en-NG")}`;
}

export function formatNairaCompact(value: number): string {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `Γéª${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}m`;
  }

  if (value >= 1000) {
    const thousands = value / 1000;
    return `Γéª${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0)}k`;
  }

  return formatNaira(value);
}

import {
  PRICING_MARKUP_MIN_NGN,
  PRICING_MARKUP_PERCENT,
} from "@/lib/numbers";

export type CustomerPrice = {
  providerUsd: number;
  providerNgn: number;
  platformFeeNgn: number;
  customerNgn: number;
  customerUsd: number;
  fxRate: number;
};

export function calculateCustomerPrice(
  providerUsd: number,
  fxRate: number
): CustomerPrice {
  const safeProviderUsd = Number(providerUsd);
  const safeFxRate = Number(fxRate);

  if (
    !Number.isFinite(safeProviderUsd) ||
    safeProviderUsd < 0 ||
    !Number.isFinite(safeFxRate) ||
    safeFxRate <= 0
  ) {
    throw new Error("Invalid provider price or FX rate");
  }

  const providerNgn = Math.round(
    safeProviderUsd * safeFxRate
  );

  const percentageFeeNgn = Math.round(
    providerNgn *
      (PRICING_MARKUP_PERCENT / 100)
  );

  const platformFeeNgn = Math.max(
    percentageFeeNgn,
    PRICING_MARKUP_MIN_NGN
  );

  const customerNgn =
    providerNgn + platformFeeNgn;

  return {
    providerUsd: safeProviderUsd,
    providerNgn,
    platformFeeNgn,
    customerNgn,
    customerUsd:
      customerNgn / safeFxRate,
    fxRate: safeFxRate,
  };
}

export function formatNgn(
  amount: number
): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
