import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getYouTubeChannelData,
  type YouTubeChannelData,
} from "@/lib/youtube.functions";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b"; // verify against console.groq.com/docs/models before shipping

const GEMINI_MODEL = "gemini-2.5-flash"; // verify against ai.google.dev/gemini-api/docs/models before shipping
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type ContentType =
  | "youtube-script"
  | "short-script"
  | "hooks"
  | "titles";

export interface GeneratedContent {
  title: string;
  hook: string;
  content: string;
  description: string;
  tags: string[];
}

interface GenerateSuccess {
  content: GeneratedContent;
  provider: "groq" | "gemini";
  model: string;
}

const inputSchema = z.object({
  type: z.enum(["youtube-script", "short-script", "hooks", "titles"]),
  topic: z.string().min(1).max(500),
  idea: z.string().max(2000).optional().default(""),
  channelUrl: z.string().max(500).optional().default(""),
  tone: z
    .enum([
      "educational",
      "conversational",
      "storytelling",
      "energetic",
      "professional",
    ])
    .optional()
    .default("conversational"),
  length: z.enum(["short", "medium", "long"]).optional().default("medium"),
});

const generatedContentSchema = z.object({
  title: z.string(),
  hook: z.string(),
  content: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function buildChannelContext(data: YouTubeChannelData | null): string {
  if (!data || data.videos.length === 0) return "";

  const top = [...data.videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views`,
    )
    .join("\n");

  return `
CHANNEL CONTEXT (use this to match the creator's real style and what performs for them):
Channel: ${data.channel.title}
Subscribers: ${data.channel.subscribers?.toLocaleString() ?? "Hidden"}

Top performing videos:
${top}
`;
}

function lengthInstruction(type: ContentType, length: "short" | "medium" | "long"): string {
  if (type === "hooks" || type === "titles") {
    return length === "short" ? "Give 5 options." : length === "long" ? "Give 15 options." : "Give 10 options.";
  }
  if (type === "short-script") {
    return length === "short" ? "Target 20-30 seconds spoken." : length === "long" ? "Target 60-90 seconds spoken." : "Target 30-60 seconds spoken.";
  }
  // youtube-script
  return length === "short" ? "Target roughly 3-4 minutes spoken (~500-600 words)." : length === "long" ? "Target roughly 10-12 minutes spoken (~1600-1900 words)." : "Target roughly 6-7 minutes spoken (~1000-1100 words).";
}

function buildPrompt(input: {
  type: ContentType;
  topic: string;
  idea: string;
  tone: string;
  length: "short" | "medium" | "long";
  channelContext: string;
}): string {
  const { type, topic, idea, tone, length, channelContext } = input;

  const shared = `
TOPIC: ${topic}
${idea ? `EXISTING IDEA / ANGLE: ${idea}` : ""}
TONE: ${tone}
${channelContext}

Return ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "title": "...",
  "hook": "...",
  "content": "...",
  "description": "...",
  "tags": ["...", "..."]
}
`;

  if (type === "youtube-script") {
    return `You are a professional YouTube scriptwriter. Write a complete, ready-to-record script.

${shared}
Rules:
- "title": a clickable, specific video title.
- "hook": the first 10-15 seconds, written to stop someone scrolling.
- "content": the FULL script body, intro through outro, with natural spoken pacing and clear section breaks. ${lengthInstruction(type, length)}
- "description": a YouTube video description (2-4 sentences plus a short CTA).
- "tags": 8-12 relevant search tags, no # symbol.
- Do not invent statistics or claims that aren't reasonable.
- Do not use markdown formatting inside "content" — write it as plain spoken script text.`;
  }

  if (type === "short-script") {
    return `You are a Shorts/Reels/TikTok scriptwriter. Write a complete vertical-video script.

${shared}
Rules:
- "title": a short, punchy on-screen title or caption idea.
- "hook": the first line, must land in under 2 seconds.
- "content": the full script, written for fast pacing with implied cuts/beats. ${lengthInstruction(type, length)}
- "description": a one-line caption for the post.
- "tags": 5-8 relevant hashtag words, no # symbol.
- Do not use markdown formatting inside "content".`;
  }

  if (type === "hooks") {
    return `You are a YouTube hook specialist. Generate distinct opening hooks for this topic.

${shared}
Rules:
- "title": write "Hook ideas for: ${topic}".
- "hook": leave as an empty string.
- "content": a numbered list of hooks, one per line, each a complete opening line a creator could say on camera. ${lengthInstruction(type, length)}
- "description": leave as an empty string.
- "tags": leave as an empty array.
- Each hook must be genuinely different in angle (curiosity, stakes, question, bold claim, relatable pain point, etc.), not reworded repeats.`;
  }

  // titles
  return `You are a YouTube title specialist. Generate distinct, clickable video titles for this topic.

${shared}
Rules:
- "title": write "Title ideas for: ${topic}".
- "hook": leave as an empty string.
- "content": a numbered list of titles, one per line. ${lengthInstruction(type, length)}
- "description": leave as an empty string.
- "tags": leave as an empty array.
- No fake numbers or claims that can't be backed up. Vary the pattern across the list (question, how-to, listicle, bold statement, curiosity gap) rather than repeating one formula.`;
}

async function callGroq(prompt: string, tone: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert content creator writing in a ${tone} tone. Always return only valid JSON.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error("AI is busy right now. Try again shortly.");
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Groq content error:", response.status, errorText);
    throw new Error("Could not generate content.");
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI returned an empty response.");
  return raw;
}

async function callGemini(prompt: string, tone: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert content creator writing in a ${tone} tone.\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.75,
        responseMimeType: "application/json",
      },
    }),
  });

  if (response.status === 429) {
    throw new Error("AI is busy right now. Try again shortly.");
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Gemini content error:", response.status, errorText);
    throw new Error("Could not generate content.");
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error("AI returned an empty response.");
  return raw;
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      let channelData: YouTubeChannelData | null = null;

      if (data.channelUrl.trim()) {
        const result = await getYouTubeChannelData({
          data: { url: data.channelUrl.trim(), videoLimit: 15 },
        });
        // Channel context is a nice-to-have, not a hard requirement —
        // if the fetch fails, continue without it rather than blocking generation.
        if (!("error" in result)) {
          channelData = result;
        }
      }

      const prompt = buildPrompt({
        type: data.type,
        topic: data.topic,
        idea: data.idea,
        tone: data.tone,
        length: data.length,
        channelContext: buildChannelContext(channelData),
      });

      const useGemini = data.type === "youtube-script";
      const raw = useGemini
        ? await callGemini(prompt, data.tone)
        : await callGroq(prompt, data.tone);

      const parsed = JSON.parse(cleanJsonResponse(raw));
      const validated = generatedContentSchema.safeParse(parsed);

      if (!validated.success) {
        console.error("Invalid content response:", validated.error.flatten());
        return {
          error: "invalid_response",
          message: "The AI returned an invalid response. Try again.",
        } as const;
      }

      return {
        content: validated.data,
        provider: useGemini ? "gemini" : "groq",
        model: useGemini ? GEMINI_MODEL : GROQ_MODEL,
      } satisfies GenerateSuccess;
    } catch (error) {
      console.error("Content generation failed:", error);
      return {
        error: "generation_error",
        message:
          error instanceof Error ? error.message : "Could not generate content.",
      } as const;
    }
  });
