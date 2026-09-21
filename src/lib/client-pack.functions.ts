import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPaidSubscription } from "@/lib/subscription.server";
import { estimateWebsitePrice } from "@/lib/pricing";
import type { LeadResult } from "@/lib/constants";

// Generated Supabase types are intentionally unavailable in this checkout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const leadId = z.object({ leadId: z.string().uuid() });
const publicToken = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/) });
const activities = z.enum([
  "message_copied",
  "whatsapp_opened",
  "call_script_copied",
  "demo_copied",
  "proposal_downloaded",
  "proposal_shared",
  "follow_up_started",
]);
const update = z
  .object({
    leadId: z.string().uuid(),
    preparedBy: z.string().trim().max(160),
    proposalPrice: z.string().trim().max(120),
    proposalCurrency: z.string().trim().max(12),
    deliveryDays: z.number().int().min(1).max(365).nullable(),
    proposalNote: z.string().trim().max(1000),
    whatsappMessage: z.string().trim().min(1).max(2000),
    callScript: z.string().trim().min(1).max(4000),
    includedItems: z.array(z.enum(["mobile_friendly", "contact_button", "location_map"])).max(3),
  })
  .strict();

type Lead = {
  id: string;
  business_name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  review_count: number;
  has_website: boolean;
  maps_url: string | null;
  category: string | null;
  location: string | null;
  status: string;
};
const text = (value: string | null | undefined) =>
  (value ?? "")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
const phoneAvailable = (phone: string | null) =>
  Boolean(phone && phone.replace(/\D/g, "").length >= 7);
const nigeria = (location: string | null) =>
  /nigeria|lagos|abuja|ibadan|kano|port harcourt|benin city|enugu|owerri|kaduna/i.test(
    location ?? "",
  );
const finderLead = (lead: Lead): LeadResult => ({
  placeId: lead.id,
  name: lead.business_name,
  category: lead.category ?? undefined,
  address: lead.address ?? "",
  phone: lead.phone,
  email: null,
  rating: lead.rating,
  reviewCount: lead.review_count,
  hasWebsite: lead.has_website,
  websiteUrl: null,
  mapsUrl: lead.maps_url ?? "",
});
const message = (lead: Lead, demo: boolean) =>
  `Hi ${text(lead.business_name)},\n\nI came across your business while researching businesses online. ${demo ? "I made a quick sample website to show what your business could look like online." : lead.has_website ? "I had an idea for how your website could be clearer online." : "I noticed you do not have a website yet."}\n\nCan I send it to you?`;
const script = (lead: Lead, demo: boolean, price: string) =>
  `Hi, good afternoon.\n\nMy name is [Your name].\n\nI came across ${text(lead.business_name)} while researching businesses online. ${lead.has_website ? "I had an idea for how your website could be clearer online." : "I noticed you do not have a website yet."}\n\n${demo ? "I made a quick sample website to show what your business could look like online." : "I can put together a quick sample website to show what your business could look like online."}\n\nI would love to send it to you. What is the best way to send it?\n\nIf they say I am busy\nNo problem. I can send the sample over and you can have a look whenever you are free.\n\nIf they say How much?\nI can tailor it to what you need. I am currently thinking around ${price || "the price we agree together"}.\n\nIf they say Send it to me\nGreat - I will send the sample now. Thank you.`;
