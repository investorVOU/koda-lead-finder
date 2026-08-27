import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const leadSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(80).optional().default(""),
  location: z.string().max(120).optional().default(""),
  address: z.string().max(300).optional().default(""),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().optional().default(0),
});

const typeSchema = z.object({
  kind: z.enum(["website_prompt", "call_script"]),
  lead: leadSchema,
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Ordered fallback chain: tried top to bottom. If a model gets
// decommissioned, drop it from this list (or just leave it — the
// fallback will skip it automatically) and add its replacement at
// the top. Check https://console.groq.com/docs/deprecations when
// generation starts failing again.
const GROQ_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b"];

// Shared instruction appended to every system prompt so the model
// doesn't fall back to markdown (**bold**, *italic*, # headers, etc).
// The UI renders these as plain text, so raw markdown syntax shows
// up literally as stray asterisks/hashes for the user.
const NO_MARKDOWN =
  " Output plain text only — no markdown. Do not use asterisks, underscores, hash symbols, or any other markdown syntax for bold, italics, or headers. For section labels, write the label in Title Case followed by a colon on its own line (e.g. \"Opener:\"), with a blank line before and after. For emphasis, use plain wording instead of symbols.";

// Safety net: strips common markdown emphasis/heading characters in
// case a model ignores the system instruction above. Intentionally
// conservative — only targets *, _, and leading # so it won't mangle
// things like "5-star" or bracketed placeholders.
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // leading heading hashes
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/(?<!\w)\*(?!\s)(.*?)(?<!\s)\*(?!\w)/g, "$1") // *italic*
    .replace(/(?<!\w)_(?!\s)(.*?)(?<!\s)_(?!\w)/g, "$1") // _italic_
    .trim();
}

async function groqChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  let lastErr: Error | null = null;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages }),
      });

      if (res.status === 429) throw new Error("rate_limited");

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        // Model retired or unknown — try the next one in the chain
        if (txt.includes("model_decommissioned") || txt.includes("does not exist")) {
          console.warn(`Groq model unavailable, falling back: ${model}`);
          lastErr = new Error(`Groq error ${res.status}: ${txt}`);
          continue;
        }
        throw new Error(`Groq error ${res.status}: ${txt}`);
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from Groq");

      return content;
    } catch (e) {
      if (e instanceof Error && e.message === "rate_limited") throw e;
      lastErr = e as Error;
      // try next model
    }
  }

  throw lastErr ?? new Error("All Groq models failed");
}

function buildPrompt(kind: string, lead: z.infer<typeof leadSchema>) {
  const ctx = `Business name: ${lead.name}
Category: ${lead.category || "local business"}
Location: ${lead.location || lead.address}
Address: ${lead.address}
Google rating: ${lead.rating ?? "N/A"} (${lead.reviewCount} reviews)`;

  if (kind === "website_prompt") {
    return {
      system:
        "You are an expert web designer who writes detailed website-build prompts for AI builders like Lovable, Framer AI, v0, and Claude. Output a single, ready-to-paste prompt. Be specific about sections, copy direction, color palette, imagery, and CTAs tailored to the business. Do not include explanations before or after the prompt." +
        NO_MARKDOWN,
      user: `Write a detailed AI website-build prompt for this business so a freelancer can instantly generate a modern, conversion-focused website for them.\n\n${ctx}`,
    };
  }
  return {
    system:
      "You are a friendly, high-converting sales coach for freelance web designers. Write a concise, natural cold-call script (under 200 words) with an opener, value hook referencing their strong reviews but missing website, a soft question, objection handling, and a clear next step. Use [brackets] for the caller to fill in their name." +
      NO_MARKDOWN,
    user: `Write a personalized cold-call script to pitch building a website for this business.\n\n${ctx}`,
  };
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => typeSchema.parse(data))
  .handler(async ({ data }) => {
    const { system, user } = buildPrompt(data.kind, data.lead);
    try {
      const raw = await groqChat([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      return { content: stripMarkdown(raw) } as const;
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "rate_limited") {
        return { error: "rate_limited", message: "AI is busy right now. Try again shortly." } as const;
      }
      if (e instanceof Error && e.message.includes("GROQ_API_KEY")) {
        return { error: "config", message: "AI is not configured yet." } as const;
      }
      console.error("AI generate failed", e);
      return { error: "ai_error", message: "Could not generate content." } as const;
    }
  });

// ─── Email Sequence Generator ────────────────────────────────────────────────

const seqSchema = z.object({ lead: leadSchema });

export interface EmailDraft { subject: string; body: string }
export interface EmailSequence { email1: EmailDraft; email2: EmailDraft; email3: EmailDraft }

export const generateEmailSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => seqSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = `Business: ${data.lead.name}
Category: ${data.lead.category || "local business"}
Location: ${data.lead.location || data.lead.address}
Rating: ${data.lead.rating ?? "N/A"} (${data.lead.reviewCount} reviews)`;

    try {
      const raw = await groqChat([
        {
          role: "system",
          content: `You are a cold email expert for freelance web designers. Write a 3-email outreach sequence. Return ONLY valid JSON (no markdown, no code blocks) in this exact shape:
{"email1":{"subject":"...","body":"..."},"email2":{"subject":"...","body":"..."},"email3":{"subject":"...","body":"..."}}
Email 1 (Day 1): casual intro, mention no website, offer to help, soft CTA. Under 80 words.
Email 2 (Day 3): follow-up, reference email 1, add one social proof line. Under 70 words.
Email 3 (Day 7): final short nudge, create mild urgency, easy opt-out. Under 60 words.
Use [Your Name] and [Your Website] placeholders. No fluff or filler words.
The "body" fields must be plain text only — no markdown, no asterisks, no underscores, no hash headers. Write them as you would a plain email.`,
        },
        { role: "user", content: `Write email sequence for:\n${ctx}` },
      ]);

      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const emails = JSON.parse(cleaned) as EmailSequence;

      // Safety net in case the model still slips markdown into a body
      (Object.keys(emails) as (keyof EmailSequence)[]).forEach((key) => {
        emails[key].body = stripMarkdown(emails[key].body);
        emails[key].subject = stripMarkdown(emails[key].subject);
      });

      return { emails } as const;
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "rate_limited") {
        return { error: "rate_limited", message: "AI is busy. Try again shortly." } as const;
      }
      console.error("Email sequence failed", e);
      return { error: "ai_error", message: "Could not generate email sequence." } as const;
    }
  });
