import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";
import { getYouTubeChannelData } from "@/lib/youtube.functions";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL = "openai/gpt-oss-120b";

const researchSchema = z.object({
  query: z.string().min(2).max(1000),
  channelUrl: z.string().max(500).optional().default(""),
  researchType: z
    .enum([
      "general",
      "content",
      "competitor",
      "audience",
      "trends",
    ])
    .optional()
    .default("general"),
});

export interface ResearchFinding {
  title: string;
  explanation: string;
  importance: "high" | "medium" | "low";
}

export interface ResearchTrend {
  trend: string;
  whyItMatters: string;
  opportunity: string;
}

export interface ResearchOpportunity {
  title: string;
  angle: string;
  reason: string;
  potential: number;
}

export interface ResearchResult {
  query: string;

  researchType:
    | "general"
    | "content"
    | "competitor"
    | "audience"
    | "trends";

  channel: {
    id: string | null;
    name: string | null;
    subscribers: number | null;
    videos: number | null;
  };

  summary: string;

  keyFindings: ResearchFinding[];

  trends: ResearchTrend[];

  audienceInsights: string[];

  contentGaps: string[];

  opportunities: ResearchOpportunity[];

  recommendedAngles: string[];

  limitations: string[];
}

interface GroqResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

interface RawResearchResponse {
  summary?: unknown;
  keyFindings?: unknown;
  trends?: unknown;
  audienceInsights?: unknown;
  contentGaps?: unknown;
  opportunities?: unknown;
  recommendedAngles?: unknown;
  limitations?: unknown;
}

interface RawFinding {
  title?: unknown;
  explanation?: unknown;
  importance?: unknown;
}

interface RawTrend {
  trend?: unknown;
  whyItMatters?: unknown;
  opportunity?: unknown;
}

interface RawOpportunity {
  title?: unknown;
  angle?: unknown;
  reason?: unknown;
  potential?: unknown;
}

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not configured in Render.",
    );
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

function safeString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function safeImportance(
  value: unknown,
): ResearchFinding["importance"] {
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "medium";
}

function safeNumber(
  value: unknown,
  min = 0,
  max = 100,
): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, Math.round(number)),
  );
}

function safeStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildYouTubeContext(
  videos: {
    title: string;
    views: number;
    likes: number | null;
    comments: number | null;
    publishedAt: string | null;
    description: string;
  }[],
): string {
  if (!videos.length) {
    return "No YouTube video data was available.";
  }

  const sorted = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);

  return sorted
    .map((video, index) => {
      const published = video.publishedAt
        ? video.publishedAt.slice(0, 10)
        : "unknown";

      return [
        `${index + 1}. ${video.title}`,
        `Views: ${video.views.toLocaleString()}`,
        `Likes: ${
          video.likes?.toLocaleString() ?? "unknown"
        }`,
        `Comments: ${
          video.comments?.toLocaleString() ?? "unknown"
        }`,
        `Published: ${published}`,
        `Description: ${video.description
          .slice(0, 500)
          .replace(/\s+/g, " ")}`,
      ].join(" | ");
    })
    .join("\n");
}

function buildResearchPrompt({
  query,
  researchType,
  channelContext,
}: {
  query: string;
  researchType: string;
  channelContext: string;
}): string {
  return `
You are the research intelligence engine for Kodarai, a creator intelligence platform.

Conduct useful, practical research for a creator.

RESEARCH QUERY:
${query}

RESEARCH TYPE:
${researchType}

YOUTUBE DATA:
${channelContext}

Your job is NOT to produce vague generic advice.

Analyze the supplied information and identify:
- important patterns
- audience needs
- content opportunities
- gaps competitors or creators may be missing
- trends that are relevant to the query
- useful angles for future content

IMPORTANT:
If YouTube data is supplied, use it as evidence.

Do not invent statistics.

Do not claim something is currently trending unless there is evidence in the supplied data.

If the available information is insufficient to establish something confidently, say so in "limitations".

For channel-related research:
- Compare stronger and weaker performing topics where possible.
- Look for recurring title patterns.
- Look for subjects with unusually high performance.
- Identify possible content gaps.
- Identify adjacent opportunities.
- Do not recommend simply copying existing videos.

For audience research:
- Infer audience interests from the supplied content.
- Separate strong evidence from reasonable inference.
- Identify questions or problems the audience may care about.

For competitor/content research:
- Look for underserved topics.
- Identify positioning opportunities.
- Identify content formats that could differentiate the creator.

For trends:
- Only identify trends supported by the available evidence.
- If there is not enough current trend data, explicitly say so.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "A concise research summary.",

  "keyFindings": [
    {
      "title": "Finding title",
      "explanation": "Explain the finding.",
      "importance": "high"
    }
  ],

  "trends": [
    {
      "trend": "Trend",
      "whyItMatters": "Why this matters.",
      "opportunity": "What creator opportunity exists."
    }
  ],

  "audienceInsights": [
    "Audience insight"
  ],

  "contentGaps": [
    "Content gap"
  ],

  "opportunities": [
    {
      "title": "Opportunity",
      "angle": "Recommended angle",
      "reason": "Why this could work",
      "potential": 85
    }
  ],

  "recommendedAngles": [
    "Recommended content angle"
  ],

  "limitations": [
    "Important limitation"
  ]
}

Return between 3 and 8 key findings.

Return between 2 and 6 trends when evidence supports them.

Return between 3 and 8 opportunities.

Return between 3 and 8 audience insights.

Return between 2 and 6 content gaps.

Keep the writing concise and actionable.
`;
}

