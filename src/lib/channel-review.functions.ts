import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getYouTubeChannelData,
  type YouTubeChannelData,
} from "@/lib/youtube.functions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface ChannelReviewVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  outlierScore: number;
  publishedAt: string | null;
}

export interface ChannelReviewAnalysis {
  overview: string;
  titlePatterns: string[];
  contentGaps: string[];
  nextVideoIdeas: {
    title: string;
    reason: string;
  }[];
}

export interface ChannelReviewResult {
  channel: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    subscribers: number | null;
    videoCount: number;
    viewCount: number;
  };
  medianViews: number;
  topVideos: ChannelReviewVideo[];
  analysis: ChannelReviewAnalysis;
}

const inputSchema = z.object({
  channelInput: z.string().min(1).max(500),
});

const groqResponseSchema = z.object({
  overview: z.string(),
  titlePatterns: z.array(z.string()).min(1).max(6),
  contentGaps: z.array(z.string()).min(1).max(6),
  nextVideoIdeas: z
    .array(
      z.object({
        title: z.string(),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(8),
});

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function calculateOutlierScore(
  views: number,
  medianViews: number,
): number {
  if (medianViews <= 0) return 0;

  return Math.round((views / medianViews) * 10) / 10;
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function buildVideoContext(
  videos: YouTubeChannelData["videos"],
): string {
  return videos
    .map(
      (video, index) =>
        `${index + 1}. "${video.title}"
Views: ${video.views.toLocaleString()}
Likes: ${video.likes?.toLocaleString() ?? "N/A"}
Comments: ${video.comments?.toLocaleString() ?? "N/A"}
Published: ${video.publishedAt ?? "Unknown"}
Description: ${video.description.slice(0, 700)}`,
    )
    .join("\n\n");
}

async function analyzeWithGroq(
  channel: YouTubeChannelData,
): Promise<ChannelReviewAnalysis> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured in the server environment.",
    );
  }

  const videoContext = buildVideoContext(channel.videos);

  const prompt = `
You are a senior YouTube strategist.

Analyze this YouTube channel using ONLY the channel and video data provided below.

Your job is to identify:
1. What the channel appears to be doing well.
2. Recurring title/content patterns.
3. Important content opportunities or gaps.
4. Specific videos the creator should consider making next.

Do NOT invent subscriber numbers, performance metrics, topics, or facts that are not supported by the data.

Be practical and specific.

CHANNEL:
Name: ${channel.channel.title}
Description: ${channel.channel.description.slice(0, 2000)}
Subscribers: ${channel.channel.subscribers ?? "Hidden"}
Total videos: ${channel.channel.videoCount}
Total channel views: ${channel.channel.viewCount}

RECENT VIDEOS:
${videoContext}

Return ONLY valid JSON in exactly this structure:

{
  "overview": "One concise paragraph explaining what appears to be working and the biggest strategic observation.",
  "titlePatterns": [
    "Short observation about recurring title pattern",
    "Short observation about another pattern"
  ],
  "contentGaps": [
    "Specific opportunity or missing topic",
    "Specific opportunity or missing topic"
  ],
  "nextVideoIdeas": [
    {
      "title": "Specific video title idea",
      "reason": "Why this idea makes sense based on the channel data"
    }
  ]
}

Rules:
- titlePatterns: 2-6 items
- contentGaps: 2-6 items
- nextVideoIdeas: 4-8 items
- Keep each titlePattern short.
- Keep each contentGap actionable.
- Video ideas should sound like real clickable YouTube titles.
- Do not use markdown.
- Do not include anything outside the JSON.
`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content:
            "You are an expert YouTube strategist. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error(
      "AI is temporarily busy. Please try again shortly.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    console.error("Groq error:", response.status, errorText);

    throw new Error("Could not analyze the channel with AI.");
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
    throw new Error("AI returned an empty analysis.");
  }

  try {
    const parsed = JSON.parse(cleanJsonResponse(raw));

    const validated = groqResponseSchema.safeParse(parsed);

    if (!validated.success) {
      console.error(
        "Invalid Groq response:",
        validated.error.flatten(),
      );

      throw new Error("AI returned an invalid analysis.");
    }

    return validated.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "AI returned an invalid analysis."
    ) {
      throw error;
    }

    console.error("Failed to parse Groq response:", error);

    throw new Error("Could not understand the AI analysis.");
  }
}

export const reviewYouTubeChannel = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      /*
       * Your existing YouTube server function handles:
       *
       * @handle
       * youtube.com/@handle
       * /channel/UC...
       * /c/...
       * /user/...
       */
      const youtubeResult = await getYouTubeChannelData({
        data: {
          url: data.channelInput,
          videoLimit: 25,
        },
      });

      if ("error" in youtubeResult) {
        return {
          error: youtubeResult.error,
          message: youtubeResult.message,
        } as const;
      }

      const youtubeData: YouTubeChannelData = youtubeResult;

      if (youtubeData.videos.length === 0) {
        return {
          error: "no_videos",
          message: "No videos were found on this channel.",
        } as const;
      }

      const views = youtubeData.videos.map((video) => video.views);
      const medianViews = median(views);

      const topVideos: ChannelReviewVideo[] =
        youtubeData.videos
          .map((video) => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnailUrl,
            views: video.views,
            outlierScore: calculateOutlierScore(
              video.views,
              medianViews,
            ),
            publishedAt: video.publishedAt,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 8);

      const analysis = await analyzeWithGroq(youtubeData);

      return {
        channel: {
          id: youtubeData.channel.id,
          title: youtubeData.channel.title,
          description: youtubeData.channel.description,
          thumbnailUrl: youtubeData.channel.thumbnailUrl,
          subscribers: youtubeData.channel.subscribers,
          videoCount: youtubeData.channel.videoCount,
          viewCount: youtubeData.channel.viewCount,
        },
        medianViews,
        topVideos,
        analysis,
      } satisfies ChannelReviewResult;
    } catch (error) {
      console.error("Channel review failed:", error);

      return {
        error: "review_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not review this YouTube channel.",
      } as const;
    }
  });
