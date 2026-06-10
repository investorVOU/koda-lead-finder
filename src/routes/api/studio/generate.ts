import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Primary: Gemini 2.5 Flash — native API, x-goog-api-key (supports AQ. keys)
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

// Fallback: Groq llama-3.3-70b — OpenAI-compatible, fast
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Kodarai Studio — an expert web designer who builds professional websites for local businesses.

When asked to build or modify a website, respond with your file changes in this exact XML format:

<file_changes>
  <file path="index.html" action="create">
    [COMPLETE file content — never partial or truncated]
  </file>
  <file path="styles.css" action="update">
    [COMPLETE file content]
  </file>
  <file path="old-file.js" action="delete"></file>
</file_changes>

After the XML block, write a short plain-English summary of what you changed and why.

Rules:
- Always write COMPLETE file contents — never diffs, never partial snippets
- Default stack: semantic HTML5 + CSS3 + minimal vanilla JS (no framework)
- Use React + TypeScript + Tailwind only if the user explicitly asks
- Every site MUST be mobile-first and fully responsive
- Never use placeholder lorem ipsum — write realistic content tailored to the business
- Use Unsplash image URLs relevant to the business type (format: https://images.unsplash.com/photo-[id]?w=1200)
- Always include: proper <title>, meta description, Open Graph tags, favicon link
- Make sites look credible and conversion-focused — hero, features/services, CTA, contact section`;

function buildSystemContext(
  files: Record<string, string>,
  currentFile?: string,
  leadContext?: { businessName: string; category: string; city: string; phone?: string }
): string {
  let ctx = "";

  if (leadContext) {
    ctx += `\n\nClient context:\n- Business: ${leadContext.businessName}\n- Type: ${leadContext.category}\n- Location: ${leadContext.city}`;
    if (leadContext.phone) ctx += `\n- Phone: ${leadContext.phone}`;
  }

  const filePaths = Object.keys(files);
  if (filePaths.length > 0) {
    ctx += `\n\nProject files (${filePaths.length} total):\n${filePaths.map((f) => `- ${f}`).join("\n")}`;
    if (currentFile && files[currentFile]) {
      const content = files[currentFile];
      const preview = content.length > 6000 ? content.slice(0, 6000) + "\n... [truncated]" : content;
      ctx += `\n\nCurrently open — ${currentFile}:\n\`\`\`\n${preview}\n\`\`\``;
    }
  }

  return SYSTEM_PROMPT + ctx;
}

// ── Rate-limit helpers ──────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  trial: 20,
  starter: 50,
  pro: 200,
  max: 9999,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function checkLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = (sub as { plan?: string } | null)?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? 5;

  const { data: projects } = await db
    .from("studio_projects")
    .select("id")
    .eq("user_id", userId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

  let used = 0;
  if (projectIds.length > 0) {
    const { count } = await db
      .from("studio_messages")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .eq("role", "user")
      .gte("created_at", monthStart);
    used = count ?? 0;
  }

  return { allowed: used < limit, used, limit };
}

// ── Route ──────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/studio/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── Auth ──────────────────────────────────────────────────────────────
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "").trim();
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const {
          data: { user },
          error: authError,
        } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Parse body ────────────────────────────────────────────────────────
        let body: {
          projectId: string;
          messages: { role: "user" | "assistant"; content: string }[];
          files?: Record<string, string>;
          currentFile?: string;
          leadContext?: { businessName: string; category: string; city: string; phone?: string };
        };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { projectId, messages, files = {}, currentFile, leadContext } = body;
        if (!projectId || !messages?.length) {
          return new Response(JSON.stringify({ error: "projectId and messages are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Verify project ownership ──────────────────────────────────────────
        const { data: project } = await db
          .from("studio_projects")
          .select("id")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!project) {
          return new Response(JSON.stringify({ error: "Project not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Plan limit ────────────────────────────────────────────────────────
        const { allowed, used, limit } = await checkLimit(user.id);
        if (!allowed) {
          return new Response(
            JSON.stringify({
              error: "limit_reached",
              message: `You've used all ${limit} AI messages this month. Upgrade to continue.`,
              used,
              limit,
            }),
            { status: 402, headers: { "Content-Type": "application/json" } }
          );
        }

        // ── AI config ─────────────────────────────────────────────────────────
        const geminiKey = process.env.GEMINI_API_KEY;
        const groqKey   = process.env.GROQ_API_KEY;
        if (!geminiKey && !groqKey) {
          return new Response(JSON.stringify({ error: "AI not configured — set GEMINI_API_KEY or GROQ_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const systemPrompt = buildSystemContext(files, currentFile, leadContext);

        // ── Try Gemini, fall back to Groq on any error ────────────────────────
        let aiRes: Response | null = null;
        let usingGroq = false;

        if (geminiKey) {
          // Gemini native format — merge consecutive same-role messages (Gemini
          // requires strict user/model alternation)
          const rawContents = messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
          const contents: { role: string; parts: { text: string }[] }[] = [];
          for (const msg of rawContents) {
            const last = contents[contents.length - 1];
            if (last && last.role === msg.role) {
              last.parts[0].text += "\n" + msg.parts[0].text;
            } else {
              contents.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
            }
          }

          try {
            const res = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { maxOutputTokens: 8192 },
              }),
              signal: AbortSignal.timeout(25_000),
            });
            if (res.ok) {
              aiRes = res;
            } else {
              const errText = await res.text().catch(() => "");
              console.warn(`Gemini ${res.status} — falling back to Groq. ${errText.slice(0, 120)}`);
            }
          } catch (err) {
            console.warn("Gemini unreachable — falling back to Groq:", err);
          }
        }

        if (!aiRes && groqKey) {
          usingGroq = true;
          const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: GROQ_MODEL,
              stream: true,
              max_tokens: 8192,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
            }),
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            console.error("Groq fallback error", res.status, errText);
            return new Response(
              JSON.stringify({ error: `AI unavailable (Groq ${res.status})` }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }
          aiRes = res;
        }

        if (!aiRes) {
          return new Response(JSON.stringify({ error: "AI unavailable" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Proxy the SSE stream, normalising to our internal event format ────
        const encoder = new TextEncoder();
        let fullContent = "";
        const capturedRes = aiRes;

        const outStream = new ReadableStream({
          async start(controller) {
            const reader = capturedRes.body!.getReader();
            const decoder = new TextDecoder();

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split("\n")) {
                  if (!line.startsWith("data: ")) continue;
                  const raw = line.slice(6).trim();
                  if (!raw || raw === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    let text: string | undefined;

                    if (usingGroq) {
                      // OpenAI-compat: choices[0].delta.content
                      const choices = parsed.choices as { delta?: { content?: string } }[] | undefined;
                      text = choices?.[0]?.delta?.content;
                    } else {
                      // Gemini native: candidates[0].content.parts[0].text
                      const candidates = parsed.candidates as
                        { content?: { parts?: { text?: string }[] } }[] | undefined;
                      text = candidates?.[0]?.content?.parts?.[0]?.text;
                    }

                    if (text) {
                      fullContent += text;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
                      );
                    }
                  } catch {
                    // skip malformed SSE lines
                  }
                }
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent })}\n\n`)
              );
            } catch (err) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`)
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(outStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
