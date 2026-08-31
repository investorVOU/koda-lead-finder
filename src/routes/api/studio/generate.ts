import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// AI CONFIG
// ============================================================================

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
];

// ============================================================================
// TYPES
// ============================================================================

type Message = {
  role: "user" | "assistant";
  content: string;
};

type FileAction = "create" | "update" | "delete";

type FileChange = {
  path: string;
  action: FileAction;
  content: string;
};

type LeadContext = {
  businessName: string;
  category: string;
  city: string;
  phone?: string;
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are Kodarai Studio — an expert AI web designer and developer.

Your job is to build and modify professional websites directly inside the user's Kodarai Studio project.

IMPORTANT:
Your response has TWO parts:

PART 1 — MACHINE-READABLE FILE CHANGES

You MUST put all code changes inside exactly one <file_changes> block.

Use this format:

<file_changes>
  <file path="index.html" action="create"><![CDATA[
COMPLETE FILE CONTENT
]]></file>

  <file path="styles.css" action="create"><![CDATA[
COMPLETE FILE CONTENT
]]></file>

  <file path="script.js" action="create"><![CDATA[
COMPLETE FILE CONTENT
]]></file>
</file_changes>

PART 2 — HUMAN-READABLE SUMMARY

After the </file_changes> tag, write a short plain-English explanation of what you changed.

IMPORTANT FILE RULES:

- The <file_changes> block is machine-readable.
- NEVER put explanations inside <file_changes>.
- ALWAYS provide COMPLETE file contents for create/update.
- NEVER provide diffs.
- NEVER provide partial snippets.
- NEVER truncate files.
- Use action="create" when creating a new file.
- Use action="update" when modifying an existing file.
- Use action="delete" when removing a file.
- For delete, use an empty file element:
  <file path="example.js" action="delete"></file>
- Always use relative project paths.
- Never use absolute filesystem paths.
- Never use ../ paths.
- Always wrap file contents in CDATA.
- Do not put markdown code fences inside the file contents unless they are actually required by the website.

DEFAULT STACK:

- Semantic HTML5
- CSS3
- Minimal vanilla JavaScript
- No framework unless explicitly requested

Only use React + TypeScript + Tailwind if the user explicitly asks for it.

WEBSITE RULES:

- Mobile-first
- Fully responsive
- Professional visual design
- Conversion-focused
- Realistic business content
- Never use lorem ipsum
- Use relevant Unsplash image URLs
- Include a proper <title>
- Include meta description
- Include Open Graph metadata
- Include favicon
- Include a strong hero section
- Include services/features
- Include CTA sections
- Include contact information/section where appropriate
- Use accessible semantic HTML
- Make buttons and navigation functional
- Make mobile navigation functional when appropriate
- Use clean, maintainable CSS
- Avoid unnecessary dependencies

IMPORTANT BEHAVIOR:

When the user asks to build a website from scratch and the project is empty, create all required files.

When the user asks to modify the website, inspect the existing files provided in the project context and return the COMPLETE updated contents of every affected file.

Do not merely explain how to make the change. Actually make the change through <file_changes>.

If a request requires multiple files to remain consistent, update all affected files.

The final response after </file_changes> should be short and describe the work completed.`;

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

function buildSystemContext(
  files: Record<string, string>,
  currentFile?: string,
  leadContext?: LeadContext,
  mode: "full" | "compact" = "full"
): string {
  let ctx = SYSTEM_PROMPT;

  if (leadContext) {
    ctx += `

CLIENT CONTEXT:
- Business: ${leadContext.businessName}
- Type: ${leadContext.category}
- Location: ${leadContext.city}`;

    if (leadContext.phone) {
      ctx += `\n- Phone: ${leadContext.phone}`;
    }
  }

  const paths = Object.keys(files);

  if (paths.length === 0) {
    ctx += `

PROJECT STATUS:
The project is currently empty.

Create the complete website from scratch.`;

    return ctx;
  }

  ctx += `

PROJECT FILES:
There are ${paths.length} files in the current project.

${paths.map((file) => `- ${file}`).join("\n")}`;

  if (mode === "full") {
    for (const path of paths) {
      ctx += `

--- BEGIN FILE: ${path} ---
${files[path]}
--- END FILE: ${path} ---`;
    }

    if (currentFile) {
      ctx += `

CURRENTLY FOCUSED FILE:
${currentFile}`;
    }
  } else {
    const MAX_PER_FILE = 3500;
    const MAX_TOTAL = 10000;

    let used = 0;

    const ordered =
      currentFile && files[currentFile]
        ? [
            currentFile,
            ...paths.filter((p) => p !== currentFile),
          ]
        : paths;

    for (const path of ordered) {
      if (used >= MAX_TOTAL) {
        break;
      }

      const content = files[path];

      const slice =
        content.length > MAX_PER_FILE
          ? content.slice(0, MAX_PER_FILE) +
            "\n... [file content truncated for context]"
          : content;

      ctx += `

--- BEGIN FILE: ${path} ---
${slice}
--- END FILE: ${path} ---`;

      used += slice.length;
    }
  }

  return ctx;
}

// ============================================================================
// MESSAGE COMPACTION
// ============================================================================

function compactMessages(
  messages: Message[],
  maxOlderChars = 6000
): Message[] {
  if (messages.length <= 1) {
    return messages;
  }

  const latest = messages[messages.length - 1];
  const older = messages.slice(0, -1);

  let budget = maxOlderChars;

  const kept: Message[] = [];

  for (
    let i = older.length - 1;
    i >= 0 && budget > 0;
    i--
  ) {
    const message = older[i];

    const take =
      message.content.length > budget
        ? message.content.slice(0, budget) + "…"
        : message.content;

    kept.unshift({
      role: message.role,
      content: take,
    });

    budget -= take.length;
  }

  return [...kept, latest];
}

// ============================================================================
// FILE CHANGE PARSER
// ============================================================================

function parseFileChanges(content: string): FileChange[] {
  const results: FileChange[] = [];

  const changesMatch = content.match(
    /<file_changes\b[^>]*>([\s\S]*?)<\/file_changes>/i
  );

  if (!changesMatch) {
    return results;
  }

  const block = changesMatch[1];

  const fileRegex =
    /<file\s+path=["']([^"']+)["']\s+action=["'](create|update|delete)["']\s*>([\s\S]*?)<\/file>/gi;

  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(block)) !== null) {
    const path = match[1].trim();
    const action = match[2] as FileAction;

    let fileContent = match[3] ?? "";

    // Remove CDATA wrapper.
    fileContent = fileContent
      .replace(/^\s*<!\[CDATA\[/, "")
      .replace(/\]\]>\s*$/, "")
      .trim();

    if (!isSafeFilePath(path)) {
      console.warn(`Rejected unsafe file path: ${path}`);
      continue;
    }

    results.push({
      path,
      action,
      content: action === "delete" ? "" : fileContent,
    });
  }

  return results;
}

// ============================================================================
// FILE PATH SECURITY
// ============================================================================

function isSafeFilePath(path: string): boolean {
  if (!path) {
    return false;
  }

  // Reject absolute paths.
  if (path.startsWith("/")) {
    return false;
  }

  // Reject Windows absolute paths.
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return false;
  }

  // Reject traversal.
  if (path.includes("..")) {
    return false;
  }

  // Reject backslashes.
  if (path.includes("\\")) {
    return false;
  }

  // Reject null bytes.
  if (path.includes("\0")) {
    return false;
  }

  return true;
}

// ============================================================================
// SUMMARY EXTRACTION
// ============================================================================

function extractSummary(content: string): string {
  const withoutFileChanges = content
    .replace(
      /<file_changes\b[^>]*>[\s\S]*?<\/file_changes>/gi,
      ""
    )
    .trim();

  if (!withoutFileChanges) {
    return "Done — I created the requested website changes.";
  }

  return withoutFileChanges;
}

// ============================================================================
// RATE LIMITS
// ============================================================================

const PLAN_LIMITS: Record<string, number> = {
  starter: 50,
  pro: 200,
  agency: 9999,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function checkLimit(
  userId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const now = new Date();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();

  const subscription = sub as { plan?: string; status?: string } | null;
  if (subscription?.status !== "active" && subscription?.status !== "canceling") {
    return { allowed: false, used: 0, limit: 0 };
  }

  const plan = subscription.plan ?? "";

  const limit = PLAN_LIMITS[plan] ?? 0;

  const { data: projects } = await db
    .from("studio_projects")
    .select("id")
    .eq("user_id", userId);

  const projectIds = (projects ?? []).map(
    (p: { id: string }) => p.id
  );

  let used = 0;

  if (projectIds.length > 0) {
    const { count } = await db
      .from("studio_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("project_id", projectIds)
      .eq("role", "user")
      .gte("created_at", monthStart);

    used = count ?? 0;
  }

  return {
    allowed: used < limit,
    used,
    limit,
  };
}

// ============================================================================
// GROQ FALLBACK
// ============================================================================

async function tryGroqModels(
  groqKey: string,
  systemPrompt: string,
  messages: Message[]
): Promise<{
  res: Response | null;
  lastStatus?: number;
  lastError?: string;
}> {
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  const attempts = [
    {
      maxTokens: 6144,
      historyBudget: 7000,
    },
    {
      maxTokens: 4096,
      historyBudget: 2500,
    },
  ];

  for (const model of GROQ_MODELS) {
    for (const attempt of attempts) {
      const safeMessages = compactMessages(
        messages,
        attempt.historyBudget
      );

      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",

          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: attempt.maxTokens,

            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              ...safeMessages,
            ],
          }),
        });

        if (res.ok) {
          return {
            res,
          };
        }

        const errText = await res
          .text()
          .catch(() => "");

        lastStatus = res.status;
        lastError = errText;

        if (res.status === 413) {
          console.warn(
            `Groq ${model} 413 — tightening budget.`
          );

          continue;
        }

        console.warn(
          `Groq model ${model} failed (${res.status}).`
        );

        break;
      } catch (err) {
        lastError = String(err);

        console.warn(
          `Groq model ${model} unreachable.`,
          err
        );

        break;
      }
    }
  }

  return {
    res: null,
    lastStatus,
    lastError,
  };
}

// ============================================================================
// GEMINI CONTENT BUILDER
// ============================================================================

function buildGeminiContents(messages: Message[]) {
  const rawContents = messages.map((message) => ({
    role:
      message.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: message.content,
      },
    ],
  }));

  const contents: {
    role: string;
    parts: {
      text: string;
    }[];
  }[] = [];

  for (const message of rawContents) {
    const last =
      contents[contents.length - 1];

    if (last && last.role === message.role) {
      last.parts[0].text +=
        "\n" + message.parts[0].text;
    } else {
      contents.push({
        role: message.role,
        parts: [
          {
            text: message.parts[0].text,
          },
        ],
      });
    }
  }

  return contents;
}

// ============================================================================
// GEMINI SSE PARSER
// ============================================================================

function extractGeminiText(
  parsed: Record<string, unknown>
): string | undefined {
  const candidates = parsed.candidates as
    | {
        content?: {
          parts?: {
            text?: string;
          }[];
        };
      }[]
    | undefined;

  return candidates?.[0]?.content?.parts?.[0]?.text;
}

// ============================================================================
// GROQ SSE PARSER
// ============================================================================

function extractGroqText(
  parsed: Record<string, unknown>
): string | undefined {
  const choices = parsed.choices as
    | {
        delta?: {
          content?: string;
        };
      }[]
    | undefined;

  return choices?.[0]?.delta?.content;
}

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute(
  "/api/studio/generate"
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ================================================================
        // AUTH
        // ================================================================

        const authHeader =
          request.headers.get("Authorization");

        const token = authHeader
          ?.replace("Bearer ", "")
          .trim();

        if (!token) {
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
            }),
            {
              status: 401,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        const {
          data: { user },
          error: authError,
        } = await supabaseAdmin.auth.getUser(
          token
        );

        if (authError || !user) {
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
            }),
            {
              status: 401,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // REQUEST BODY
        // ================================================================

        let body: {
          projectId: string;
          messages: Message[];
          files?: Record<string, string>;
          currentFile?: string;
          leadContext?: LeadContext;
        };

        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({
              error: "Invalid JSON",
            }),
            {
              status: 400,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        const {
          projectId,
          messages,
          files = {},
          currentFile,
          leadContext,
        } = body;

        if (
          !projectId ||
          !messages?.length
        ) {
          return new Response(
            JSON.stringify({
              error:
                "projectId and messages are required",
            }),
            {
              status: 400,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // VERIFY PROJECT OWNERSHIP
        // ================================================================

        const { data: project } = await db
          .from("studio_projects")
          .select("id")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!project) {
          return new Response(
            JSON.stringify({
              error: "Project not found",
            }),
            {
              status: 404,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // PLAN LIMIT
        // ================================================================

        const {
          allowed,
          used,
          limit,
        } = await checkLimit(user.id);

        if (!allowed) {
          return new Response(
            JSON.stringify({
              error: "limit_reached",

              message: `You've used all ${limit} AI messages this month. Upgrade to continue.`,

              used,
              limit,
            }),
            {
              status: 402,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // AI KEYS
        // ================================================================

        const geminiKey =
          process.env.GEMINI_API_KEY;

        const groqKey =
          process.env.GROQ_API_KEY;

        if (!geminiKey && !groqKey) {
          return new Response(
            JSON.stringify({
              error:
                "AI not configured — set GEMINI_API_KEY or GROQ_API_KEY",
            }),
            {
              status: 500,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // BUILD CONTEXT
        // ================================================================

        const fullSystemPrompt =
          buildSystemContext(
            files,
            currentFile,
            leadContext,
            "full"
          );

        const compactSystemPrompt =
          buildSystemContext(
            files,
            currentFile,
            leadContext,
            "compact"
          );

        // ================================================================
        // GENERATE
        // ================================================================

        let aiRes: Response | null = null;

        let usingGroq = false;

        // ================================================================
        // GEMINI FIRST
        // ================================================================

        if (geminiKey) {
          const contents =
            buildGeminiContents(messages);

          try {
            const res = await fetch(
              GEMINI_URL,
              {
                method: "POST",

                headers: {
                  "x-goog-api-key":
                    geminiKey,

                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  systemInstruction: {
                    parts: [
                      {
                        text: fullSystemPrompt,
                      },
                    ],
                  },

                  contents,

                  generationConfig: {
                    maxOutputTokens: 8192,
                  },
                }),

                signal:
                  AbortSignal.timeout(
                    45_000
                  ),
              }
            );

            if (res.ok) {
              aiRes = res;
            } else {
              const errText =
                await res
                  .text()
                  .catch(() => "");

              console.warn(
                `Gemini ${res.status} — falling back to Groq. ${errText.slice(
                  0,
                  200
                )}`
              );
            }
          } catch (err) {
            console.warn(
              "Gemini unreachable — falling back to Groq:",
              err
            );
          }
        }

        // ================================================================
        // GROQ FALLBACK
        // ================================================================

        if (!aiRes && groqKey) {
          usingGroq = true;

          const {
            res,
            lastStatus,
            lastError,
          } = await tryGroqModels(
            groqKey,
            compactSystemPrompt,
            messages
          );

          if (!res) {
            console.error(
              "All Groq models failed",
              lastStatus,
              lastError
            );

            const is413 =
              lastStatus === 413;

            return new Response(
              JSON.stringify({
                error: is413
                  ? "Request too large for the fallback AI. Try a shorter follow-up or fewer open files."
                  : `AI unavailable (Groq ${
                      lastStatus ?? "error"
                    })`,
              }),
              {
                status: 502,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );
          }

          aiRes = res;
        }

        // ================================================================
        // NO AI
        // ================================================================

        if (!aiRes) {
          return new Response(
            JSON.stringify({
              error: "AI unavailable",
            }),
            {
              status: 502,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }

        // ================================================================
        // NORMALIZE AI SSE
        //
        // IMPORTANT:
        // We do NOT send raw AI text to the frontend anymore.
        //
        // This is what fixes the screenshot problem.
        //
        // Instead:
        //
        // AI
        //  ↓
        // fullContent
        //  ↓
        // parseFileChanges()
        //  ↓
        // structured fileChanges
        //  ↓
        // frontend
        // ================================================================

        const encoder =
          new TextEncoder();

        const outStream =
          new ReadableStream({
            async start(controller) {
              const reader =
                aiRes!.body!.getReader();

              const decoder =
                new TextDecoder();

              let fullContent = "";

              // SSE data can be split across network chunks.
              // Keep an incomplete line here.
              let buffer = "";

              try {
                while (true) {
                  const {
                    value,
                    done,
                  } = await reader.read();

                  if (done) {
                    break;
                  }

                  buffer += decoder.decode(
                    value,
                    {
                      stream: true,
                    }
                  );

                  const lines =
                    buffer.split("\n");

                  buffer =
                    lines.pop() ?? "";

                  for (const rawLine of lines) {
                    const line =
                      rawLine.trim();

                    if (
                      !line.startsWith(
                        "data:"
                      )
                    ) {
                      continue;
                    }

                    const raw =
                      line
                        .slice(5)
                        .trim();

                    if (
                      !raw ||
                      raw === "[DONE]"
                    ) {
                      continue;
                    }

                    try {
                      const parsed =
                        JSON.parse(raw) as Record<
                          string,
                          unknown
                        >;

                      const text =
                        usingGroq
                          ? extractGroqText(
                              parsed
                            )
                          : extractGeminiText(
                              parsed
                            );

                      if (text) {
                        fullContent +=
                          text;

                        // Send only progress metadata.
                        // DO NOT send the generated XML.
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify(
                              {
                                type: "progress",
                              }
                            )}\n\n`
                          )
                        );
                      }
                    } catch {
                      // Ignore malformed SSE records.
                    }
                  }
                }

                // ========================================================
                // PARSE FILE CHANGES
                // ========================================================

                const fileChanges =
                  parseFileChanges(
                    fullContent
                  );

                // ========================================================
                // SAFETY LIMIT
                // ========================================================

                const limitedFileChanges =
                  fileChanges.slice(
                    0,
                    50
                  );

                // ========================================================
                // HUMAN SUMMARY
                // ========================================================

                const summary =
                  extractSummary(
                    fullContent
                  );

                // ========================================================
                // SEND CLEAN ASSISTANT MESSAGE
                // ========================================================

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(
                      {
                        type: "text",
                        text: summary,
                      }
                    )}\n\n`
                  )
                );

                // ========================================================
                // SEND STRUCTURED FILE CHANGES
                // ========================================================

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(
                      {
                        type: "files",
                        fileChanges:
                          limitedFileChanges,
                      }
                    )}\n\n`
                  )
                );

                // ========================================================
                // DONE
                // ========================================================

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(
                      {
                        type: "done",

                        // Keep this for debugging / persistence.
                        // Frontend should NOT display it.
                        fullContent,

                        summary,

                        fileChanges:
                          limitedFileChanges,

                        filesChanged:
                          limitedFileChanges.map(
                            (file) =>
                              file.path
                          ),
                      }
                    )}\n\n`
                  )
                );
              } catch (err) {
                console.error(
                  "AI stream error:",
                  err
                );

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(
                      {
                        type: "error",
                        error: String(
                          err
                        ),
                      }
                    )}\n\n`
                  )
                );
              } finally {
                controller.close();
              }
            },
          });

        // ================================================================
        // RESPONSE
        // ================================================================

        return new Response(
          outStream,
          {
            headers: {
              "Content-Type":
                "text/event-stream",

              "Cache-Control":
                "no-cache, no-transform",

              Connection:
                "keep-alive",

              "X-Accel-Buffering":
                "no",
            },
          }
        );
      },
    },
  },
});