async function ownedLead(id: string, userId: string) {
  const { data } = await db
    .from("saved_leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data as Lead | null;
}
async function projectForLead(id: string, userId: string) {
  const { data } = await db
    .from("studio_projects")
    .select("id,name,files_json,status,generation_status,created_at,updated_at")
    .eq("lead_id", id)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as {
    id: string;
    name: string;
    files_json: string;
    status: string;
    generation_status: string;
  } | null;
}
async function demoForProject(id: string, userId: string) {
  const { data } = await db
    .from("studio_demo_links")
    .select("share_token,is_active,created_at")
    .eq("project_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data as { share_token: string; is_active: boolean; created_at: string } | null;
}

export const getClientPack = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => leadId.parse(data))
  .handler(async ({ data, context }) => {
    const lead = await ownedLead(data.leadId, context.userId);
    if (!lead) return { error: "not_found", message: "This business was not found." } as const;
    const project = await projectForLead(lead.id, context.userId);
    const demo = project ? await demoForProject(project.id, context.userId) : null;
    const { data: pack } = await db
      .from("client_packs")
      .select("*")
      .eq("lead_id", lead.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      lead,
      project: project
        ? {
            ...project,
            ready: Boolean(
              project.files_json && project.files_json !== "[]" && project.files_json !== "{}",
            ),
          }
        : null,
      demo,
      pack: pack ?? null,
    } as const;
  });

export const ensureClientPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => leadId.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId)))
      return {
        error: "plan_required",
        message: "Choose a paid plan to prepare a Client Pack.",
      } as const;
    const lead = await ownedLead(data.leadId, context.userId);
    if (!lead) return { error: "not_found", message: "This business was not found." } as const;
    const existing = await db
      .from("client_packs")
      .select("*")
      .eq("lead_id", lead.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.data) return { pack: existing.data, created: false } as const;
    const project = await projectForLead(lead.id, context.userId);
    const demo = project ? await demoForProject(project.id, context.userId) : null;
    const estimate = nigeria(lead.location)
      ? estimateWebsitePrice(finderLead(lead), lead.category ?? "", lead.location ?? "")
      : null;
    const { data: pack, error } = await db
      .from("client_packs")
      .insert({
        user_id: context.userId,
        lead_id: lead.id,
        studio_project_id: project?.id ?? null,
        whatsapp_message: message(lead, Boolean(demo?.is_active)),
        call_script: script(
          lead,
          Boolean(demo?.is_active),
          estimate ? String(estimate.potentialDealValue) : "",
        ),
        proposal_price: estimate ? String(estimate.potentialDealValue) : "",
        proposal_currency: estimate ? "NGN" : "",
        delivery_days: 7,
        included_items: [
          "mobile_friendly",
          ...(phoneAvailable(lead.phone) ? ["contact_button"] : []),
          ...(lead.maps_url ? ["location_map"] : []),
        ],
      })
      .select("*")
      .single();
    if (error || !pack)
      return { error: "create_failed", message: "Could not prepare this Client Pack." } as const;
    return { pack, created: true } as const;
  });

export const updateClientPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => update.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId)))
      return {
        error: "plan_required",
        message: "Choose a paid plan to update a Client Pack.",
      } as const;
    const lead = await ownedLead(data.leadId, context.userId);
    if (!lead) return { error: "not_found", message: "This business was not found." } as const;
    const { data: pack, error } = await db
      .from("client_packs")
      .update({
        prepared_by: text(data.preparedBy),
        proposal_price: text(data.proposalPrice),
        proposal_currency: text(data.proposalCurrency).toUpperCase(),
        delivery_days: data.deliveryDays,
        proposal_note: text(data.proposalNote),
        included_items: data.includedItems,
        whatsapp_message: data.whatsappMessage.split(String.fromCharCode(0)).join(""),
        call_script: data.callScript.split(String.fromCharCode(0)).join(""),
      })
      .eq("lead_id", lead.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error || !pack)
      return { error: "update_failed", message: "Could not save your Client Pack." } as const;
    return { pack } as const;
  });

export const recordClientPackActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ leadId: z.string().uuid(), action: activities }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId)))
      return {
        error: "plan_required",
        message: "Choose a paid plan to use Client Pack actions.",
      } as const;
    const lead = await ownedLead(data.leadId, context.userId);
    if (!lead) return { error: "not_found", message: "This business was not found." } as const;
    const { data: pack } = await db
      .from("client_packs")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    await db.from("client_pack_activities").insert({
      user_id: context.userId,
      lead_id: lead.id,
      client_pack_id: pack?.id ?? null,
      action: data.action,
    });
    if (data.action === "whatsapp_opened" && lead.status === "new")
      await db
        .from("saved_leads")
        .update({ status: "contacted" })
        .eq("id", lead.id)
        .eq("user_id", context.userId);
    return { ok: true } as const;
  });

export const createClientPackProposalLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => leadId.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await hasPaidSubscription(context.userId)))
      return {
        error: "plan_required",
        message: "Choose a paid plan to share a proposal.",
      } as const;
    const lead = await ownedLead(data.leadId, context.userId);
    if (!lead) return { error: "not_found", message: "This business was not found." } as const;
    const { data: pack, error } = await db
      .from("client_packs")
      .update({
        proposal_share_token: randomBytes(32).toString("base64url"),
        proposal_shared_at: new Date().toISOString(),
      })
      .eq("lead_id", lead.id)
      .eq("user_id", context.userId)
      .select("proposal_share_token")
      .single();
    if (error || !pack)
      return { error: "share_failed", message: "Could not create a proposal link." } as const;
    return { shareToken: pack.proposal_share_token } as const;
  });

