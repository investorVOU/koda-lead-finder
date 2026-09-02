import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasPaidSubscription, hasPlanAtLeast, paidPlanRequired } from "@/lib/subscription.server";

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

// Phrases that make AI-generated sales/marketing copy instantly
// recognizable as AI-generated. Banning them forces the model to
// write something more specific to the actual business.
const CLICHE_BAN =
  " Never use these overused AI-copywriting phrases or close variants of them: \"in today's digital age\", \"take your business to the next level\", \"stand out from the competition\", \"unlock your potential\", \"look no further\", \"in today's fast-paced world\", \"elevate your brand\", \"seamless experience\", \"game-changer\", \"cutting-edge\", \"state-of-the-art\", \"whether you're... or...\". Write like a specific, observant human who actually looked at this business, not like generic marketing filler.";

async function groqChat(
  messages: { role: string; content: string }[],
  opts?: { temperature?: number },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  let lastErr: Error | null = null;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          // Higher temperature + penalties so repeated calls (even for
          // the same lead) don't converge on near-identical wording.
          temperature: opts?.temperature ?? 0.95,
          presence_penalty: 0.4,
          frequency_penalty: 0.3,
        }),
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Randomized creative direction ──────────────────────────────────────────
// Picking one of these per call is what makes two generations for the
// same lead (or two different leads) actually feel different, instead
// of the model reusing its favorite template every time.

const WEBSITE_ANGLES = [
  "lead with how much business they're likely losing to competitors who already rank on Google",
  "lead with the gap between their strong reputation and their invisible online presence",
  "lead with what a first-time visitor to their storefront/location would want to know before showing up",
  "lead with the single biggest trust signal this business already has (reviews, years open, rating) and how the site should showcase it",
];

const WEBSITE_TONES = [
  "confident and direct, like a designer who's done this a hundred times",
  "warm and consultative, like you're walking a business owner through their new site in person",
  "sharp and slightly informal, like a peer-to-peer pitch, not a corporate deck",
];

const CALL_OPENERS = [
  "a direct, no-fluff opener that states the reason for the call in the first sentence",
  "a curiosity-based opener that references something specific and true about their business before pitching anything",
  "a compliment-first opener that references their rating/reviews specifically, not generically",
];

const CALL_STRUCTURES = [
  "Problem, Agitate, Solve (name the gap, make it concrete, offer the fix)",
  "a straightforward: reason for call, quick value point, one specific question, next step",
];

function buildPrompt(kind: string, lead: z.infer<typeof leadSchema>) {
  const location = lead.location || lead.address || "their area";
  const hasStrongReviews = (lead.rating ?? 0) >= 4.3 && lead.reviewCount >= 10;

  const ctx = `Business name: ${lead.name}
Category: ${lead.category || "local business"}
Location: ${location}
Address: ${lead.address || "not provided"}
Google rating: ${lead.rating ?? "N/A"} (${lead.reviewCount} reviews)
Reputation signal to use: ${
    hasStrongReviews
      ? "strong — lean on the rating/review count as proof they deliver, contrasted with having no site"
      : lead.reviewCount > 0
        ? "modest — don't oversell the rating, focus on visibility and credibility instead"
        : "unestablished online — focus entirely on getting found and looking legitimate"
  }`;

  if (kind === "website_prompt") {
    const angle = pick(WEBSITE_ANGLES);
    const tone = pick(WEBSITE_TONES);
    const PERSONA_OPENER =
      "You are a professional website builder with 4 years of experience";
    return {
      system:
        "You are a senior web designer who writes build-ready prompts for AI site builders (Lovable, Framer AI, v0, Claude). " +
        "Your prompts are specific enough that a builder produces something genuinely tailored to the business — never a generic template with the business name swapped in. " +
        `The prompt you output must begin with the exact sentence "${PERSONA_OPENER}", followed by one clause naming the kind of sites you specialize in (choose something that fits this business's category), then continue directly into the build brief in the same paragraph or the next line — do not add a heading, label, or blank explanation before it. ` +
        "After that opening, the prompt must include: a named site structure (specific sections, not just 'homepage'), real copy direction with example headline options (not placeholder brackets), a color palette described with actual hex-adjacent reasoning tied to the category (not 'modern blue'), specific imagery direction (what should actually be photographed or shown, not stock-photo clichés), and 2-3 concrete calls-to-action tied to how this type of business actually converts customers (booking, calling, quoting, visiting). " +
        "Output only the finished prompt — no preamble, no explanation, no meta-commentary about what you're doing." +
        NO_MARKDOWN +
        CLICHE_BAN,
      user: `Write a detailed, build-ready website prompt for this specific business. It must open with the exact sentence "${PERSONA_OPENER}" as instructed.

${ctx}

Creative direction for this one: ${angle}. Tone: ${tone}.

Make at least three details in the prompt (a headline option, a section name, or a CTA) something that could only apply to a business like this one — not something that would work equally well for any local business.`,
    };
  }

  const opener = pick(CALL_OPENERS);
  const structure = pick(CALL_STRUCTURES);
  return {
    system:
      "You are a sharp, experienced cold-calling coach for freelance web designers who sell to local businesses. " +
      "You write scripts that sound like a real person talking, not a sales template — short sentences, natural pauses, no corporate polish. " +
      "Every script needs: an opener under 15 words, one value point that's specific to this business (not generic 'a website helps you grow'), one real open-ended question, one specific objection with a genuine one-line answer (not 'I understand your concern'), and a low-pressure next step (not 'let's schedule a call' — something concrete like a free mockup or a two-minute look at their current search presence). " +
      "Keep the whole script under 200 words. Use [Name] as the only placeholder." +
      NO_MARKDOWN +
      CLICHE_BAN,
    user: `Write a cold-call script to pitch this specific business owner on a new website.

${ctx}

Use ${opener}. Structure the call as: ${structure}.

The value point and the objection you handle must both reference something specific to this business (its category, its rating, or its location) — not something generic that would work for any local business.`,
  };
}

