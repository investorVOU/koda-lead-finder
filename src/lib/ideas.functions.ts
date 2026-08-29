import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getYouTubeChannelData } from "@/lib/youtube.functions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const generateIdeasSchema = z.object({
  topic: z.string().max(500).optional().default(""),
  channelUrl: z.string().max(500).optional().default(""),
  format: z.enum(["any", "short", "long"]).optional().default("any"),
  count: z.number().int().min(5).max(20).optional().default(10),
});

export interface VideoIdea {
  id: string;
  title: string;
  hook: string;
  angle: string;
  reason: string;
  format: "short" | "long" | "either";
  opportunityScore: number;
}

export interface IdeasResult {
  ideas: VideoIdea[];
  context: {
    topic: string;
    channelName: string | null;
    channelId: string | null;
  };
}

interface GroqResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

interface RawIdea {
  title?: unknown;
  hook?: unknown;
  angle?: unknown;
  reason?: unknown;
  format?: unknown;
  opportunityScore?: unknown;
}

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return key;
}

function cleanJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeScore(value: unknown): number {
  const score =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function safeFormat(value: unknown): VideoIdea["format"] {
  if (value === "short") return "short";
  if (value === "long") return "long";
  return "either";
}

function buildChannelContext(
  videos: {
    title: string;
    views: number;
    likes: number | null;
    comments: number | null;
    publishedAt: string | null;
  }[],
): string {
  if (videos.length === 0) {
    return "No video data was available.";
  }

  const sorted = [...videos].sort((a, b) => b.views - a.views);

  const topVideos = sorted.slice(0, 15);

  return topVideos
    .map((video, index) => {
      const date = video.publishedAt
        ? video.publishedAt.slice(0, 10)
        : "unknown";

      return [
        `${index + 1}. ${video.title}`,
        `Views: ${video.views.toLocaleString()}`,
        `Likes: ${video.likes?.toLocaleString() ?? "unknown"}`,
        `Comments: ${video.comments?.toLocaleString() ?? "unknown"}`,
        `Published: ${date}`,
      ].join(" | ");
    })
    .join("\n");
}

export const generateVideoIdeas = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => generateIdeasSchema.parse(data))
  .handler(async ({ data }) => {
    let channelName: string | null = null;
    let channelId: string | null = null;
    let channelContext = "";

    /*
     * If a YouTube channel was supplied, use real channel/video
     * performance data as context for the AI.
     */
    if (data.channelUrl.trim()) {
      const channelResult = await getYouTubeChannelData({
        data: {
          url: data.channelUrl.trim(),
          videoLimit: 25,
        },
      });

      if ("error" in channelResult) {
        return {
          error: channelResult.error,
          message: channelResult.message,
        } as const;
      }

      channelName = channelResult.channel.title;
      channelId = channelResult.channel.id;

      channelContext = `
CHANNEL:
Name: ${channelResult.channel.title}
Subscribers: ${
        channelResult.channel.subscribers?.toLocaleString() ?? "Hidden"
      }
Videos: ${channelResult.channel.videoCount.toLocaleString()}
Total views: ${channelResult.channel.viewCount.toLocaleString()}

RECENT / TOP VIDEO DATA:
${buildChannelContext(channelResult.videos)}
`;
    }

    const topic =
      data.topic.trim() ||
      (channelName
        ? `content ideas for the YouTube channel "${channelName}"`
        : "engaging YouTube content");

    const formatInstruction =
      data.format === "short"
        ? 'All ideas should be designed primarily for YouTube Shorts. Use "short" as the format.'
        : data.format === "long"
          ? 'All ideas should be designed primarily for long-form YouTube videos. Use "long" as the format.'
          : 'Choose "short", "long", or "either" based on which format best fits each idea.';

    const prompt = `
Generate ${data.count} strong, original YouTube video ideas.

TOPIC / NICHE:
${topic}

${channelContext}

FORMAT:
${formatInstruction}

Your job is to find ideas with genuine audience potential, not generic filler.

If channel data is available:
- Look for subjects and formats that appear to perform well.
- Identify patterns in successful titles.
- Find opportunities adjacent to successful videos.
- Avoid simply copying existing videos.
- Look for underserved angles and content gaps.
- Prefer ideas that have a clear curiosity gap or useful promise.

For every idea provide:
1. A compelling title.
2. A strong opening hook.
3. The unique content angle.
4. A concise explanation of why the idea could work.
5. The recommended format.
6. An opportunity score from 0 to 100.

The opportunity score should consider:
- Audience demand
- Curiosity / click potential
- Relevance to the niche
- Differentiation
- Potential for strong retention
- Evidence from the supplied channel data when available

Avoid:
- Generic topics like "10 tips for success"
- Repeating the exact same title
- Fake statistics
- Claims that cannot be supported
- Clickbait that makes an impossible promise

Return ONLY valid JSON.

Exact shape:
{
  "ideas": [
    {
      "title": "...",
      "hook": "...",
      "angle": "...",
      "reason": "...",
      "format": "short",
      "opportunityScore": 87
    }
  ]
}
`;

    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getGroqKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.8,
          messages: [
            {
              role: "system",
              content:
                "You are an expert YouTube content strategist. Generate specific, commercially useful video ideas backed by the available context. Always return valid JSON and nothing else.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (response.status === 429) {
        return {
          error: "rate_limited",
          message: "AI is busy right now. Try again shortly.",
        } as const;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");

        console.error("Groq Ideas error:", response.status, errorText);

        return {
          error: "ai_error",
          message: "Could not generate video ideas.",
        } as const;
      }

      const result = (await response.json()) as GroqResponse;

      const raw = result.choices?.[0]?.message?.content?.trim() ?? "";

      if (!raw) {
        return {
          error: "ai_error",
          message: "The AI returned an empty response.",
        } as const;
      }

      const cleaned = cleanJson(raw);

      let parsed: { ideas?: RawIdea[] };

      try {
        parsed = JSON.parse(cleaned) as { ideas?: RawIdea[] };
      } catch (error) {
        console.error("Failed to parse Groq Ideas JSON:", error);
        console.error("Raw response:", raw);

        return {
          error: "invalid_response",
          message: "The AI returned an invalid response. Try again.",
        } as const;
      }

      if (!Array.isArray(parsed.ideas)) {
        return {
          error: "invalid_response",
          message: "The AI did not return any ideas.",
        } as const;
      }

      const ideas: VideoIdea[] = parsed.ideas
        .map((idea, index) => ({
          id: `idea-${Date.now()}-${index}`,
          title: safeString(idea.title, "Untitled idea"),
          hook: safeString(idea.hook),
          angle: safeString(idea.angle),
          reason: safeString(idea.reason),
          format: safeFormat(idea.format),
          opportunityScore: safeScore(idea.opportunityScore),
        }))
        .filter(
          (idea) =>
            idea.title.length > 0 &&
            idea.hook.length > 0 &&
            idea.angle.length > 0,
        )
        .slice(0, data.count);

      if (ideas.length === 0) {
        return {
          error: "no_ideas",
          message: "No usable ideas were generated. Try another topic.",
        } as const;
      }

      ideas.sort(
        (a, b) => b.opportunityScore - a.opportunityScore,
      );

      return {
        ideas,
        context: {
          topic,
          channelName,
          channelId,
        },
      } satisfies IdeasResult;
    } catch (error) {
      console.error("Video idea generation failed:", error);

      return {
        error: "ai_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate video ideas.",
      } as const;
    }
  });
