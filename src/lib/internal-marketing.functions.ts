import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateJsonWithConfiguredAi } from "@/lib/content.functions";
import { getPlanActivationMetrics, sendPlanActivationCampaign } from "@/lib/plan-activation.server";

const platformSchema = z.enum(["linkedin", "x", "facebook", "threads", "pinterest", "instagram"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

type MarketingPlatform = z.infer<typeof platformSchema>;

const accessSchema = z.object({
  passcode: z.string().min(1).max(256),
});

const adsenseSettingsSchema = accessSchema.extend({
  enabled: z.boolean(),
  adCode: z.string().trim().max(10_000).default(""),
});

const googleAnalyticsSettingsSchema = accessSchema.extend({
  measurementCode: z.string().trim().max(10_000).default(""),
});

const metaPixelSettingsSchema = accessSchema.extend({
  pixelCode: z.string().trim().max(10_000).default(""),
});

const clarityProjectSettingsSchema = accessSchema.extend({
  clarityCode: z.string().trim().max(10_000).default(""),
});

const visitorDimensionSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._ -]+$/);
const visitorSessionSchema = z.object({
  visitorId: z.string().uuid(),
  source: visitorDimensionSchema.max(80),
  medium: visitorDimensionSchema.max(80).optional(),
  campaign: visitorDimensionSchema.optional(),
  landingPath: z.string().max(500).regex(/^\//),
});

const generateSchema = accessSchema.extend({
  platform: platformSchema,
  topic: z.string().trim().max(800).optional().default(""),
  tone: z
    .string()
    .trim()
    .max(120)
    .optional()
    .default("confident, direct, benefit-led, no corporate fluff"),
});

const uploadSchema = accessSchema.extend({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  contentBase64: z
    .string()
    .min(1)
    .max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64),
});

const pushSchema = accessSchema.extend({
  platform: platformSchema,
  text: z.string().trim().min(1).max(3_000),
  assetUrl: z.string().url().max(2_000).optional(),
  mode: z.literal("addToQueue").default("addToQueue"),
});

const draftResponseSchema = z.object({
  drafts: z.array(z.string().trim().min(1).max(3_000)).min(2).max(3),
});

async function matchesPasscode(candidate: string) {
  const expected = process.env.INTERNAL_MARKETING_PASSCODE;
  if (!expected) return false;
  const encoder = new TextEncoder();
  const expectedValue = encoder.encode(expected);
  const candidateValue = encoder.encode(candidate);
  if (expectedValue.length !== candidateValue.length) return false;
  const [expectedHash, candidateHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", expectedValue),
    crypto.subtle.digest("SHA-256", candidateValue),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const candidateBytes = new Uint8Array(candidateHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1)
    difference |= expectedBytes[index] ^ candidateBytes[index];
  return difference === 0;
}

async function isFounder(userId: string) {
  const founderEmail = process.env.SUPPORT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!founderEmail) return false;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    console.error("Unable to verify internal marketing administrator:", error.message);
    return false;
  }
  return data.user?.email?.trim().toLowerCase() === founderEmail;
}

export async function requireMarketingAccess(userId: string, passcode: string) {
  const [founder] = await Promise.all([isFounder(userId)]);
  if (!founder || !(await matchesPasscode(passcode))) {
    console.warn("Denied internal marketing access.", { userId, founder });
    throw new Error("NOT_FOUND");
  }
}

function platformInstructions(platform: MarketingPlatform) {
  switch (platform) {
    case "linkedin":
      return "Write a slightly longer post: a strong hook line, short body, and soft CTA. Keep it useful and credible.";
    case "x":
      return "Write a punchy post under 280 characters. Do not use hashtag spam.";
    case "facebook":
      return "Write a conversational, slightly longer post that works for a Facebook Page or community. Keep it natural and useful.";
    case "threads":
      return "Write a short, conversational and lightly opinionated post. Keep it concise and do not use hashtag spam.";
    case "pinterest":
      return "Write a short, keyword-rich description for a visual Pinterest Pin, not a standalone social post. Make the benefit clear.";
    case "instagram":
      return "Write a concise, engaging Instagram caption for a visual post. Lead with a hook, use natural line breaks, and add only a few relevant hashtags when they add value.";
  }
}

