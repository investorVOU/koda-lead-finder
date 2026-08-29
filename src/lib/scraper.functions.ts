import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const scrapeSchema = z.object({
  url: z.string().url().max(2000),
  mode: z
    .enum([
      "article",
      "summary",
      "key-points",
      "headlines",
      "quotes",
      "full",
    ])
    .default("article"),
});

export type ScrapeMode =
  | "article"
  | "summary"
  | "key-points"
  | "headlines"
  | "quotes"
  | "full";

export interface ScrapeResult {
  url: string;
  title: string;
  description: string;
  content: string;
  summary: string;
  keyPoints: string[];
  headlines: string[];
  quotes: string[];
  wordCount: number;
  mode: ScrapeMode;
}

interface GroqResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

interface AIResult {
  title?: unknown;
  description?: unknown;
  summary?: unknown;
  content?: unknown;
  keyPoints?: unknown;
  headlines?: unknown;
  quotes?: unknown;
}

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return key;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Basic protection against fetching obvious internal/private targets.
 *
 * This is not intended to replace a full SSRF firewall at the
 * infrastructure level, but it prevents common localhost/private
 * network inputs.
 */
function validatePublicUrl(input: string): URL {
  const url = new URL(input);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();

  const blockedHosts = [
    "localhost",
    "localhost.localdomain",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
  ];

  if (blockedHosts.includes(hostname)) {
    throw new Error("That URL cannot be scraped.");
  }

  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("That URL cannot be scraped.");
  }

  // IPv4 private / loopback / link-local ranges.
  const ipv4 = hostname.match(
    /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
  );

  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    const [a, b] = parts;

    const isPrivate =
      a === 10 ||
      a === 127 ||
      a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 ||
      a === 192 && b === 168;

    if (isPrivate) {
      throw new Error("Private network URLs cannot be scraped.");
    }
  }

  return url;
}

/**
 * Strip HTML into readable text without requiring another dependency.
 */
function htmlToText(html: string): {
  title: string;
  description: string;
  text: string;
} {
  let working = html;

  const titleMatch = working.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  );

  const descriptionMatch = working.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  );

  const reverseDescriptionMatch = working.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
  );

  const title = decodeHtml(
    titleMatch?.[1] ?? "",
  ).trim();

  const description = decodeHtml(
    descriptionMatch?.[1] ??
      reverseDescriptionMatch?.[1] ??
      "",
  ).trim();

  // Remove things that don't represent useful article content.
  working = working
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Preserve rough paragraph boundaries.
  working = working
    .replace(
      /<\/(p|div|article|section|h1|h2|h3|h4|h5|li|blockquote|br)>/gi,
      "\n",
    )
    .replace(/<li[^>]*>/gi, "\n• ");

  // Remove remaining tags.
  working = working.replace(/<[^>]+>/g, " ");

  const text = decodeHtml(working)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    title,
    description,
    text,
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);

      return Number.isFinite(number)
        ? String.fromCharCode(number)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const number = parseInt(code, 16);

      return Number.isFinite(number)
        ? String.fromCharCode(number)
        : "";
    });
}

function countWords(text: string): number {
  if (!text.trim()) return 0;

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function fetchPage(url: URL): Promise<{
  title: string;
  description: string;
  text: string;
}> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "KodaraiBot/1.0 (+https://kodarai.xyz)",
        Accept:
          "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(
        `The website returned HTTP ${response.status}.`,
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error(
        "That URL does not appear to contain a readable web page.",
      );
    }

    const contentLength = response.headers.get(
      "content-length",
    );

    if (
      contentLength &&
      Number(contentLength) > 5_000_000
    ) {
      throw new Error(
        "The page is too large to process.",
      );
    }

    const html = await response.text();

    if (html.length > 5_000_000) {
      throw new Error(
        "The page is too large to process.",
      );
    }

    return htmlToText(html);
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithGroq({
  title,
  description,
  text,
  mode,
}: {
  title: string;
  description: string;
  text: string;
  mode: ScrapeMode;
}): Promise<AIResult> {
  const prompt = `
Analyze the following scraped web page.

PAGE TITLE:
${title || "Unknown"}

PAGE DESCRIPTION:
${description || "None"}

REQUESTED MODE:
${mode}

PAGE CONTENT:
${text}

Your job is to turn the page into useful, accurate structured information.

Rules:
- Do not invent facts.
- Do not add information that is not supported by the supplied page.
- Preserve important names, numbers, claims and context.
- If the page is incomplete, say so rather than guessing.
- Make the output useful to a content creator or researcher.
- For headlines, create possible content headlines inspired by the source, but clearly make them new headlines rather than pretending they came from the source.
- For quotes, only return direct quotes that actually appear in the supplied text.
- For content, create a clean readable version of the important page content.

Return ONLY valid JSON.

Exact shape:
{
  "title": "...",
  "description": "...",
  "summary": "...",
  "content": "...",
  "keyPoints": ["...", "..."],
  "headlines": ["...", "..."],
  "quotes": ["...", "..."]
}
`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_completion_tokens: 8_000,
      messages: [
        {
          role: "system",
          content:
            "You are a precise research and content extraction assistant. Return valid JSON only.",
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
      "AI is busy right now. Please try again shortly.",
    );
  }

  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => "");

    console.error(
      "Groq scraper error:",
      response.status,
      errorText,
    );

    throw new Error(
      "The AI could not analyze this page.",
    );
  }

  const result = (await response.json()) as GroqResponse;

  const raw =
    result.choices?.[0]?.message?.content?.trim() ?? "";

  if (!raw) {
    throw new Error(
      "The AI returned an empty response.",
    );
  }

  const cleaned = cleanJson(raw);

  try {
    return JSON.parse(cleaned) as AIResult;
  } catch (error) {
    console.error(
      "Scraper AI JSON parse failed:",
      error,
    );
    console.error("Raw AI response:", raw);

    throw new Error(
      "The AI returned an invalid response. Please try again.",
    );
  }
}

export const scrapeUrl = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => scrapeSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const url = validatePublicUrl(data.url);

      const page = await fetchPage(url);

      if (!page.text || page.text.length < 50) {
        return {
          error: "empty_page",
          message:
            "We could not find enough readable content on that page.",
        } as const;
      }

      /*
       * Keep a reasonable amount of source text.
       *
       * GPT OSS 120B has a large context window, but we still
       * avoid sending massive pages unnecessarily.
       */
      const sourceText = page.text.slice(0, 120_000);

      const ai = await analyzeWithGroq({
        title: page.title,
        description: page.description,
        text: sourceText,
        mode: data.mode,
      });

      const content =
        safeString(ai.content) || sourceText;

      const result: ScrapeResult = {
        url: url.toString(),
        title:
          safeString(ai.title) ||
          page.title ||
          url.hostname,
        description:
          safeString(ai.description) ||
          page.description,
        content,
        summary: safeString(ai.summary),
        keyPoints: safeStringArray(ai.keyPoints),
        headlines: safeStringArray(ai.headlines),
        quotes: safeStringArray(ai.quotes),
        wordCount: countWords(sourceText),
        mode: data.mode,
      };

      return {
        result,
      } as const;
    } catch (error) {
      console.error("URL scraping failed:", error);

      return {
        error: "scrape_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not scrape this URL.",
      } as const;
    }
  });
