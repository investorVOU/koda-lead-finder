import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPaidSubscription } from "@/lib/subscription.server";
import {
  applyStudioFileChanges,
  normalizeStudioFiles,
  parseStudioFiles,
  serializeStudioFiles,
  type StudioFile,
} from "@/lib/studio-files";
import {
  buildBusinessWebsiteFiles,
  type BusinessWebsiteInput,
} from "@/lib/website-templates";
import { generateBusinessWebsiteSpec, generateWebsiteEdit } from "@/lib/website-builder.server";
import { createVercelProject, deployToVercel, getVercelDeployment, publicVercelUrl, waitForVercelDeployment } from "@/lib/vercel.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StudioProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template: string;
  files_json: string;
  deployment_url: string | null;
  status: "draft" | "generating" | "ready" | "publishing" | "published" | "failed";
  lead_id?: string | null;
  slug?: string | null;
  business_name?: string | null;
  business_category?: string | null;
  business_details_json?: string;
  theme_json?: string;
  generation_status?: "idle" | "generating" | "ready" | "failed";
  vercel_project_id?: string | null;
  vercel_project_name?: string | null;
  vercel_deployment_id?: string | null;
  vercel_url?: string | null;
  deployment_status?: string;
  deployment_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant";
  content: string;
  file_changes: string | null;
  created_at: string;
}

export interface StudioSnapshot {
  id: string;
  project_id: string;
  label: string;
  files_json: string;
  files_count: number;
  created_at: string;
}

// ── Projects ───────────────────────────────────────────────────────────────────

export const listStudioProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db
      .from("studio_projects")
      .select("id,name,description,template,status,deployment_url,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) return { error: error.message, projects: [] as StudioProject[] } as const;
    return { projects: (data ?? []) as StudioProject[] } as const;
  });

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  template: z.string().max(50).default("blank"),
  initial_prompt: z.string().max(8000).optional(),
});

export const createStudioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createProjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to use Studio." } as const;
    }

    const { data: project, error } = await db
      .from("studio_projects")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        template: data.template,
        files_json: "{}",
      })
      .select("*")
      .single();
    if (error) return { error: error.message } as const;
    return { project: project as StudioProject } as const;
  });

const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  files_json: z.string().optional(),
  deployment_url: z.string().url().nullable().optional(),
  status: z.enum(["draft", "generating", "ready", "publishing", "published", "failed"]).optional(),
});

export const updateStudioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateProjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await db
      .from("studio_projects")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });

export const deleteStudioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await db
      .from("studio_projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });

export const getStudioProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project, error } = await db
      .from("studio_projects")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) return { error: error.message } as const;
    return { project: project as StudioProject } as const;
  });

// ── Messages ───────────────────────────────────────────────────────────────────

export const listStudioMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership first
    const { data: proj } = await db
      .from("studio_projects")
      .select("id")
      .eq("id", data.project_id)
      .eq("user_id", context.userId)
      .single();
    if (!proj) return { error: "Not found", messages: [] as StudioMessage[] } as const;

    const { data: messages, error } = await db
      .from("studio_messages")
      .select("*")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: true });
    if (error) return { error: error.message, messages: [] as StudioMessage[] } as const;
    return { messages: (messages ?? []) as StudioMessage[] } as const;
  });

const createMessageSchema = z.object({
  project_id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  file_changes: z.string().nullable().optional(),
});

export const createStudioMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createMessageSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: proj } = await db
      .from("studio_projects")
      .select("id")
      .eq("id", data.project_id)
      .eq("user_id", context.userId)
      .single();
    if (!proj) return { error: "Not found" } as const;

    const { data: msg, error } = await db
      .from("studio_messages")
      .insert({
        project_id: data.project_id,
        role: data.role,
        content: data.content,
        file_changes: data.file_changes ?? null,
      })
      .select("*")
      .single();
    if (error) return { error: error.message } as const;
    return { message: msg as StudioMessage } as const;
  });

