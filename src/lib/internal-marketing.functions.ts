import { timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateJsonWithConfiguredAi } from "@/lib/content.functions";
import {
  getPlanActivationMetrics,
  sendPlanActivationCampaign,
} from "@/lib/plan-activation.server";

const platformSchema = z.enum(["linkedin", "x", "facebook", "threads", "pinterest", "instagram"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

type MarketingPlatform = z.infer<typeof platformSchema>;

const accessSchema = z.object({
  passcode: z.string().min(1).max(256),
});

const generateSchema = accessSchema.extend({
  platform: platformSchema,
  topic: z.string().trim().max(800).optional().default(""),
  tone: z.string().trim().max(120).optional().default("confident, direct, benefit-led, no corporate fluff"),
});

const uploadSchema = accessSchema.extend({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  contentBase64: z.string().min(1).max(Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64),
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

function matchesPasscode(candidate: string) {
  const expected = process.env.INTERNAL_MARKETING_PASSCODE;
  if (!expected) return false;
  const expectedValue = Buffer.from(expected);
  const candidateValue = Buffer.from(candidate);
  return expectedValue.length === candidateValue.length && timingSafeEqual(expectedValue, candidateValue);
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

async function requireMarketingAccess(userId: string, passcode: string) {
  const [founder] = await Promise.all([isFounder(userId)]);
  if (!founder || !matchesPasscode(passcode)) {
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
  const topic = input.topic || "KodarAI helps freelancers and agencies find local businesses without websites, build a website quickly, and turn outreach into paid work.";
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
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
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
    return asset.origin === supabase.origin && asset.pathname.startsWith("/storage/v1/object/public/marketing-assets/");
  } catch {
    return false;
  }
}

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
        return { error: "generation_error", message: "The AI returned an invalid draft set. Please try again." } as const;
      }
      return { drafts: parsed.data.drafts, provider: ai.provider, model: ai.model } as const;
    } catch (error) {
      console.error("Internal marketing generation failed:", error);
      return { error: "generation_error", message: "Could not generate drafts right now. Please try again." } as const;
    }
  });

export const uploadMarketingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    try {
      const bytes = Buffer.from(data.contentBase64, "base64");
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return { error: "upload_error", message: "Image must be 10 MB or smaller." } as const;

      const extension = data.contentType.split("/")[1] === "jpeg" ? "jpg" : data.contentType.split("/")[1];
      const path = `${context.userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabaseAdmin.storage.from("marketing-assets").upload(path, bytes, {
        contentType: data.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        console.error("Marketing asset upload failed:", error.message);
        return { error: "upload_error", message: "Could not upload the image. Make sure the marketing-assets bucket migration has been applied." } as const;
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
      console.error("Buffer configuration is incomplete.", { platform: data.platform, hasApiKey: Boolean(apiKey), hasChannelId: Boolean(channelId) });
      return { error: "buffer_error", message: "Buffer is not configured for this platform." } as const;
    }
    if ((data.platform === "pinterest" || data.platform === "instagram") && !data.assetUrl) {
      return { error: "buffer_error", message: `${data.platform === "instagram" ? "Instagram" : "Pinterest"} posts require an image.` } as const;
    }
    if (data.assetUrl && !isMarketingAssetUrl(data.assetUrl)) {
      return { error: "buffer_error", message: "The image must be uploaded through this tool." } as const;
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
        return { error: "buffer_error", message: "Buffer API key invalid or rate-limited." } as const;
      }
      if (!response.ok) {
        console.error("Buffer API error:", response.status, await response.text().catch(() => ""));
        return { error: "buffer_error", message: "Buffer could not queue this post. Please try again." } as const;
      }
      const payload = await response.json() as {
        errors?: { message?: string }[];
        data?: { createPost?: { message?: string; post?: { id: string; text: string; dueAt: string | null } } };
      };
      const result = payload.data?.createPost;
      if (payload.errors?.length || result?.message || !result?.post) {
        console.error("Buffer GraphQL mutation error:", payload.errors ?? result?.message);
        return { error: "buffer_error", message: result?.message || "Buffer could not queue this post." } as const;
      }
      return { post: result.post, status: "queued" as const };
    } catch (error) {
      console.error("Buffer request failed:", error);
      return { error: "buffer_error", message: "Could not reach Buffer. Please try again." } as const;
    }
  });
