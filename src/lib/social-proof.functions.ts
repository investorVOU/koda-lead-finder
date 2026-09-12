import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireMarketingAccess } from "@/lib/internal-marketing.functions";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const accessSchema = z.object({ passcode: z.string().min(1).max(256) });
const optionalText = (limit: number) =>
  z
    .string()
    .trim()
    .max(limit)
    .optional()
    .transform((value) => value || null);
const optionalPath = optionalText(500);

const reviewInput = accessSchema.extend({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  role: optionalText(160),
  location: optionalText(120),
  photoPath: optionalPath,
  reviewText: z.string().trim().min(1).max(2_000),
  rating: z.number().int().min(1).max(5),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  displayOrder: z.number().int().min(-10_000).max(10_000),
});

const proofInput = accessSchema.extend({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  location: optionalText(120),
  avatarPath: optionalPath,
  headline: z.string().trim().min(1).max(180),
  description: optionalText(1_000),
  proofImagePath: z.string().trim().min(1).max(500),
  secondaryImagePath: optionalPath,
  proofAlt: optionalText(250),
  resultType: z.enum([
    "client_won",
    "payment_received",
    "website_sold",
    "positive_reply",
    "recurring_client",
    "other",
  ]),
  resultAmount: z.number().nonnegative().max(999_999_999).nullable(),
  currency: optionalText(12),
  quote: optionalText(1_000),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  displayOrder: z.number().int().min(-10_000).max(10_000),
});

const updateStateSchema = accessSchema.extend({
  kind: z.enum(["review", "proof"]),
  id: z.string().uuid(),
  field: z.enum(["isPublished", "isFeatured"]),
  value: z.boolean(),
});

const deleteSchema = accessSchema.extend({
  kind: z.enum(["review", "proof"]),
  id: z.string().uuid(),
});

const uploadSchema = accessSchema.extend({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(imageTypes),
  contentBase64: z
    .string()
    .min(1)
    .max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64),
  kind: z.enum(["review-photo", "proof-image", "proof-secondary", "proof-avatar"]),
});

export type PublicMarketingReview = {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
  photoUrl: string | null;
  reviewText: string;
  rating: number;
  isFeatured: boolean;
};

export type PublicMarketingProof = {
  id: string;
  name: string;
  location: string | null;
  avatarUrl: string | null;
  headline: string;
  description: string | null;
  proofImageUrl: string | null;
  secondaryImageUrl: string | null;
  proofAlt: string | null;
  resultType:
    | "client_won"
    | "payment_received"
    | "website_sold"
    | "positive_reply"
    | "recurring_client"
    | "other";
  resultAmount: number | null;
  currency: string | null;
  quote: string | null;
  isFeatured: boolean;
};

type StoredReview = {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
  photo_path: string | null;
  review_text: string;
  rating: number;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
type StoredProof = {
  id: string;
  name: string;
  location: string | null;
  avatar_path: string | null;
  headline: string;
  description: string | null;
  proof_image_path: string;
  secondary_image_path: string | null;
  proof_alt: string | null;
  result_type: PublicMarketingProof["resultType"];
  result_amount: number | null;
  currency: string | null;
  quote: string | null;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const signPath = async (path: string | null) => {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from("social-proof")
    .createSignedUrl(path, 60 * 30);
  if (error) {
    console.error("Could not sign social proof asset:", error.message);
    return null;
  }
  return data.signedUrl;
};

const publicReview = async (row: StoredReview): Promise<PublicMarketingReview> => ({
  id: row.id,
  name: row.name,
  role: row.role,
  location: row.location,
  photoUrl: await signPath(row.photo_path),
  reviewText: row.review_text,
  rating: row.rating,
  isFeatured: row.is_featured,
});

const publicProof = async (row: StoredProof): Promise<PublicMarketingProof> => ({
  id: row.id,
  name: row.name,
  location: row.location,
  avatarUrl: await signPath(row.avatar_path),
  headline: row.headline,
  description: row.description,
  proofImageUrl: await signPath(row.proof_image_path),
  secondaryImageUrl: await signPath(row.secondary_image_path),
  proofAlt: row.proof_alt,
  resultType: row.result_type,
  resultAmount: row.result_amount,
  currency: row.currency,
  quote: row.quote,
  isFeatured: row.is_featured,
});

export const getPublishedSocialProof = createServerFn({ method: "GET" }).handler(async () => {
  const [reviewsResult, proofsResult] = await Promise.all([
    supabaseAdmin
      .from("marketing_reviews")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("display_order")
      .order("created_at", { ascending: false })
      .limit(18),
    supabaseAdmin
      .from("marketing_proofs")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("display_order")
      .order("created_at", { ascending: false })
      .limit(18),
  ]);
  if (reviewsResult.error)
    console.error("Could not load published marketing reviews:", reviewsResult.error.message);
  if (proofsResult.error)
    console.error("Could not load published marketing proofs:", proofsResult.error.message);
  return {
    reviews: await Promise.all(((reviewsResult.data ?? []) as StoredReview[]).map(publicReview)),
    proofs: await Promise.all(((proofsResult.data ?? []) as StoredProof[]).map(publicProof)),
  };
});

export const listMarketingSocialProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => accessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const [reviewsResult, proofsResult] = await Promise.all([
      supabaseAdmin
        .from("marketing_reviews")
        .select("*")
        .order("display_order")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("marketing_proofs")
        .select("*")
        .order("display_order")
        .order("created_at", { ascending: false }),
    ]);
    if (reviewsResult.error) throw new Error("Could not load reviews.");
    if (proofsResult.error) throw new Error("Could not load proof of work.");
    return {
      reviews: await Promise.all(
        ((reviewsResult.data ?? []) as StoredReview[]).map(async (row) => ({
          ...row,
          photoUrl: await signPath(row.photo_path),
        })),
      ),
      proofs: await Promise.all(
        ((proofsResult.data ?? []) as StoredProof[]).map(async (row) => ({
          ...row,
          avatarUrl: await signPath(row.avatar_path),
          proofImageUrl: await signPath(row.proof_image_path),
          secondaryImageUrl: await signPath(row.secondary_image_path),
        })),
      ),
    };
  });

