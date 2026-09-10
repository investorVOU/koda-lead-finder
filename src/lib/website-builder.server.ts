import { z } from "zod";

import {
  isSafeStudioPath,
  type StudioFile,
  type StudioFileChange,
} from "@/lib/studio-files";

import {
  type BusinessWebsiteInput,
  websiteSpecificationSchema,
  type ResolvedWebsiteSpecification,
  type WebsiteSpecification,
} from "@/lib/website-templates";

import {
  resolveWebsiteVisuals,
} from "@/lib/website-images.server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
];

function stripJson(
  text: string,
): string {
  return text
    .replace(
      /^```json\s*/i,
      "",
    )
    .replace(
      /^```\s*/i,
      "",
    )
    .replace(
      /```\s*$/i,
      "",
    )
    .trim();
}

async function requestStructuredJson(
  system: string,
  user: string,
): Promise<unknown> {
  const geminiKey =
    process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const response =
      await fetch(
        `${GEMINI_URL}?key=${geminiKey}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: system,
                },
              ],
            },

            contents: [
              {
                role: "user",

                parts: [
                  {
                    text: user,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.55,

              responseMimeType:
                "application/json",

              maxOutputTokens:
                8192,
            },
          }),

          signal:
            AbortSignal.timeout(
              55_000,
            ),
        },
      );

    if (response.ok) {
      const json =
        (await response.json()) as {
          candidates?: {
            content?: {
              parts?: {
                text?: string;
              }[];
            };
          }[];
        };

      const content =
        json.candidates?.[0]
          ?.content?.parts?.[0]
          ?.text;

      if (content) {
        return JSON.parse(
          stripJson(content),
        );
      }
    } else {
      console.error(
        `[Kodarai AI] Gemini returned ${response.status}`,
      );
    }
  }

  const groqKey =
    process.env.GROQ_API_KEY;

  if (!groqKey) {
    throw new Error(
      "AI is not configured.",
    );
  }

  let lastError =
    "AI is unavailable.";

  for (const model of GROQ_MODELS) {
    const response =
      await fetch(
        GROQ_URL,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${groqKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model,

            temperature: 0.55,

            response_format: {
              type: "json_object",
            },

            messages: [
              {
                role: "system",
                content: system,
              },

              {
                role: "user",
                content: user,
              },
            ],
          }),

          signal:
            AbortSignal.timeout(
              55_000,
            ),
        },
      );

    if (!response.ok) {
      lastError =
        `AI provider returned ${response.status}.`;

      continue;
    }

    const json =
      (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

    const content =
      json.choices?.[0]
        ?.message?.content;

    if (content) {
      return JSON.parse(
        stripJson(content),
      );
    }
  }

  throw new Error(
    lastError,
  );
}

function businessFacts(
  business: BusinessWebsiteInput,
): string {
  return [
    `Business name: ${business.name}`,

    `Category: ${
      business.category ||
      "not supplied"
    }`,

    `Location: ${
      business.location ||
      business.address ||
      "not supplied"
    }`,

    `Address: ${
      business.address ||
      "not supplied"
    }`,

    `Phone: ${
      business.phone ||
      "not supplied"
    }`,

    `Rating: ${
      business.rating ??
      "not supplied"
    }`,

    `Review count: ${
      business.reviewCount ??
      "not supplied"
    }`,
  ].join("\n");
}

const generationSystem = `
You are Kodarai's website creative director.

Kodarai creates premium, mobile-first websites for real local businesses.

You are responsible for deciding:
- the correct industry design system
- visual direction
- typography
- colors
- hero composition
- image-search direction
- marketing copy
- service presentation

Return JSON only.

Never output:
- HTML
- CSS
- JavaScript
- markdown

Never invent factual business claims.

Do NOT invent:
- awards
- years in business
- exact prices
- opening hours
- certifications
- staff names
- addresses
- phone numbers
- exact review quotes
- exact product inventory
- exact services that were not supplied as verified data

Neutral service descriptions are allowed where useful.

Avoid:
- fake metrics
- fake statistics
- fake testimonials
- excessive gradients
- generic AI wording
- corporate buzzwords
- excessive pill-shaped UI
- unnecessary hype

The website should feel like it was designed by a strong freelance web designer, not generated from a generic template.

SUPPORTED WEBSITE TYPES:

restaurant
professional
salon
hotel
real-estate
church
gym
retail
healthcare
general

HERO COMPOSITIONS:

background:
Use premium full-bleed photography with readable overlay.
Best for restaurants, gyms, hotels, hospitality and visually strong businesses.

split:
Use strong text on one side and a large photograph on the other.
Best for salons, professional firms, healthcare, retail and many service businesses.

editorial:
Use large typography, whitespace and photography integrated into the page composition.
Best for premium businesses, real estate, boutique businesses and sophisticated service brands.

Choose whichever composition best fits the specific business.

IMAGE SEARCH DIRECTION:

Write a realistic photo-search phrase suitable for stock photography.

Good:
"modern upscale Nigerian restaurant interior warm lighting plated food"

Bad:
"restaurant"

Good:
"premium contemporary barber shop interior black leather chairs"

Bad:
"barber"

Do not mention specific copyrighted brands, characters or photographers.

Return EXACTLY this JSON structure:

{
  "template": "restaurant|professional|salon|hotel|real-estate|church|gym|retail|healthcare|general",

  "theme": {
    "primaryColor": "#RRGGBB",
    "secondaryColor": "#RRGGBB",
    "accentColor": "#RRGGBB",
    "backgroundColor": "#RRGGBB",
    "textColor": "#RRGGBB",
    "fontFamily": "Inter|Manrope|DM Sans|Playfair Display",
    "borderRadius": "soft|square|rounded",
    "layoutStyle": "editorial|classic|modern"
  },

  "visualPlan": {
    "heroStyle": "background|split|editorial",
    "overlayStrength": "light|medium|dark",
    "imageSearchDirection": "realistic concise stock-photo search phrase"
  },

  "seo": {
    "title": "...",
    "description": "..."
  },

  "hero": {
    "headline": "...",
    "description": "...",
    "primaryCta": "...",
    "secondaryCta": "..."
  },

  "about": "...",

  "services": [
    {
      "title": "...",
      "description": "..."
    }
  ]
}
`;