function buildMarketingPrompt(input: z.infer<typeof generateSchema>) {
  const topic =
    input.topic ||
    "KodarAI helps freelancers and agencies find local businesses without websites, build a website quickly, and turn outreach into paid work.";
  return `You write marketing copy for KodarAI. KodarAI helps freelancers and agencies find local businesses without websites, build a website quickly, and turn outreach into paid work.

Create exactly 3 distinct ${input.platform} post drafts about this angle: ${topic}
Tone: ${input.tone}

${platformInstructions(input.platform)}

Guardrails:
- Be specific, benefit-led, and believable. Do not invent statistics, testimonials, partnerships, features, or results.
- Avoid corporate filler, excessive emoji, markdown, and generic AI phrases.
- Return plain-text copy only in each draft. Do not label or number the drafts.
- Return ONLY valid JSON in this exact shape: {"drafts":["first draft","second draft","third draft"]}`;
}

function cleanJson(raw: string) {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function bufferChannelId(platform: MarketingPlatform) {
  const ids: Record<MarketingPlatform, string | undefined> = {
    linkedin: process.env.BUFFER_LINKEDIN_CHANNEL_ID,
    x: process.env.BUFFER_X_CHANNEL_ID,
    facebook: process.env.BUFFER_FACEBOOK_CHANNEL_ID,
    threads: process.env.BUFFER_THREADS_CHANNEL_ID,
    pinterest: process.env.BUFFER_PINTEREST_CHANNEL_ID,
    instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID,
  };
  return ids[platform]?.trim();
}

function isMarketingAssetUrl(value: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const asset = new URL(value);
    const supabase = new URL(supabaseUrl);
    return (
      asset.origin === supabase.origin &&
      asset.pathname.startsWith("/storage/v1/object/public/marketing-assets/")
    );
  } catch {
    return false;
  }
}

type AdSenseSettingsRow = {
  is_enabled: boolean;
  publisher_id: string | null;
  landing_ad_slot: string | null;
  google_analytics_measurement_id: string | null;
  meta_pixel_id: string | null;
  clarity_project_id: string | null;
};

function parseAdSenseCode(adCode: string) {
  const code = adCode.trim();
  if (!/https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(code)) {
    return { error: "Paste the Google AdSense code from your AdSense account." } as const;
  }

  const publisherId = code.match(/ca-pub-[0-9]{10,20}/i)?.[0];
  if (!publisherId)
    return { error: "The AdSense publisher ID was not found in that code." } as const;

  const landingAdSlot = code.match(/data-ad-slot\s*=\s*["']?([0-9]{6,20})/i)?.[1] ?? null;
  return { publisherId, landingAdSlot } as const;
}

function displayAdSenseCode(settings: AdSenseSettingsRow | null) {
  if (!settings?.publisher_id) return "";
  const unit = settings.landing_ad_slot
    ? `\n<ins class="adsbygoogle" style="display:block" data-ad-client="${settings.publisher_id}" data-ad-slot="${settings.landing_ad_slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
    : "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.publisher_id}" crossorigin="anonymous"></script>${unit}`;
}

async function readAdSenseSettings() {
  // Supabase types are generated separately; this new migration is not represented yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("marketing_adsense_settings")
    .select("is_enabled, publisher_id, landing_ad_slot, google_analytics_measurement_id, meta_pixel_id, clarity_project_id")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw new Error("Could not read AdSense settings.");
  return data as AdSenseSettingsRow | null;
}

export const getPublicAdSenseSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const settings = await readAdSenseSettings();
    if (!settings?.is_enabled || !settings.publisher_id) return { enabled: false } as const;
    return {
      enabled: true,
      publisherId: settings.publisher_id,
      landingAdSlot: settings.landing_ad_slot,
    } as const;
  } catch {
    return { enabled: false } as const;
  }
});

