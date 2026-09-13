import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPaidSubscription } from "@/lib/subscription.server";
import { parseStudioFiles, toStudioFileMap } from "@/lib/studio-files";

const db = supabaseAdmin as any;
const projectIdSchema = z.object({ projectId: z.string().uuid() });
const tokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/) });

function token() {
  return randomBytes(32).toString("base64url");
}

export const getFirstClientProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [leadsResult, projectsResult] = await Promise.all([
      db.from("saved_leads").select("id,status,follow_up_at").eq("user_id", context.userId),
      db.from("studio_projects").select("id").eq("user_id", context.userId),
    ]);
    if (leadsResult.error || projectsResult.error) return { error: "progress_unavailable" } as const;
    const leads = (leadsResult.data ?? []) as Array<{ id: string; status: string; follow_up_at: string | null }>;
    const projects = (projectsResult.data ?? []) as Array<{ id: string }>;
    const contacted = leads.filter((lead) => ["contacted", "proposal", "closed", "paid"].includes(lead.status)).length;
    const followedUp = leads.filter((lead) => Boolean(lead.follow_up_at) || ["proposal", "closed", "paid"].includes(lead.status)).length;
    const closed = leads.filter((lead) => ["closed", "paid"].includes(lead.status)).length;
    return {
      progress: {
        found: Math.min(leads.length, 10),
        built: Math.min(projects.length, 3),
        contacted: Math.min(contacted, 3),
        followedUp: Math.min(followedUp, 1),
        closed: Math.min(closed, 1),
      },
    } as const;
  });

export const createStudioDemoLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => projectIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId))) return { error: "plan_required", message: "Choose a paid plan to share website samples." } as const;
    const { data: project } = await db.from("studio_projects").select("id,files_json").eq("id", data.projectId).eq("user_id", context.userId).maybeSingle();
    if (!project) return { error: "not_found", message: "Website project not found." } as const;
    if (!parseStudioFiles(String(project.files_json ?? "")).length) return { error: "no_website", message: "Generate a website before creating a share link." } as const;
    const { data: link, error } = await db
      .from("studio_demo_links")
      .upsert({ user_id: context.userId, project_id: data.projectId, share_token: token(), is_active: true }, { onConflict: "project_id" })
      .select("share_token,is_active,created_at")
      .single();
    if (error) return { error: "create_failed", message: "Could not create a share link." } as const;
    return { link } as const;
  });

export const getStudioDemoLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => projectIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: link } = await db.from("studio_demo_links").select("id,share_token,is_active,created_at").eq("project_id", data.projectId).eq("user_id", context.userId).maybeSingle();
    if (!link) return { link: null } as const;
    const { data: views } = await db.from("studio_demo_views").select("viewed_at").eq("demo_link_id", link.id).order("viewed_at", { ascending: false }).limit(12);
    return { link: { share_token: link.share_token, is_active: link.is_active, created_at: link.created_at, views: (views ?? []).map((view: { viewed_at: string }) => view.viewed_at) } } as const;
  });

export const revokeStudioDemoLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => projectIdSchema.extend({ active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await db.from("studio_demo_links").update({ is_active: data.active }).eq("project_id", data.projectId).eq("user_id", context.userId);
    if (error) return { error: "update_failed" } as const;
    return { ok: true } as const;
  });

// Public read exposes only the generated site files and display name, never lead/account data.
export const getPublicStudioDemo = createServerFn({ method: "GET" })
  .inputValidator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: link } = await db
      .from("studio_demo_links")
      .select("id,project_id,studio_projects(name,files_json)")
      .eq("share_token", data.token)
      .eq("is_active", true)
      .maybeSingle();
    const project = link?.studio_projects as { name: string; files_json: string } | null;
    if (!link || !project) return { error: "not_found" } as const;
    return { demo: { name: project.name, files: toStudioFileMap(parseStudioFiles(project.files_json)) } } as const;
  });

export const recordPublicStudioDemoView = createServerFn({ method: "POST" })
  .inputValidator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: link } = await db.from("studio_demo_links").select("id").eq("share_token", data.token).eq("is_active", true).maybeSingle();
    if (!link) return { error: "not_found" } as const;
    const { error } = await db.from("studio_demo_views").insert({ demo_link_id: link.id });
    if (error) return { error: "track_failed" } as const;
    return { ok: true } as const;
  });