const WEBSITE_PERSONA_OPENER =
  "You are a professional website builder with 4 years of experience";

// Safety net: if the model drops the required opening line (or
// prefaces it with something like "Here's the prompt:"), force it
// on so the output is consistent every time.
function ensureWebsitePersonaOpener(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith(WEBSITE_PERSONA_OPENER)) return trimmed;
  return `${WEBSITE_PERSONA_OPENER} building sites for businesses like this one.\n\n${trimmed}`;
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => typeSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return paidPlanRequired();

    const { system, user } = buildPrompt(data.kind, data.lead);
    try {
      const raw = await groqChat([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      const cleaned = stripMarkdown(raw);
      const content = data.kind === "website_prompt" ? ensureWebsitePersonaOpener(cleaned) : cleaned;
      return { content } as const;
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

// ─── Email Sequence Generator ────────────────────────────────────────────────

const seqSchema = z.object({ lead: leadSchema });

export interface EmailDraft { subject: string; body: string }
export interface EmailSequence { email1: EmailDraft; email2: EmailDraft; email3: EmailDraft }

const EMAIL_ANGLES = [
  "the gap between their reputation and their online presence",
  "what a potential customer sees (or doesn't see) when they search for this business right now",
  "a specific, low-effort offer to prove value before asking for anything",
];

export const generateEmailSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => seqSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPlanAtLeast(context.userId, "pro"))) {
      return {
        error: "plan_required",
        message: "Email sequences are available on Pro and Agency plans.",
      } as const;
    }

    const location = data.lead.location || data.lead.address || "their area";
    const ctx = `Business: ${data.lead.name}
Category: ${data.lead.category || "local business"}
Location: ${location}
Rating: ${data.lead.rating ?? "N/A"} (${data.lead.reviewCount} reviews)`;
    const angle = pick(EMAIL_ANGLES);

    try {
      const raw = await groqChat([
        {
          role: "system",
          content: `You are a cold email expert for freelance web designers pitching local businesses. Write a 3-email outreach sequence that sounds like it was written by a person who actually looked at this business, not a mail-merge template. Return ONLY valid JSON (no markdown, no code blocks) in this exact shape:
{"email1":{"subject":"...","body":"..."},"email2":{"subject":"...","body":"..."},"email3":{"subject":"...","body":"..."}}
Email 1 (Day 1): casual intro referencing something specific and true about the business, soft CTA. Under 80 words.
Email 2 (Day 3): follow-up that adds new information (not a repeat of email 1) — one concrete social proof line or observation. Under 70 words.
Email 3 (Day 7): short, direct final nudge with a real reason to reply now, easy opt-out. Under 60 words.
Subject lines must be specific to this business, never generic ("Quick question", "Following up" are banned).
Use [Your Name] and [Your Website] as the only placeholders.${CLICHE_BAN}
The "body" fields must be plain text only — no markdown, no asterisks, no underscores, no hash headers. Write them as you would a plain email.`,
        },
        {
          role: "user",
          content: `Write an email sequence for this business, angled around: ${angle}.\n\n${ctx}`,
        },
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