// ── Snapshots ──────────────────────────────────────────────────────────────────

export const listStudioSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: proj } = await db
      .from("studio_projects")
      .select("id")
      .eq("id", data.project_id)
      .eq("user_id", context.userId)
      .single();
    if (!proj) return { error: "Not found", snapshots: [] as StudioSnapshot[] } as const;

    const { data: snaps, error } = await db
      .from("studio_snapshots")
      .select("*")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { error: error.message, snapshots: [] as StudioSnapshot[] } as const;
    return { snapshots: (snaps ?? []) as StudioSnapshot[] } as const;
  });

const createSnapshotSchema = z.object({
  project_id: z.string().uuid(),
  label: z.string().min(1).max(200),
  files_json: z.string(),
  files_count: z.number().int().min(0),
});

export const createStudioSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSnapshotSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: proj } = await db
      .from("studio_projects")
      .select("id")
      .eq("id", data.project_id)
      .eq("user_id", context.userId)
      .single();
    if (!proj) return { error: "Not found" } as const;

    const { error } = await db.from("studio_snapshots").insert({
      project_id: data.project_id,
      label: data.label,
      files_json: data.files_json,
      files_count: data.files_count,
    });
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });

// ── Usage helpers ──────────────────────────────────────────────────────────────

export const getStudioUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Count user's projects
    const { count: projectCount } = await db
      .from("studio_projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);

    // Count messages sent this month (via project join)
    const { data: userProjects } = await db
      .from("studio_projects")
      .select("id")
      .eq("user_id", context.userId);
    const ids = (userProjects ?? []).map((p: { id: string }) => p.id);

    let messagesThisMonth = 0;
    if (ids.length > 0) {
      const { count } = await db
        .from("studio_messages")
        .select("id", { count: "exact", head: true })
        .in("project_id", ids)
        .eq("role", "user")
        .gte("created_at", monthStart);
      messagesThisMonth = count ?? 0;
    }

    // Plan limit
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", context.userId)
      .maybeSingle();

    const active = ["active", "canceling"].includes(
      (sub as { status?: string } | null)?.status ?? "",
    );
    const LIMITS: Record<string, number> = { starter: 50, pro: 200, agency: 9999 };
    const limit = active
      ? (LIMITS[(sub as { plan?: string } | null)?.plan ?? ""] ?? 0)
      : 0;

    return {
      projectCount: projectCount ?? 0,
      messagesThisMonth,
      messagesLimit: limit,
    } as const;
  });

// â”€â”€ Business website builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const websiteLeadSchema = z.object({
  placeId: z.string().max(300).optional().nullable(),
  name: z.string().min(1).max(160),
  category: z.string().max(100).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).max(10_000_000).optional().default(0),
  hasWebsite: z.boolean().optional().default(false),
  websiteUrl: z.string().max(1000).optional().nullable(),
  mapsUrl: z.string().max(1000).optional().nullable(),
});

function slugify(value: string): string {
  const stem = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "business";
  return `${stem}-${Math.random().toString(36).slice(2, 8)}`;
}

function businessFromLead(lead: Record<string, unknown>): BusinessWebsiteInput {
  return {
    name: String(lead.business_name ?? lead.name ?? "Business"),
    category: typeof lead.category === "string" ? lead.category : null,
    location: typeof lead.location === "string" ? lead.location : null,
    address: typeof lead.address === "string" ? lead.address : null,
    phone: typeof lead.phone === "string" ? lead.phone : null,
    rating: typeof lead.rating === "number" ? lead.rating : null,
    reviewCount: typeof lead.review_count === "number" ? lead.review_count : 0,
  };
}