export const getPublicClientPackProposal = createServerFn({ method: "GET" })
  .inputValidator((data) => publicToken.parse(data))
  .handler(async ({ data }) => {
    const { data: pack } = await db
      .from("client_packs")
      .select(
        "prepared_by,proposal_price,proposal_currency,delivery_days,proposal_note,included_items,studio_project_id,saved_leads(business_name,category,location),studio_projects(id)",
      )
      .eq("proposal_share_token", data.token)
      .maybeSingle();
    if (!pack) return { error: "not_found" } as const;
    const lead = Array.isArray(pack.saved_leads) ? pack.saved_leads[0] : pack.saved_leads;
    if (!lead) return { error: "not_found" } as const;
    const demo = pack.studio_project_id
      ? await db
          .from("studio_demo_links")
          .select("share_token")
          .eq("project_id", pack.studio_project_id)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    return {
      proposal: {
        businessName: text(lead.business_name),
        category: text(lead.category),
        location: text(lead.location),
        preparedBy: text(pack.prepared_by),
        price: text(pack.proposal_price),
        currency: text(pack.proposal_currency),
        deliveryDays: pack.delivery_days,
        note: text(pack.proposal_note),
        includedItems: pack.included_items as string[],
        demoToken: demo.data?.share_token ?? null,
      },
    } as const;
  });

const DAILY_TARGETS = { found: 5, built: 1, contacted: 3, followedUp: 2 } as const;
export const getTodayPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const [saved, built, contacts, leads, followups, demoLinks] = await Promise.all([
      db
        .from("saved_leads")
        .select("id")
        .eq("user_id", context.userId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      db
        .from("studio_projects")
        .select("id")
        .eq("user_id", context.userId)
        .eq("generation_status", "ready")
        .gte("updated_at", start.toISOString())
        .lt("updated_at", end.toISOString()),
      db
        .from("client_pack_activities")
        .select("lead_id")
        .eq("user_id", context.userId)
        .eq("action", "whatsapp_opened")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      db
        .from("saved_leads")
        .select("id,business_name,follow_up_at,status")
        .eq("user_id", context.userId),
      db
        .from("client_pack_activities")
        .select("lead_id")
        .eq("user_id", context.userId)
        .eq("action", "follow_up_started")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      db
        .from("studio_demo_links")
        .select(
          "project_id,studio_demo_views(viewed_at),studio_projects(saved_leads(business_name))",
        )
        .eq("user_id", context.userId),
    ]);
    if ([saved, built, contacts, leads, followups, demoLinks].some((result) => result.error))
      return { error: "plan_unavailable" } as const;
    const contacted = new Set((contacts.data ?? []).map((row: { lead_id: string }) => row.lead_id))
      .size;
    const followedUp = new Set(
      (followups.data ?? []).map((row: { lead_id: string }) => row.lead_id),
    ).size;
    const waiting = (leads.data ?? []).filter(
      (lead: { follow_up_at: string | null; status: string }) =>
        Boolean(
          lead.follow_up_at &&
          new Date(lead.follow_up_at) <= now &&
          !["closed", "paid"].includes(lead.status),
        ),
    );
    const recentDemo =
      (demoLinks.data ?? [])
        .flatMap(
          (row: {
            studio_demo_views?: Array<{ viewed_at: string }>;
            studio_projects?: { saved_leads?: { business_name?: string | null } | null } | null;
          }) =>
            (row.studio_demo_views ?? [])
              .filter((view) => new Date(view.viewed_at) >= start)
              .map(() => row.studio_projects?.saved_leads?.business_name ?? null),
        )
        .find(Boolean) ?? null;
    const progress = {
      found: Math.min((saved.data ?? []).length, DAILY_TARGETS.found),
      built: Math.min((built.data ?? []).length, DAILY_TARGETS.built),
      contacted: Math.min(contacted, DAILY_TARGETS.contacted),
      followedUp: Math.min(followedUp, DAILY_TARGETS.followedUp),
    };
    const next =
      progress.found < DAILY_TARGETS.found
        ? "find"
        : progress.built < DAILY_TARGETS.built
          ? "build"
          : progress.contacted < DAILY_TARGETS.contacted
            ? "contact"
            : waiting.length > 0
              ? "follow_up"
              : "done";
    const nextLeadId =
      (leads.data ?? []).find((lead: { status: string }) => lead.status === "new")?.id ?? null;
    return {
      date: start.toISOString().slice(0, 10),
      targets: DAILY_TARGETS,
      progress,
      followUpsWaiting: waiting.length,
      followUpLeadId: waiting[0]?.id ?? null,
      recentDemoBusiness: recentDemo,
      nextLeadId,
      next,
    } as const;
  });
