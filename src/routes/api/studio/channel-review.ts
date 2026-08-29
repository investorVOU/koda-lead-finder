import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { z } from "zod";
import { fetchYouTubeChannelData } from "@/lib/youtube.functions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const bodySchema = z.object({
  channelInput: z.string().min(1).max(500),
});

const groqResponseSchema = z.object({
  overview: z.string(),
  titlePatterns: z.array(z.string()).min(1).max(6),
  contentGaps: z.array(z.string()).min(1).max(6),
  nextVideoIdeas: z
    .array(z.object({ title: z.string(), reason: z.string() }))
    .min(1)
    .max(8),
});

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// TEMPORARY: this endpoint has no auth check yet. Anyone with the URL can
// call it and burn Groq/YouTube quota. Fix this once auth-middleware.ts
// is shared — see conversation notes.
export const Route = createFileRoute("/api/studio/channel-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          const raw = await request.json();
          body = bodySchema.parse(raw);
        } catch {
          return json(
            { error: "invalid_input", message: "Enter a valid channel URL or handle." },
            { status: 400 },
          );
        }

        const youtubeResult = await fetchYouTubeChannelData(body.channelInput, 25);

        if ("error" in youtubeResult) {
          return json(
            { error: youtubeResult.error, message: youtubeResult.message },
            { status: 400 },
          );
        }

        if (youtubeResult.videos.length === 0) {
          return json(
            { error: "no_videos", message: "No videos were found on this channel." },
            { status: 400 },
          );
        }

        const views = youtubeResult.videos.map((v) => v.views);
        const medianViews = median(views);

        const topVideos = youtubeResult.videos
          .map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnailUrl,
            views: v.views,
            outlierScore:
              medianViews > 0 ? Math.round((v.views / medianViews) * 10) / 10 : 0,
            publishedAt: v.publishedAt,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 8);

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return json(
            { error: "config_error", message: "GROQ_API_KEY is not configured." },
            { status: 500 },
          );
        }

        const videoContext = youtubeResult.videos
          .map(
            (v, i) =>
              `${i + 1}. "${v.title}"\nViews: ${v.views.toLocaleString()}\nLikes: ${v.likes?.toLocaleString() ?? "N/A"}\nComments: ${v.comments?.toLocaleString() ?? "N/A"}\nPublished: ${v.publishedAt ?? "Unknown"}\nDescription: ${v.description.slice(0, 700)}`,
          )
          .join("\n\n");

        const prompt = `You are a senior YouTube strategist.

Analyze this YouTube channel using ONLY the channel and video data provided below.

Your job is to identify:
1. What the channel appears to be doing well.
2. Recurring title/content patterns.
3. Important content opportunities or gaps.
4. Specific videos the creator should consider making next.

Do NOT invent subscriber numbers, performance metrics, topics, or facts that are not supported by the data.

CHANNEL:
Name: ${youtubeResult.channel.title}
Description: ${youtubeResult.channel.description.slice(0, 2000)}
Subscribers: ${youtubeResult.channel.subscribers ?? "Hidden"}
Total videos: ${youtubeResult.channel.videoCount}
Total channel views: ${youtubeResult.channel.viewCount}

RECENT VIDEOS:
${videoContext}

Return ONLY valid JSON in exactly this structure:
{
  "overview": "One concise paragraph explaining what appears to be working and the biggest strategic observation.",
  "titlePatterns": ["...", "..."],
  "contentGaps": ["...", "..."],
  "nextVideoIdeas": [{"title": "...", "reason": "..."}]
}

Rules:
- titlePatterns: 2-6 items
- contentGaps: 2-6 items
- nextVideoIdeas: 4-8 items
- Do not use markdown.
- Do not include anything outside the JSON.`;

        let analysis;
        try {
          const groqRes = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              temperature: 0.4,
              max_tokens: 1800,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: "You are an expert YouTube strategist. Return only valid JSON.",
                },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (groqRes.status === 429) {
            return json(
              { error: "rate_limited", message: "AI is busy right now. Try again shortly." },
              { status: 429 },
            );
          }
          if (!groqRes.ok) {
            const errText = await groqRes.text().catch(() => "");
            console.error("Groq error:", groqRes.status, errText);
            return json(
              { error: "ai_error", message: "Could not analyze the channel with AI." },
              { status: 502 },
            );
          }

          const groqJson = (await groqRes.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = groqJson.choices?.[0]?.message?.content?.trim();
          if (!raw) {
            return json(
              { error: "ai_error", message: "AI returned an empty analysis." },
              { status: 502 },
            );
          }

          const parsed = JSON.parse(cleanJsonResponse(raw));
          const validated = groqResponseSchema.safeParse(parsed);
          if (!validated.success) {
            console.error("Invalid Groq response:", validated.error.flatten());
            return json(
              { error: "invalid_response", message: "AI returned an invalid analysis." },
              { status: 502 },
            );
          }
          analysis = validated.data;
        } catch (err) {
          console.error("Groq analysis failed:", err);
          return json(
            { error: "ai_error", message: "Could not analyze this channel." },
            { status: 500 },
          );
        }

        return json({
          channel: {
            id: youtubeResult.channel.id,
            title: youtubeResult.channel.title,
            description: youtubeResult.channel.description,
            thumbnailUrl: youtubeResult.channel.thumbnailUrl,
            subscribers: youtubeResult.channel.subscribers,
            videoCount: youtubeResult.channel.videoCount,
            viewCount: youtubeResult.channel.viewCount,
          },
          medianViews,
          topVideos,
          analysis,
        });
      },
    },
  },
});
