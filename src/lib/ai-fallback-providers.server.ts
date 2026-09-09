/**
 * Last-resort AI providers for server-side generation.
 *
 * Gemini and Groq remain Kodarai's primary providers. OpenRouter and Bytez
 * are deliberately only tried after a primary provider has failed. Both use
 * OpenAI-compatible chat completions, so this module gives all server
 * functions one safe, consistent fallback path without ever exposing keys to
 * the browser.
 */

export type AiChatMessage = {
  role: string;
  content: string;
};

export type AiFallbackResult = {
  content: string;
  provider: "openrouter" | "bytez";
  model: string;
};

type FallbackOptions = {
  temperature?: number;
  maxTokens?: number;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const BYTEZ_URL = "https://api.bytez.com/models/v2/openai/v1/chat/completions";

async function requestOpenAiCompatibleChat(input: {
  provider: AiFallbackResult["provider"];
  url: string;
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  options: FallbackOptions;
}): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.apiKey}`,
    "Content-Type": "application/json",
  };

  if (input.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL || "https://kodarai.xyz";
    headers["X-Title"] = "Kodarai";
  }

  const response = await fetch(input.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.options.temperature ?? 0.7,
      max_tokens: input.options.maxTokens ?? 2_500,
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${input.provider} returned ${response.status}: ${detail.slice(0, 280)}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${input.provider} returned an empty response.`);
  return content;
}

/**
 * Uses economical providers only after Gemini/Groq fail. OpenRouter's free
 * router is the default when an OpenRouter key exists. Bytez requires an
 * explicit model name because its available catalog can change.
 */
export async function callAiFallbackProviders(
  messages: AiChatMessage[],
  options: FallbackOptions = {},
): Promise<AiFallbackResult> {
  const attempts: Array<{
    provider: AiFallbackResult["provider"];
    url: string;
    apiKey: string | undefined;
    model: string | undefined;
  }> = [
    {
      provider: "openrouter",
      url: OPENROUTER_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
    },
    {
      provider: "bytez",
      url: BYTEZ_URL,
      apiKey: process.env.BYTEZ_API_KEY,
      model: process.env.BYTEZ_MODEL,
    },
  ];

  let lastError: Error | undefined;
  for (const attempt of attempts) {
    if (!attempt.apiKey || !attempt.model) continue;

    try {
      const content = await requestOpenAiCompatibleChat({
        provider: attempt.provider,
        url: attempt.url,
        apiKey: attempt.apiKey,
        model: attempt.model,
        messages,
        options,
      });
      return { content, provider: attempt.provider, model: attempt.model };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI fallback failed.");
      console.warn(`KodarAI ${attempt.provider} fallback failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("No AI fallback provider is configured.");
}