export const conductResearch = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    researchSchema.parse(data),
  )
  .handler(async ({ data }) => {
    let channelName: string | null = null;
    let channelId: string | null = null;
    let subscribers: number | null = null;
    let videoCount: number | null = null;

    let channelContext =
      "No YouTube channel was supplied.";

    /*
     * If the user supplies a YouTube channel,
     * enrich the research with real channel data.
     */
    if (data.channelUrl.trim()) {
      const channelResult =
        await getYouTubeChannelData({
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

      channelName =
        channelResult.channel.title;

      channelId =
        channelResult.channel.id;

      subscribers =
        channelResult.channel.subscribers;

      videoCount =
        channelResult.channel.videoCount;

      channelContext = `
CHANNEL NAME:
${channelResult.channel.title}

CHANNEL ID:
${channelResult.channel.id}

SUBSCRIBERS:
${
  channelResult.channel.subscribers
    ?.toLocaleString() ?? "Hidden"
}

VIDEO COUNT:
${channelResult.channel.videoCount.toLocaleString()}

TOTAL VIEWS:
${channelResult.channel.viewCount.toLocaleString()}

VIDEO DATA:
${buildYouTubeContext(
  channelResult.videos,
)}
`;
    }

    const prompt = buildResearchPrompt({
      query: data.query.trim(),
      researchType: data.researchType,
      channelContext,
    });

    try {
      const response = await fetch(
        GROQ_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getGroqKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.4,
            max_tokens: 7000,
            response_format: {
              type: "json_object",
            },
            messages: [
              {
                role: "system",
                content:
                  "You are Kodarai's research intelligence engine. Return accurate, structured JSON only. Never invent evidence.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        },
      );

      if (response.status === 429) {
        return {
          error: "rate_limited",
          message:
            "AI is busy right now. Please try again shortly.",
        } as const;
      }

      if (!response.ok) {
        const errorText =
          await response.text().catch(() => "");

        console.error(
          "Groq Research error:",
          response.status,
          errorText,
        );

        return {
          error: "ai_error",
          message:
            "Could not complete the research.",
        } as const;
      }

      const result =
        (await response.json()) as GroqResponse;

      const raw =
        result.choices?.[0]?.message?.content?.trim() ??
        "";

      if (!raw) {
        return {
          error: "ai_error",
          message:
            "The AI returned an empty research response.",
        } as const;
      }

      let parsed: RawResearchResponse;

      try {
        parsed = JSON.parse(
          cleanJson(raw),
        ) as RawResearchResponse;
      } catch (error) {
        console.error(
          "Research JSON parse failed:",
          error,
        );
        console.error(
          "Raw research response:",
          raw,
        );

        return {
          error: "invalid_response",
          message:
            "The AI returned an invalid research response. Please try again.",
        } as const;
      }

      const rawFindings =
        Array.isArray(parsed.keyFindings)
          ? parsed.keyFindings
          : [];

      const keyFindings: ResearchFinding[] =
        rawFindings
          .map((item) => {
            const finding =
              item as RawFinding;

            return {
              title: safeString(
                finding.title,
                "Finding",
              ),
              explanation: safeString(
                finding.explanation,
              ),
              importance:
                safeImportance(
                  finding.importance,
                ),
            };
          })
          .filter(
            (item) =>
              item.title &&
              item.explanation,
          )
          .slice(0, 8);

      const rawTrends =
        Array.isArray(parsed.trends)
          ? parsed.trends
          : [];

      const trends: ResearchTrend[] =
        rawTrends
          .map((item) => {
            const trend =
              item as RawTrend;

            return {
              trend: safeString(
                trend.trend,
              ),
              whyItMatters: safeString(
                trend.whyItMatters,
              ),
              opportunity: safeString(
                trend.opportunity,
              ),
            };
          })
          .filter(
            (item) =>
              item.trend &&
              item.whyItMatters,
          )
          .slice(0, 6);

      const rawOpportunities =
        Array.isArray(parsed.opportunities)
          ? parsed.opportunities
          : [];

      const opportunities: ResearchOpportunity[] =
        rawOpportunities
          .map((item) => {
            const opportunity =
              item as RawOpportunity;

            return {
              title: safeString(
                opportunity.title,
              ),
              angle: safeString(
                opportunity.angle,
              ),
              reason: safeString(
                opportunity.reason,
              ),
              potential: safeNumber(
                opportunity.potential,
              ),
            };
          })
          .filter(
            (item) =>
              item.title &&
              item.angle &&
              item.reason,
          )
          .slice(0, 8)
          .sort(
            (a, b) =>
              b.potential - a.potential,
          );

      const research: ResearchResult = {
        query: data.query.trim(),

        researchType:
          data.researchType,

        channel: {
          id: channelId,
          name: channelName,
          subscribers,
          videos: videoCount,
        },

        summary: safeString(
          parsed.summary,
          "No summary was generated.",
        ),

        keyFindings,

        trends,

        audienceInsights:
          safeStringArray(
            parsed.audienceInsights,
          ).slice(0, 8),

        contentGaps:
          safeStringArray(
            parsed.contentGaps,
          ).slice(0, 6),

        opportunities,

        recommendedAngles:
          safeStringArray(
            parsed.recommendedAngles,
          ).slice(0, 8),

        limitations:
          safeStringArray(
            parsed.limitations,
          ).slice(0, 6),
      };

      if (
        !research.summary &&
        research.keyFindings.length === 0 &&
        research.opportunities.length === 0
      ) {
        return {
          error: "no_research",
          message:
            "No usable research was generated. Try a more specific query.",
        } as const;
      }

      return {
        research,
      } as const;
    } catch (error) {
      console.error(
        "Research generation failed:",
        error,
      );

      return {
        error: "ai_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not complete research.",
      } as const;
    }
  });
