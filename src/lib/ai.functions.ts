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
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function groqChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages }),
  });

  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${txt}`);
  }

  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from Groq");
  return content;
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
        "You are an expert web designer who writes detailed website-build prompts for AI builders like Lovable, Framer AI, v0, and Claude. Output a single, ready-to-paste prompt. Be specific about sections, copy direction, color palette, imagery, and CTAs tailored to the business. Do not include explanations before or after the prompt.",
      user: `Write a detailed AI website-build prompt for this business so a freelancer can instantly generate a modern, conversion-focused website for them.\n\n${ctx}`,
    };
  }
  return {
    system:
      "You are a friendly, high-converting sales coach for freelance web designers. Write a concise, natural cold-call script (under 200 words) with an opener, value hook referencing their strong reviews but missing website, a soft question, objection handling, and a clear next step. Use [brackets] for the caller to fill in their name.",
    user: `Write a personalized cold-call script to pitch building a website for this business.\n\n${ctx}`,
  };
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => typeSchema.parse(data))
  .handler(async ({ data }) => {
    const { system, user } = buildPrompt(data.kind, data.lead);
    try {
      const content = await groqChat([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
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
Use [Your Name] and [Your Website] placeholders. No fluff or filler words.`,
        },
        { role: "user", content: `Write email sequence for:\n${ctx}` },
      ]);

      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const emails = JSON.parse(cleaned) as EmailSequence;
      return { emails } as const;
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "rate_limited") {
        return { error: "rate_limited", message: "AI is busy. Try again shortly." } as const;
      }
      console.error("Email sequence failed", e);
      return { error: "ai_error", message: "Could not generate email sequence." } as const;
    }
  });