export async function generateBusinessWebsiteSpec(
  business: BusinessWebsiteInput,
): Promise<ResolvedWebsiteSpecification> {
  const user = `
Create a polished website plan using this verified business information:

${businessFacts(business)}

Requirements:

1. Select the closest Kodarai website type.
2. Create a distinctive visual direction appropriate to this business.
3. Include 3 to 5 concise neutral service cards.
4. Select an appropriate hero composition.
5. Create a useful image-search direction for realistic premium photography.
6. Keep the page conversion-focused.
7. Make phone/contact actions prominent where a phone number exists.
8. Never invent business facts.
9. Do not create a testimonial unless a real testimonial was supplied.
`;

  let first: unknown;

  try {
    first =
      await requestStructuredJson(
        generationSystem,
        user,
      );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Website generation failed.",
    );
  }

  let specification:
    | WebsiteSpecification
    | null = null;

  const validated =
    websiteSpecificationSchema.safeParse(
      first,
    );

  if (validated.success) {
    specification =
      validated.data;
  } else {
    const repair = `
The previous JSON failed schema validation.

Return only a corrected JSON object.

Preserve verified business facts.

Validation problems:

${validated.error.issues
  .map(
    (issue) =>
      `${issue.path.join(".")}: ${issue.message}`,
  )
  .join("\n")}

Previous output:

${JSON.stringify(first).slice(
  0,
  12000,
)}
`;

    const repaired =
      await requestStructuredJson(
        generationSystem,
        repair,
      );

    const repairedValidated =
      websiteSpecificationSchema.safeParse(
        repaired,
      );

    if (
      !repairedValidated.success
    ) {
      throw new Error(
        "We couldn't generate a valid website from this business information. Please try again.",
      );
    }

    specification =
      repairedValidated.data;
  }

  const visuals =
    await resolveWebsiteVisuals(
      business,
      {
        template:
          specification.template,

        heroStyle:
          specification.visualPlan
            .heroStyle,

        overlayStrength:
          specification.visualPlan
            .overlayStrength,

        searchDirection:
          specification.visualPlan
            .imageSearchDirection,
      },
    );

  return {
    ...specification,
    visuals,
  };
}

const editResponseSchema =
  z.object({
    summary:
      z.string()
        .min(1)
        .max(500),

    changes:
      z.array(
        z.object({
          path:
            z.string()
              .min(1)
              .max(240),

          action:
            z.enum([
              "create",
              "update",
              "delete",
            ]),

          content:
            z.string()
              .max(
                512 * 1024,
              )
              .optional(),
        }),
      )
        .min(1)
        .max(8),
  }).strict();

export async function generateWebsiteEdit(
  input: {
    request: string;

    business:
      BusinessWebsiteInput;

    files:
      StudioFile[];
  },
): Promise<{
  summary: string;

  changes:
    StudioFileChange[];
}> {
  const allowed =
    input.files
      .map(
        (file) =>
          file.path,
      )
      .join(", ");

  const system = `
You are Kodarai's website editor.

Modify an existing generated business website.

Return JSON only in this exact shape:

{
  "summary": "brief plain English result",
  "changes": [
    {
      "path": "existing file path",
      "action": "update",
      "content": "complete file content"
    }
  ]
}

IMPORTANT RULES:

- Make the smallest reasonable change that satisfies the request.
- You may only update these existing files:
${allowed}

- Never create dependencies.
- Never create npm/package files.
- Never add server code.
- Never expose credentials.
- Never add analytics or tracking scripts.
- Never invent business facts.
- Preserve responsive behavior.
- Preserve image attribution where images are used.
- Preserve accessibility.
- Return COMPLETE file content for every changed file.
- Never return a diff.
`;

  const user = `
Verified business facts:

${businessFacts(
  input.business,
)}

User request:

${input.request}

Current files:

${input.files
  .map(
    (file) =>
      `--- ${file.path} ---\n${file.content}`,
  )
  .join("\n")}
`;

  const raw =
    await requestStructuredJson(
      system,
      user,
    );

  const parsed =
    editResponseSchema.safeParse(
      raw,
    );

  if (!parsed.success) {
    throw new Error(
      "Kodarai could not produce a valid edit. Please try again.",
    );
  }

  const changes:
    StudioFileChange[] =
      parsed.data.changes.map(
        (change) => ({
          ...change,
          language:
            undefined,
        }),
      );

  for (
    const change of changes
  ) {
    if (
      !isSafeStudioPath(
        change.path,
      ) ||
      !input.files.some(
        (file) =>
          file.path ===
          change.path,
      )
    ) {
      throw new Error(
        "Kodarai proposed an unsafe project change.",
      );
    }

    if (
      change.action !==
        "delete" &&
      typeof change.content !==
        "string"
    ) {
      throw new Error(
        "Kodarai returned an incomplete file edit.",
      );
    }
  }

  return {
    summary:
      parsed.data.summary,

    changes,
  };
}
