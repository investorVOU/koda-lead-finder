import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Gemini 2.0 Flash via Google AI Studio (OpenAI-compatible endpoint) — best for code gen
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.0-flash";

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
      // Limit to 6000 chars to stay within context
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

  // Count user messages this month across all studio projects
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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const systemPrompt = buildSystemContext(files, currentFile, leadContext);

        // ── Call Gemini 2.0 Flash with streaming ──────────────────────────────
        const gatewayRes = await fetch(GEMINI_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GEMINI_MODEL,
            stream: true,
            max_tokens: 8192,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
          }),
        });

        if (!gatewayRes.ok) {
          const errText = await gatewayRes.text().catch(() => "");
          console.error("Studio generate gateway error", gatewayRes.status, errText);
          return new Response(JSON.stringify({ error: "AI unavailable" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Transform + proxy the SSE stream ─────────────────────────────────
        const encoder = new TextEncoder();
        let fullContent = "";

        const outStream = new ReadableStream({
          async start(controller) {
            const reader = gatewayRes.body!.getReader();
            const decoder = new TextDecoder();

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const raw = line.slice(6).trim();
                  if (raw === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(raw) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const text = parsed.choices?.[0]?.delta?.content;
                    if (text) {
                      fullContent += text;
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "text", text })}\n\n`
                        )
                      );
                    }
                  } catch {
                    // skip malformed SSE lines
                  }
                }
              }

              // ── Post-stream: send final event ──────────────────────────────
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent })}\n\n`)
              );
            } catch (err) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`
                )
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