export const saveMarketingReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => reviewInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const values = {
      name: data.name,
      role: data.role,
      location: data.location,
      photo_path: data.photoPath,
      review_text: data.reviewText,
      rating: data.rating,
      is_published: data.isPublished,
      is_featured: data.isFeatured,
      display_order: data.displayOrder,
    };
    const query = data.id
      ? supabaseAdmin.from("marketing_reviews").update(values).eq("id", data.id)
      : supabaseAdmin.from("marketing_reviews").insert(values);
    const { error } = await query;
    if (error) throw new Error("Could not save review.");
    return { ok: true } as const;
  });

export const saveMarketingProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => proofInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const values = {
      name: data.name,
      location: data.location,
      avatar_path: data.avatarPath,
      headline: data.headline,
      description: data.description,
      proof_image_path: data.proofImagePath,
      secondary_image_path: data.secondaryImagePath,
      proof_alt: data.proofAlt,
      result_type: data.resultType,
      result_amount: data.resultAmount,
      currency: data.currency,
      quote: data.quote,
      is_published: data.isPublished,
      is_featured: data.isFeatured,
      display_order: data.displayOrder,
    };
    const query = data.id
      ? supabaseAdmin.from("marketing_proofs").update(values).eq("id", data.id)
      : supabaseAdmin.from("marketing_proofs").insert(values);
    const { error } = await query;
    if (error) throw new Error("Could not save proof of work.");
    return { ok: true } as const;
  });

export const updateMarketingSocialProofState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateStateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const table = data.kind === "review" ? "marketing_reviews" : "marketing_proofs";
    const column = data.field === "isPublished" ? "is_published" : "is_featured";
    const { error } = await supabaseAdmin
      .from(table)
      .update({ [column]: data.value })
      .eq("id", data.id);
    if (error) throw new Error("Could not update item.");
    return { ok: true } as const;
  });

export const deleteMarketingSocialProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => deleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const table = data.kind === "review" ? "marketing_reviews" : "marketing_proofs";
    const fields =
      data.kind === "review" ? "photo_path" : "avatar_path, proof_image_path, secondary_image_path";
    const { data: row, error: findError } = await (supabaseAdmin as any)
      .from(table)
      .select(fields)
      .eq("id", data.id)
      .single();
    if (findError) throw new Error("Could not find item.");
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error("Could not delete item.");
    const paths =
      data.kind === "review"
        ? ([row.photo_path].filter(Boolean) as string[])
        : ([row.avatar_path, row.proof_image_path, row.secondary_image_path].filter(
            Boolean,
          ) as string[]);
    if (paths.length) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("social-proof")
        .remove(paths);
      if (storageError)
        console.error("Could not remove deleted social proof assets:", storageError.message);
    }
    return { ok: true } as const;
  });

export const uploadSocialProofAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireMarketingAccess(context.userId, data.passcode);
    const bytes = Buffer.from(data.contentBase64, "base64");
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
      throw new Error("Image must be 10 MB or smaller.");
    const extension =
      data.contentType.split("/")[1] === "jpeg" ? "jpg" : data.contentType.split("/")[1];
    const path = `${context.userId}/${data.kind}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from("social-proof")
      .upload(path, bytes, {
        contentType: data.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error)
      throw new Error(
        "Could not upload image. Make sure the social-proof migration has been applied.",
      );
    return { path, signedUrl: await signPath(path) };
  });
