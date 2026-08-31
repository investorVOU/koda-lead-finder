import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasPaidSubscription, paidPlanRequired } from "@/lib/subscription.server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Keep this in sync with the working models used by ai.functions.ts.
// If the first model is unavailable, the second one is tried automatically.
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
];

interface PlaceReview {
  rating?: number;
  text?: {
    text?: string;
  };
}

export interface ReviewAnalysis {
  likes: string[];
  dislikes: string[];
  summary: string;
}

const reviewInputSchema = z.object({
  placeId: z.string().min(1),
  businessName: z.string().min(1).max(200),
  category: z.string().max(80).optional().default(""),
  location: z.string().max(120).optional().default(""),
});

function cleanJsonResponse(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validateReviewAnalysis(value: unknown): ReviewAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid review analysis");
  }

  const data = value as Record<string, unknown>;

  const likes = Array.isArray(data.likes)
    ? data.likes.filter((x): x is string => typeof x === "string").slice(0, 4)
    : [];

  const dislikes = Array.isArray(data.dislikes)
    ? data.dislikes
        .filter((x): x is string => typeof x === "string")
        .slice(0, 4)
    : [];

  const summary =
    typeof data.summary === "string"
      ? data.summary.trim()
      : "";

  if (!summary) {
    throw new Error("Review analysis has no summary");
  }

  return {
    likes,
    dislikes,
    summary,
  };
}

async function groqReviewAnalysis(
  businessName: string,
  category: string,
  location: string,
  reviewText: string,
): Promise<ReviewAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  let lastError: Error | null = null;

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `
You analyze customer reviews for local businesses.

Your job is to identify useful sales and website insights from the reviews.

Return ONLY valid JSON in exactly this shape:

{
  "likes": ["...", "..."],
  "dislikes": ["...", "..."],
  "summary": "..."
}

Rules:

- likes must contain 2-4 short customer-positive themes.
- dislikes must contain 0-4 genuine customer complaints or friction points.
- Do not invent complaints.
- If there are no meaningful complaints, return an empty dislikes array.
- summary must be one concise sentence.
- Base everything only on the reviews provided.
- Do not mention that you are an AI.
- Do not use markdown.
- Do not put the JSON inside a code block.
`,
            },
            {
              role: "user",
              content: `
Business: ${businessName}
Category: ${category || "Local business"}
Location: ${location || "Unknown"}

Google Reviews:

${reviewText}
`,
            },
          ],
        }),
      });

      if (response.status === 429) {
        throw new Error("rate_limited");
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");

        // If Groq says the model is gone, automatically try the next model.
        if (
          errorText.includes("model_decommissioned") ||
          errorText.includes("does not exist") ||
          errorText.includes("not found")
        ) {
          console.warn(
            `Groq review model unavailable, falling back: ${model}`,
          );

          lastError = new Error(
            `Groq model unavailable: ${model}`,
          );

          continue;
        }

        throw new Error(
          `Groq error ${response.status}: ${errorText}`,
        );
      }

      const json = (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

      const raw = json.choices?.[0]?.message?.content?.trim();

      if (!raw) {
        throw new Error("Empty response from Groq");
      }

      const cleaned = cleanJsonResponse(raw);

      let parsed: unknown;

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Sometimes a model adds text before/after the JSON.
        // Try extracting the first JSON object.
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");

        if (start === -1 || end === -1 || end <= start) {
          throw new Error("Invalid JSON returned by Groq");
        }

        parsed = JSON.parse(
          cleaned.slice(start, end + 1),
        );
      }

      return validateReviewAnalysis(parsed);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "rate_limited"
      ) {
        throw error;
      }

      lastError =
        error instanceof Error
          ? error
          : new Error("Unknown Groq error");

      // Try the next model.
    }
  }

  throw (
    lastError ??
    new Error("All Groq review models failed")
  );
}

export const analyzeReviews = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    reviewInputSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return paidPlanRequired();

    const googleKey =
      process.env.GOOGLE_PLACES_API_KEY;

    const aiKey = process.env.GROQ_API_KEY;

    // ─────────────────────────────────────────────
    // Configuration checks
    // ─────────────────────────────────────────────

    if (!aiKey) {
      return {
        error: "config",
        message: "AI is not configured yet.",
      } as const;
    }

    // ─────────────────────────────────────────────
    // Demo leads
    // ─────────────────────────────────────────────

    if (data.placeId.startsWith("demo-")) {
      return {
        analysis: {
          likes: [
            "Friendly and professional staff",
            "Fast turnaround time",
            "Good value for money",
          ],
          dislikes: [
            "Limited parking during busy periods",
            "Can get busy at peak times",
          ],
          summary:
            "Customers generally praise the service quality and staff, while convenience can become an issue during busy periods.",
        } satisfies ReviewAnalysis,
      } as const;
    }

    // ─────────────────────────────────────────────
    // Google Places configuration
    // ─────────────────────────────────────────────

    if (!googleKey) {
      return {
        error: "config",
        message:
          "Google Places API is not configured.",
      } as const;
    }

    // ─────────────────────────────────────────────
    // Fetch Google reviews
    // ─────────────────────────────────────────────

    let reviews: PlaceReview[] = [];

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(
          data.placeId,
        )}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": googleKey,
            "X-Goog-FieldMask": "reviews",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "");

        console.error(
          "Google Places review error:",
          response.status,
          errorText,
        );

        return {
          error: "places_error",
          message:
            "Could not fetch reviews from Google.",
        } as const;
      }

      const json = (await response.json()) as {
        reviews?: PlaceReview[];
      };

      reviews = json.reviews ?? [];
    } catch (error) {
      console.error(
        "Google review fetch failed:",
        error,
      );

      return {
        error: "places_error",
        message:
          "Could not fetch reviews from Google.",
      } as const;
    }

    // ─────────────────────────────────────────────
    // No reviews
    // ─────────────────────────────────────────────

    if (reviews.length === 0) {
      return {
        error: "no_reviews",
        message:
          "No reviews were found for this business.",
      } as const;
    }

    // ─────────────────────────────────────────────
    // Prepare review text
    // ─────────────────────────────────────────────

    const reviewText = reviews
      .map((review, index) => {
        const rating =
          review.rating != null
            ? `${review.rating}/5`
            : "Unknown rating";

        const text =
          review.text?.text?.trim() ||
          "No written review.";

        return `Review ${index + 1} (${rating}): "${text}"`;
      })
      .filter(Boolean)
      .join("\n\n");

    if (!reviewText.trim()) {
      return {
        error: "no_reviews",
        message:
          "The available reviews do not contain enough text to analyze.",
      } as const;
    }

    // ─────────────────────────────────────────────
    // AI analysis
    // ─────────────────────────────────────────────

    try {
      const analysis =
        await groqReviewAnalysis(
          data.businessName,
          data.category,
          data.location,
          reviewText,
        );

      return {
        analysis,
      } as const;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "rate_limited"
      ) {
        return {
          error: "rate_limited",
          message:
            "AI is busy right now. Try again shortly.",
        } as const;
      }

      if (
        error instanceof Error &&
        error.message.includes(
          "GROQ_API_KEY",
        )
      ) {
        return {
          error: "config",
          message:
            "AI is not configured yet.",
        } as const;
      }

      console.error(
        "Review AI analysis failed:",
        error,
      );

      return {
        error: "ai_error",
        message:
          "Could not analyze reviews. Please try again.",
      } as const;
    }
  });
