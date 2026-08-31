import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPaidSubscription } from "@/lib/subscription.server";

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
  status: "draft" | "building" | "live" | "error";
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
  status: z.enum(["draft", "building", "live", "error"]).optional(),
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