async function findOwnedStudioProject(projectId: string, userId: string) {
  const { data: project } = await db
    .from("studio_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return project as Record<string, unknown> | null;
}

async function checkStudioAiCapacity(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();
  const subscriptionRow = subscription as { plan?: string; status?: string } | null;
  if (!subscriptionRow || !["active", "canceling"].includes(subscriptionRow.status ?? "")) return { allowed: false, used: 0, limit: 0 };
  const limits: Record<string, number> = { starter: 50, pro: 200, agency: 9999 };
  const limit = limits[subscriptionRow.plan ?? ""] ?? 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: projects } = await db.from("studio_projects").select("id").eq("user_id", userId);
  const ids = (projects ?? []).map((project: { id: string }) => project.id);
  if (!ids.length) return { allowed: true, used: 0, limit };
  const { count } = await db.from("studio_messages").select("id", { count: "exact", head: true })
    .in("project_id", ids).eq("role", "user").gte("created_at", monthStart);
  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

export const createWebsiteProjectFromLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => websiteLeadSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to use Kodarai Builder." } as const;
    }
    if (data.hasWebsite) {
      return { error: "website_exists", message: "This lead already has a website, so Kodarai Builder is unavailable." } as const;
    }

    let lead: Record<string, unknown> | null = null;
    if (data.placeId) {
      const { data: existing } = await db.from("saved_leads")
        .select("*").eq("user_id", context.userId).eq("place_id", data.placeId).maybeSingle();
      lead = existing as Record<string, unknown> | null;
    }
    if (!lead) {
      const { data: existing } = await db.from("saved_leads")
        .select("*").eq("user_id", context.userId).eq("business_name", data.name)
        .eq("location", data.location ?? "").maybeSingle();
      lead = existing as Record<string, unknown> | null;
    }
    if (!lead) {
      const { data: inserted, error } = await db.from("saved_leads").insert({
        user_id: context.userId,
        place_id: data.placeId ?? null,
        business_name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        rating: data.rating ?? null,
        review_count: data.reviewCount,
        has_website: false,
        website_url: data.websiteUrl ?? null,
        maps_url: data.mapsUrl ?? null,
        category: data.category ?? null,
        location: data.location ?? null,
      }).select("*").single();
      if (error || !inserted) return { error: "lead_create_failed", message: "Could not save this lead for the website project." } as const;
      lead = inserted as Record<string, unknown>;
    }

    const business = businessFromLead(lead);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: project, error } = await db.from("studio_projects").insert({
        user_id: context.userId,
        lead_id: lead.id,
        name: `${business.name} — Website`.slice(0, 120),
        description: `${business.category || "Business"}${business.location ? ` in ${business.location}` : ""}`.slice(0, 500),
        template: "business-website",
        slug: slugify(business.name),
        business_name: business.name,
        business_category: business.category,
        business_details_json: JSON.stringify(business),
        files_json: serializeStudioFiles([]),
        status: "draft",
        generation_status: "idle",
      }).select("*").single();
      if (project) return { project: project as StudioProject } as const;
      if (!error || !String(error.message).includes("slug")) break;
    }
    return { error: "project_create_failed", message: "Could not create the website project. Please try again." } as const;
  });

export const saveStudioFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid(), files: z.array(z.object({ path: z.string(), content: z.string(), language: z.string().optional() })).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to use Kodarai Builder." } as const;
    }
    let files: StudioFile[];
    try { files = normalizeStudioFiles(data.files); } catch (error) {
      return { error: "invalid_files", message: error instanceof Error ? error.message : "Invalid project files." } as const;
    }
    const { error } = await db.from("studio_projects")
      .update({ files_json: serializeStudioFiles(files), updated_at: new Date().toISOString() })
      .eq("id", data.project_id).eq("user_id", context.userId);
    if (error) return { error: "save_failed", message: "Could not save website files." } as const;
    return { files } as const;
  });

