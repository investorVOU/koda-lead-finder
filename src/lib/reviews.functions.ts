import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface PlaceReview {
  rating?: number;
  text?: { text?: string };
}

export interface ReviewAnalysis {
  likes: string[];
  dislikes: string[];
  summary: string;
}

export const analyzeReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        placeId: z.string().min(1),
        businessName: z.string().min(1).max(200),
        category: z.string().max(80).optional().default(""),
        location: z.string().max(120).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;
    const aiKey = process.env.GROQ_API_KEY;

    if (!aiKey) {
      return { error: "config", message: "AI not configured." } as const;
    }

    // Demo leads get mocked analysis
    if (data.placeId.startsWith("demo-")) {
      return {
        analysis: {
          likes: ["Friendly and professional staff", "Fast turnaround time", "Great value for money"],
          dislikes: ["Limited parking on weekdays", "Can get busy during peak hours"],
          summary:
            "Customers consistently praise this business for its helpful team and quality service, with minor friction around parking.",
        } satisfies ReviewAnalysis,
      } as const;
    }

    if (!googleKey) {
      return { error: "config", message: "Google Places API not configured." } as const;
    }

    let reviews: PlaceReview[] = [];
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${data.placeId}`, {
        headers: {
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask": "reviews",
        },
      });
      if (!res.ok) {
        return { error: "places_error", message: "Could not fetch reviews from Google." } as const;
      }
      const json = (await res.json()) as { reviews?: PlaceReview[] };
      reviews = json.reviews ?? [];
    } catch {
      return { error: "places_error", message: "Could not fetch reviews from Google." } as const;
    }

    if (reviews.length === 0) {
      return { error: "no_reviews", message: "No reviews found for this business." } as const;
    }

    const reviewText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating ?? "?"}/5): "${r.text?.text ?? ""}"`)
      .join("\n\n");

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content:
                'Analyze these Google reviews and extract key customer sentiments. Output ONLY valid JSON with this exact shape: {"likes":["...","..."],"dislikes":["...","..."],"summary":"..."}. likes and dislikes: 2-4 short phrases each. summary: one sentence. No markdown, no text outside the JSON.',
            },
            {
              role: "user",
              content: `Business: ${data.businessName} (${data.category} in ${data.location})\n\nReviews:\n${reviewText}`,
            },
          ],
        }),
      });

      if (res.status === 429) {
        return { error: "rate_limited", message: "AI is busy. Try again shortly." } as const;
      }
      if (!res.ok) {
        return { error: "ai_error", message: "Could not analyze reviews." } as const;
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const analysis = JSON.parse(cleaned) as ReviewAnalysis;
      return { analysis } as const;
    } catch {
      return { error: "ai_error", message: "Could not analyze reviews." } as const;
    }
  });
