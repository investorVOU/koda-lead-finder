import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { LeadResult } from "@/lib/constants";

const inputSchema = z.object({
  category: z.string().min(1).max(80),
  location: z.string().min(1).max(120),
});

interface PlacesPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
}

function demoLeads(category: string, location: string): LeadResult[] {
  const names = [
    "Sunrise", "Premier", "Elite", "GreenLeaf", "Metro", "Golden Gate",
    "Five Star", "Reliable", "Express", "Hometown", "Apex", "Crown",
  ];
  return names.slice(0, 8).map((n, i) => {
    const hasWebsite = i % 4 === 0;
    const name = `${n} ${category}`;
    return {
      placeId: `demo-${i}-${name}`,
      name,
      address: `${100 + i * 7} Main St, ${location}`,
      phone: `+1 (555) ${String(100 + i).padStart(3, "0")}-${String(1000 + i * 13).slice(0, 4)}`,
      rating: Number((4.9 - i * 0.1).toFixed(1)),
      reviewCount: 320 - i * 27,
      hasWebsite,
      websiteUrl: hasWebsite ? "https://example.com" : null,
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name + " " + location)}`,
    };
  });
}

export const findLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Basic rate limiting: max 12 searches per rolling minute
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("search_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 12) {
      return { error: "rate_limited", message: "Too many searches. Please wait a moment." } as const;
    }

    // Consume one search credit atomically
    const { data: creditData, error: creditError } = await supabaseAdmin.rpc("use_search_credit", {
      p_uid: userId,
    });
    if (creditError) {
      console.error("credit error", creditError);
      return { error: "credit_error", message: "Could not verify your credits." } as const;
    }
    const credit = creditData as { allowed: boolean; remaining: number; total?: number };
    if (!credit.allowed) {
      return {
        error: "no_credits",
        message: "You're out of search credits for this period. Upgrade to keep searching.",
        remaining: 0,
      } as const;
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    let results: LeadResult[];
    let demo = false;

    if (!apiKey) {
      demo = true;
      results = demoLeads(data.category, data.location);
    } else {
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri",
          },
          body: JSON.stringify({
            textQuery: `${data.category} in ${data.location}`,
            maxResultCount: 20,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error("Places API error", res.status, body);
          return {
            error: "places_error",
            message: "Business search failed. Please try again.",
          } as const;
        }
        const json = (await res.json()) as { places?: PlacesPlace[] };
        results = (json.places ?? []).map((p) => ({
          placeId: p.id,
          name: p.displayName?.text ?? "Unknown business",
          address: p.formattedAddress ?? "",
          phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
          rating: p.rating ?? null,
          reviewCount: p.userRatingCount ?? 0,
          hasWebsite: Boolean(p.websiteUri),
          websiteUrl: p.websiteUri ?? null,
          mapsUrl:
            p.googleMapsUri ??
            `https://www.google.com/maps/search/${encodeURIComponent((p.displayName?.text ?? "") + " " + data.location)}`,
        }));
      } catch (e) {
        console.error("Places fetch failed", e);
        return { error: "places_error", message: "Business search failed. Please try again." } as const;
      }
    }

    // No-website leads first, then by rating
    results.sort((a, b) => {
      if (a.hasWebsite !== b.hasWebsite) return a.hasWebsite ? 1 : -1;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    await supabaseAdmin.from("search_logs").insert({
      user_id: userId,
      category: data.category,
      location: data.location,
      results_count: results.length,
    });

    return {
      results,
      remaining: credit.remaining,
      total: credit.total ?? null,
      demo,
    } as const;
  });