export const generateBusinessWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return { error: "plan_required", message: "Choose a paid plan to generate a website." } as const;
    const capacity = await checkStudioAiCapacity(context.userId);
    if (!capacity.allowed) return { error: "limit_reached", message: `You've used all ${capacity.limit} Studio AI messages this month. Upgrade to continue.` } as const;
    const project = await findOwnedStudioProject(data.project_id, context.userId);
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    const business = (() => { try { return JSON.parse(String(project.business_details_json || "{}")); } catch { return {}; } })() as BusinessWebsiteInput;
    if (!business.name) return { error: "invalid_business", message: "This project is missing business information." } as const;

    await db.from("studio_projects").update({ status: "generating", generation_status: "generating", updated_at: new Date().toISOString() })
      .eq("id", data.project_id).eq("user_id", context.userId);
    try {
      const specification = await generateBusinessWebsiteSpec(business);
      const files = buildBusinessWebsiteFiles(business, specification);
      const { error } = await db.from("studio_projects").update({
        files_json: serializeStudioFiles(files), theme_json: JSON.stringify(specification.theme), template: specification.template,
        status: "ready", generation_status: "ready", updated_at: new Date().toISOString(),
      }).eq("id", data.project_id).eq("user_id", context.userId);
      if (error) throw new Error("Could not save generated website files.");
      await db.from("studio_messages").insert({ project_id: data.project_id, role: "user", content: "Generate a professional business website from this lead." });
      await db.from("studio_messages").insert({ project_id: data.project_id, role: "assistant", content: "Your business website is ready to preview and edit.", file_changes: JSON.stringify(files.map((file) => ({ path: file.path, action: "create" }))) });
      return { files, theme: specification.theme } as const;
    } catch (error) {
      await db.from("studio_projects").update({ status: "failed", generation_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      return { error: "generation_failed", message: error instanceof Error ? error.message : "Website generation failed." } as const;
    }
  });

export const applyBusinessWebsiteEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid(), request: z.string().min(3).max(2000) }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return { error: "plan_required", message: "Choose a paid plan to use AI edits." } as const;
    const capacity = await checkStudioAiCapacity(context.userId);
    if (!capacity.allowed) return { error: "limit_reached", message: `You've used all ${capacity.limit} Studio AI messages this month. Upgrade to continue.` } as const;
    const project = await findOwnedStudioProject(data.project_id, context.userId);
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    const files = parseStudioFiles(String(project.files_json || ""));
    if (files.length === 0) return { error: "no_files", message: "Generate the website before editing it." } as const;
    const business = (() => { try { return JSON.parse(String(project.business_details_json || "{}")); } catch { return {}; } })() as BusinessWebsiteInput;
    try {
      const result = await generateWebsiteEdit({ request: data.request, business, files });
      const nextFiles = applyStudioFileChanges(files, result.changes);
      if (!nextFiles.some((file) => file.path === "index.html")) throw new Error("The edit would remove index.html.");
      await db.from("studio_snapshots").insert({ project_id: data.project_id, label: `Before: ${data.request.slice(0, 150)}`, files_json: serializeStudioFiles(files), files_count: files.length });
      const { error } = await db.from("studio_projects").update({ files_json: serializeStudioFiles(nextFiles), updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      if (error) throw new Error("Could not save the website edit.");
      await db.from("studio_messages").insert([
        { project_id: data.project_id, role: "user", content: data.request },
        { project_id: data.project_id, role: "assistant", content: result.summary, file_changes: JSON.stringify(result.changes.map((change) => ({ path: change.path, action: change.action }))) },
      ]);
      return { files: nextFiles, summary: result.summary } as const;
    } catch (error) {
      return { error: "edit_failed", message: error instanceof Error ? error.message : "Could not apply this website edit." } as const;
    }
  });

export const undoLastBusinessWebsiteEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to use Kodarai Builder." } as const;
    }
    const project = await findOwnedStudioProject(data.project_id, context.userId);
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    const { data: snapshot } = await db.from("studio_snapshots").select("*").eq("project_id", data.project_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!snapshot) return { error: "no_snapshot", message: "There is no AI edit to undo yet." } as const;
    const files = parseStudioFiles((snapshot as { files_json?: string }).files_json || "");
    const { error } = await db.from("studio_projects").update({ files_json: serializeStudioFiles(files), updated_at: new Date().toISOString() })
      .eq("id", data.project_id).eq("user_id", context.userId);
    if (error) return { error: "undo_failed", message: "Could not restore the previous version." } as const;
    await db.from("studio_snapshots").delete().eq("id", (snapshot as { id: string }).id);
    return { files } as const;
  });

export const deployBusinessWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to publish a website." } as const;
    }
    const project = await findOwnedStudioProject(data.project_id, context.userId);
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    const files = parseStudioFiles(String(project.files_json || ""));
    if (!files.length) return { error: "no_files", message: "Generate and save a website before publishing." } as const;
    const slug = typeof project.slug === "string" ? project.slug : slugify(String(project.business_name || project.name));
    await db.from("studio_projects").update({ status: "publishing", deployment_status: "preparing", deployment_error: null, updated_at: new Date().toISOString() })
      .eq("id", data.project_id).eq("user_id", context.userId);
    try {
      const vercelProject = await createVercelProject(slug, project.vercel_project_id as string | null, project.vercel_project_name as string | null);
      await db.from("studio_projects").update({ vercel_project_id: vercelProject.id, vercel_project_name: vercelProject.name, slug, deployment_status: "uploading", updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      const deployment = await deployToVercel({ projectName: vercelProject.name, files });
      await db.from("studio_projects").update({ vercel_deployment_id: deployment.id, deployment_status: "building", updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      const complete = await waitForVercelDeployment(deployment.id);
      const url = publicVercelUrl(complete);
      if (complete.readyState !== "READY" || !url) {
        return { deployment_id: deployment.id, status: "building", message: "Vercel is still building your website." } as const;
      }
      await db.from("studio_projects").update({ status: "published", deployment_status: "ready", vercel_url: url, deployment_url: url, deployment_error: null, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      return { deployment_id: deployment.id, status: "ready", url } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 4000) : "Vercel deployment failed.";
      await db.from("studio_projects").update({ status: "failed", deployment_status: "error", deployment_error: message, updated_at: new Date().toISOString() })
        .eq("id", data.project_id).eq("user_id", context.userId);
      if (message.includes("VERCEL_TOKEN")) {
        return { error: "vercel_not_configured", message: "Kodarai's managed publishing service has not been configured yet." } as const;
      }
      return { error: "deployment_failed", message: "Vercel deployment failed. Check the project for build errors.", detail: message } as const;
    }
  });

export const getBusinessWebsiteDeploymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) {
      return { error: "plan_required", message: "Choose a paid plan to use Kodarai Builder." } as const;
    }
    const project = await findOwnedStudioProject(data.project_id, context.userId);
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    const deploymentId = project.vercel_deployment_id as string | null;
    if (!deploymentId) return { status: project.deployment_status ?? "not_started", url: project.vercel_url ?? null } as const;
    try {
      const deployment = await getVercelDeployment(deploymentId);
      const url = publicVercelUrl(deployment);
      if (deployment.readyState === "READY" && url) {
        await db.from("studio_projects").update({ status: "published", deployment_status: "ready", vercel_url: url, deployment_url: url, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", data.project_id).eq("user_id", context.userId);
        return { status: "ready", url } as const;
      }
      if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
        const detail = deployment.errorMessage || "Vercel could not build this website.";
        await db.from("studio_projects").update({ status: "failed", deployment_status: "error", deployment_error: detail, updated_at: new Date().toISOString() })
          .eq("id", data.project_id).eq("user_id", context.userId);
        return { status: "error", url: null, detail } as const;
      }
      return { status: "building", url: null } as const;
    } catch (error) {
      return { error: "status_failed", message: error instanceof Error ? error.message : "Could not check deployment status." } as const;
    }
  });
