import { z } from "zod";
import { isSafeStudioPath, type StudioFile, type StudioFileChange } from "@/lib/studio-files";
import { type BusinessWebsiteInput, websiteSpecificationSchema, type WebsiteSpecification } from "@/lib/website-templates";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b"];

function stripJson(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function requestStructuredJson(system: string, user: string): Promise<unknown> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const response = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.45, responseMimeType: "application/json", maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (response.ok) {
      const json = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return JSON.parse(stripJson(content));
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("AI is not configured.");
  let lastError = "AI is unavailable.";
  for (const model of GROQ_MODELS) {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) { lastError = `AI provider returned ${response.status}.`; continue; }
    const json = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (content) return JSON.parse(stripJson(content));
  }
  throw new Error(lastError);
}

function businessFacts(business: BusinessWebsiteInput): string {
  return [
    `Business name: ${business.name}`,
    `Category: ${business.category || "not supplied"}`,
    `Location: ${business.location || business.address || "not supplied"}`,
    `Phone: ${business.phone || "not supplied"}`,
    `Rating: ${business.rating ?? "not supplied"}`,
    `Review count: ${business.reviewCount ?? "not supplied"}`,
  ].join("\n");
}

const generationSystem = `You are Kodarai's website content planner. Kodarai creates credible, mobile-first local-business websites from controlled templates. Return JSON only. Never output HTML, CSS, JavaScript, markdown, or claims not present in the supplied facts. Do not invent awards, years, prices, addresses, phone numbers, certifications, exact services, testimonials, opening hours, or reviews. If a service is not known, write neutral, useful language. Avoid generic AI phrasing, gradients, hype, and fake claims. Choose one supported template and return exactly this JSON shape:
{"template":"restaurant|professional|salon|hotel|real-estate|church|gym|retail|healthcare|general","theme":{"primaryColor":"#RRGGBB","secondaryColor":"#RRGGBB","accentColor":"#RRGGBB","backgroundColor":"#RRGGBB","textColor":"#RRGGBB","fontFamily":"Inter|Manrope|DM Sans|Playfair Display","borderRadius":"soft|square|rounded","layoutStyle":"editorial|classic|modern"},"seo":{"title":"...","description":"..."},"hero":{"headline":"...","description":"...","primaryCta":"...","secondaryCta":"..."},"about":"...","services":[{"title":"...","description":"..."}]}`;

export async function generateBusinessWebsiteSpec(business: BusinessWebsiteInput): Promise<WebsiteSpecification> {
  const user = `Plan a polished website for this verified business data:\n${businessFacts(business)}\n\nUse the closest category template. Include 3 to 5 concise neutral service cards. Do not create a testimonial unless one was supplied; omit it.`;
  let first: unknown;
  try {
    first = await requestStructuredJson(generationSystem, user);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Website generation failed.");
  }
  const validated = websiteSpecificationSchema.safeParse(first);
  if (validated.success) return validated.data;

  const repair = `The prior JSON failed validation. Return a corrected JSON object only, preserving verified facts. Required errors: ${validated.error.issues.map((issue) => issue.path.join(".")).join(", ")}.\n\nPrior JSON:\n${JSON.stringify(first).slice(0, 12000)}`;
  const repaired = await requestStructuredJson(generationSystem, repair);
  const repairedValidated = websiteSpecificationSchema.safeParse(repaired);
  if (!repairedValidated.success) throw new Error("We couldn't generate a valid website from this business information. Please try again.");
  return repairedValidated.data;
}

const editResponseSchema = z.object({
  summary: z.string().min(1).max(500),
  changes: z.array(z.object({
    path: z.string().min(1).max(240),
    action: z.enum(["create", "update", "delete"]),
    content: z.string().max(512 * 1024).optional(),
  })).min(1).max(8),
}).strict();

export async function generateWebsiteEdit(input: {
  request: string;
  business: BusinessWebsiteInput;
  files: StudioFile[];
}): Promise<{ summary: string; changes: StudioFileChange[] }> {
  const allowed = input.files.map((file) => file.path).join(", ");
  const system = `You are Kodarai's targeted website editor. Return JSON only in this exact shape: {"summary":"brief plain English result","changes":[{"path":"existing file path","action":"update","content":"complete file content"}]}. Make the smallest possible change. You may only update these existing files: ${allowed}. Never create dependencies, package files, server code, fetch calls, tracking scripts, or external credentials. Preserve responsive behavior and verified business facts. Return complete content for each changed file, never a diff.`;
  const user = `Verified business facts:\n${businessFacts(input.business)}\n\nUser request: ${input.request}\n\nCurrent files:\n${input.files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n")}`;
  const raw = await requestStructuredJson(system, user);
  const parsed = editResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Kodarai could not produce a valid edit. Please try again.");
  const changes: StudioFileChange[] = parsed.data.changes.map((change) => ({ ...change, language: undefined }));
  for (const change of changes) {
    if (!isSafeStudioPath(change.path) || !input.files.some((file) => file.path === change.path)) {
      throw new Error("Kodarai proposed an unsafe project change.");
    }
    if (change.action !== "delete" && typeof change.content !== "string") throw new Error("Kodarai returned an incomplete file edit.");
  }
  return { summary: parsed.data.summary, changes };
}
