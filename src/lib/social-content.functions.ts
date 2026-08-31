import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasPaidSubscription, paidPlanRequired } from "@/lib/subscription.server";

const socialContentSchema = z.object({
  business: z.string().min(2).max(160),
  platform: z.enum([
    "Instagram",
    "TikTok",
    "Facebook",
    "X",
    "LinkedIn",
  ]),
  goal: z.enum([
    "Grow my audience",
    "Get more engagement",
    "Generate leads",
    "Drive sales",
    "Build brand awareness",
  ]),
  postsPerWeek: z.number().int().min(1).max(14),
  style: z.enum([
    "Educational",
    "Professional",
    "Funny",
    "Inspirational",
    "Conversational",
    "Bold",
  ]),
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
];

interface SocialPost {
  day: string;
  format: string;
  idea: string;
  caption: string;
  hashtags: string[];
}

interface SocialContentPlan {
  posts: SocialPost[];
}

async function groqChat(
  messages: { role: string; content: string }[],
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  let lastErr: Error | null = null;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.9,
          presence_penalty: 0.4,
          frequency_penalty: 0.3,
        }),
      });

      if (res.status === 429) {
        throw new Error("rate_limited");
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");

        if (
          text.includes("model_decommissioned") ||
          text.includes("does not exist")
        ) {
          console.warn(`Groq model unavailable: ${model}`);
          lastErr = new Error(`Groq error ${res.status}: ${text}`);
          continue;
        }

        throw new Error(`Groq error ${res.status}: ${text}`);
      }

      const json = (await res.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

      const content = json.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error("Empty response from Groq");
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.message === "rate_limited") {
        throw error;
      }

      lastErr = error as Error;
    }
  }

  throw lastErr ?? new Error("All Groq models failed");
}

export const generateSocialContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => socialContentSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return paidPlanRequired();

    const prompt = `Create a social media content plan for this business.

Business:
${data.business}

Platform:
${data.platform}

Goal:
${data.goal}

Posts per week:
${data.postsPerWeek}

Content style:
${data.style}

Generate exactly ${data.postsPerWeek} posts.

Each post must include:
- day
- format
- idea
- caption
- hashtags

Choose appropriate formats for the platform.

Examples:
Instagram → Reel, Carousel, Photo, Story
TikTok → Short Video, Tutorial, Storytime, Trend
Facebook → Photo, Video, Text Post, Question
X → Text Post, Thread, Question, Opinion
LinkedIn → Text Post, Carousel, Document, Story

The content must feel specific to this business rather than generic AI marketing copy.

Avoid:
"in today's digital age"
"take your business to the next level"
"stand out from the competition"
"unlock your potential"
"elevate your brand"
"game-changer"
"cutting-edge"
"seamless experience"

Write natural human-sounding content.

Return ONLY valid JSON in exactly this structure:

{
  "posts": [
    {
      "day": "Monday",
      "format": "Reel",
      "idea": "Short description of the content idea",
      "caption": "The complete caption",
      "hashtags": ["#example", "#example2", "#example3"]
    }
  ]
}

Do not include markdown.
Do not include code fences.
Do not include explanations outside the JSON.`;

    try {
      const raw = await groqChat([
        {
          role: "system",
          content:
            "You are an expert social media strategist and content creator. Create practical, engaging content that sounds human and is specific to the user's business.",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as SocialContentPlan;

      if (!Array.isArray(parsed.posts)) {
        throw new Error("Invalid content plan returned by AI");
      }

      return {
        posts: parsed.posts,
      } as const;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "rate_limited"
      ) {
        return {
          error: "rate_limited",
          message: "AI is busy right now. Try again shortly.",
        } as const;
      }

      if (
        error instanceof Error &&
        error.message.includes("GROQ_API_KEY")
      ) {
        return {
          error: "config",
          message: "AI is not configured yet.",
        } as const;
      }

      console.error("Social content generation failed", error);

      return {
        error: "ai_error",
        message: "Could not generate social content.",
      } as const;
    }
  });