function parseGoogleAnalyticsMeasurementId(measurementCode: string) {
  const measurementId = measurementCode
    .trim()
    .match(/G-[A-Z0-9]{6,20}/i)?.[0]
    ?.toUpperCase();
  if (!measurementId)
    return {
      error: "Paste a Google Analytics measurement ID or the official Google tag code.",
    } as const;
  return { measurementId } as const;
}

export const getPublicGoogleAnalyticsSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const settings = await readAdSenseSettings();
      return { measurementId: settings?.google_analytics_measurement_id ?? null } as const;
    } catch {
      return { measurementId: null } as const;
    }
  },
);

function parseMetaPixelId(pixelCode: string) {
  const code = pixelCode.trim();
  const pixelId = /^[0-9]{10,20}$/.test(code)
    ? code
    : code.match(/fbq\(\s*['"]init['"]\s*,\s*['"]?([0-9]{10,20})/i)?.[1];
  if (!pixelId)
    return {
      error: "Paste your Meta Pixel ID (numbers only) or the official Meta Pixel code.",
    } as const;
  return { pixelId } as const;
}

export const getPublicMetaPixelSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const settings = await readAdSenseSettings();
    return { pixelId: settings?.meta_pixel_id ?? null } as const;
  } catch {
    return { pixelId: null } as const;
  }
});

function parseClarityProjectId(clarityCode: string) {
  const code = clarityCode.trim();
  const projectId = /^[a-z0-9]{6,20}$/.test(code)
    ? code
    : (code.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]{6,20})["']/i)?.[1] ??
      code.match(/clarity\.ms\/tag\/([a-z0-9]{6,20})/i)?.[1]
    )?.toLowerCase();
  if (!projectId)
    return {
      error: "Paste your Clarity project ID or the Clarity install code.",
    } as const;
  return { projectId } as const;
}

export const getPublicClaritySettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const settings = await readAdSenseSettings();
    return { projectId: settings?.clarity_project_id ?? null } as const;
  } catch {
    return { projectId: null } as const;
  }
});

async function hashVisitorId(visitorId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitorId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const recordMarketingVisitorSession = createServerFn({ method: "POST" })
  .inputValidator((data) => visitorSessionSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      // Supabase types are generated separately; this new migration is not represented yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin as any).from("marketing_visitor_sessions").upsert(
        {
          visitor_hash: await hashVisitorId(data.visitorId),
          source: data.source.toLowerCase(),
          medium: data.medium?.toLowerCase() ?? null,
          campaign: data.campaign ?? null,
          landing_path: data.landingPath,
        },
        { onConflict: "visitor_hash,visit_date", ignoreDuplicates: true },
      );
      if (error) console.warn("Could not record anonymous visitor session:", error.message);
    } catch {
      // Visitor reporting is optional and must never affect a public page.
    }
    return { recorded: true } as const;
  });

export const getMarketingVisitorDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 29);
    const from = startDate.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    // Supabase types are generated separately; this new migration is not represented yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("marketing_visitor_sessions")
      .select("visit_date, source, medium")
      .gte("visit_date", from)
      .limit(50_000);
    if (error)
      throw new Error("Could not load visitor reporting. Apply the analytics migration first.");

    const visitors = (rows ?? []) as {
      visit_date: string;
      source: string;
      medium: string | null;
    }[];
    const grouped = new Map<string, { source: string; medium: string | null; visitors: number }>();
    for (const visitor of visitors) {
      const key = `${visitor.source}\u0000${visitor.medium ?? ""}`;
      const current = grouped.get(key) ?? {
        source: visitor.source,
        medium: visitor.medium,
        visitors: 0,
      };
      current.visitors += 1;
      grouped.set(key, current);
    }

    const settings = await readAdSenseSettings();
    return {
      visitorsToday: visitors.filter((visitor) => visitor.visit_date === today).length,
      visitorsLast30Days: visitors.length,
      sources: [...grouped.values()]
        .sort((left, right) => right.visitors - left.visitors)
        .slice(0, 8),
      googleAnalyticsMeasurementId: settings?.google_analytics_measurement_id ?? null,
      metaPixelId: settings?.meta_pixel_id ?? null,
      clarityProjectId: settings?.clarity_project_id ?? null,
    } as const;
  });

export const saveMarketingGoogleAnalyticsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => googleAnalyticsSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const parsed = parseGoogleAnalyticsMeasurementId(data.measurementCode);
    if ("error" in parsed) return { error: "analytics_error", message: parsed.error } as const;

    // Supabase types are generated separately; this new migration is not represented yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("marketing_adsense_settings").upsert(
      {
        singleton: true,
        google_analytics_measurement_id: parsed.measurementId,
        updated_by: context.userId,
      },
      { onConflict: "singleton" },
    );
    if (error)
      return {
        error: "analytics_error",
        message: "Could not save Google Analytics. Apply the analytics migration first.",
      } as const;
    return { measurementId: parsed.measurementId } as const;
  });

export const saveMarketingMetaPixelSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => metaPixelSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const parsed = parseMetaPixelId(data.pixelCode);
    if ("error" in parsed) return { error: "pixel_error", message: parsed.error } as const;

    // Supabase types are generated separately; this new migration is not represented yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("marketing_adsense_settings").upsert(
      {
        singleton: true,
        meta_pixel_id: parsed.pixelId,
        updated_by: context.userId,
      },
      { onConflict: "singleton" },
    );
    if (error)
      return {
        error: "pixel_error",
        message: "Could not save the Meta Pixel. Apply the meta pixel migration first.",
      } as const;
    return { pixelId: parsed.pixelId } as const;
  });

export const saveMarketingClaritySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => clarityProjectSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const parsed = parseClarityProjectId(data.clarityCode);
    if ("error" in parsed) return { error: "clarity_error", message: parsed.error } as const;

    // Supabase types are generated separately; this new migration is not represented yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("marketing_adsense_settings").upsert(
      {
        singleton: true,
        clarity_project_id: parsed.projectId,
        updated_by: context.userId,
      },
      { onConflict: "singleton" },
    );
    if (error)
      return {
        error: "clarity_error",
        message: "Could not save Clarity. Apply the Clarity migration first.",
      } as const;
    return { projectId: parsed.projectId } as const;
  });

export const getMarketingAdSenseSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const settings = await readAdSenseSettings();
    return {
      enabled: settings?.is_enabled ?? false,
      adCode: displayAdSenseCode(settings),
      hasLandingAdUnit: Boolean(settings?.landing_ad_slot),
    } as const;
  });

export const saveMarketingAdSenseSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => adsenseSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);

    const parsed = parseAdSenseCode(data.adCode);
    if ("error" in parsed) return { error: "adsense_error", message: parsed.error } as const;

    // Supabase types are generated separately; this new migration is not represented yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("marketing_adsense_settings").upsert(
      {
        singleton: true,
        is_enabled: data.enabled,
        publisher_id: parsed.publisherId,
        landing_ad_slot: parsed.landingAdSlot,
        updated_by: context.userId,
      },
      { onConflict: "singleton" },
    );
    if (error) {
      console.error("Could not save AdSense settings:", error.message);
      return {
        error: "adsense_error",
        message: "Could not save AdSense settings. Apply the AdSense migration first.",
      } as const;
    }

    return {
      enabled: data.enabled,
      hasLandingAdUnit: Boolean(parsed.landingAdSlot),
    } as const;
  });

export const verifyMarketingAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    return { authorized: true } as const;
  });

export const getPlanActivationDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    return getPlanActivationMetrics();
  });

export const runPlanActivationEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    return sendPlanActivationCampaign();
  });

export const generateMarketingPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => generateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    try {
      const ai = await generateJsonWithConfiguredAi(buildMarketingPrompt(data), data.tone);
      const parsed = draftResponseSchema.safeParse(JSON.parse(cleanJson(ai.raw)));
      if (!parsed.success) {
        console.error("Invalid internal marketing AI response:", parsed.error.flatten());
        return {
          error: "generation_error",
          message: "The AI returned an invalid draft set. Please try again.",
        } as const;
      }
      return { drafts: parsed.data.drafts, provider: ai.provider, model: ai.model } as const;
    } catch (error) {
      console.error("Internal marketing generation failed:", error);
      return {
        error: "generation_error",
        message: "Could not generate drafts right now. Please try again.",
      } as const;
    }
  });

export const uploadMarketingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    try {
      const bytes = Buffer.from(data.contentBase64, "base64");
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
        return { error: "upload_error", message: "Image must be 10 MB or smaller." } as const;

      const extension =
        data.contentType.split("/")[1] === "jpeg" ? "jpg" : data.contentType.split("/")[1];
      const path = `${context.userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabaseAdmin.storage.from("marketing-assets").upload(path, bytes, {
        contentType: data.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        console.error("Marketing asset upload failed:", error.message);
        return {
          error: "upload_error",
          message:
            "Could not upload the image. Make sure the marketing-assets bucket migration has been applied.",
        } as const;
      }
      const { data: publicUrl } = supabaseAdmin.storage.from("marketing-assets").getPublicUrl(path);
      return { publicUrl: publicUrl.publicUrl } as const;
    } catch (error) {
      console.error("Marketing asset upload failed:", error);
      return { error: "upload_error", message: "Could not upload the image." } as const;
    }
  });

export const pushToBuffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => pushSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const apiKey = process.env.BUFFER_API_KEY?.trim();
    const channelId = bufferChannelId(data.platform);
    if (!apiKey || !channelId) {
      console.error("Buffer configuration is incomplete.", {
        platform: data.platform,
        hasApiKey: Boolean(apiKey),
        hasChannelId: Boolean(channelId),
      });
      return {
        error: "buffer_error",
        message: "Buffer is not configured for this platform.",
      } as const;
    }
    if ((data.platform === "pinterest" || data.platform === "instagram") && !data.assetUrl) {
      return {
        error: "buffer_error",
        message: `${data.platform === "instagram" ? "Instagram" : "Pinterest"} posts require an image.`,
      } as const;
    }
    if (data.assetUrl && !isMarketingAssetUrl(data.assetUrl)) {
      return {
        error: "buffer_error",
        message: "The image must be uploaded through this tool.",
      } as const;
    }

    const query = `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text dueAt } }
        ... on MutationError { message }
      }
    }`;
    const input = {
      text: data.text,
      channelId,
      schedulingType: "automatic",
      mode: data.mode,
      ...(data.assetUrl ? { assets: [{ image: { url: data.assetUrl } }] } : {}),
    };

    try {
      const response = await fetch("https://api.buffer.com", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { input } }),
      });
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        console.error("Buffer authorization or rate-limit error:", response.status);
        return {
          error: "buffer_error",
          message: "Buffer API key invalid or rate-limited.",
        } as const;
      }
      if (!response.ok) {
        console.error("Buffer API error:", response.status, await response.text().catch(() => ""));
        return {
          error: "buffer_error",
          message: "Buffer could not queue this post. Please try again.",
        } as const;
      }
      const payload = (await response.json()) as {
        errors?: { message?: string }[];
        data?: {
          createPost?: {
            message?: string;
            post?: { id: string; text: string; dueAt: string | null };
          };
        };
      };
      const result = payload.data?.createPost;
      if (payload.errors?.length || result?.message || !result?.post) {
        console.error("Buffer GraphQL mutation error:", payload.errors ?? result?.message);
        return {
          error: "buffer_error",
          message: result?.message || "Buffer could not queue this post.",
        } as const;
      }
      return { post: result.post, status: "queued" as const };
    } catch (error) {
      console.error("Buffer request failed:", error);
      return {
        error: "buffer_error",
        message: "Could not reach Buffer. Please try again.",
      } as const;
    }
  });
