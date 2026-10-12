import { createServerFn } from "@tanstack/react-start";
import { createHash, randomUUID } from "node:crypto";
import webpush from "web-push";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail } from "@/lib/email.server";
import { relayVisitorMessageToTelegram } from "@/lib/support-visitors.server";
import { PLANS, formatNgn } from "@/lib/billing";

const db = supabaseAdmin as any;

export interface SupportConversation {
  id: string;
  visitor_token_hash?: string | null;
  user_id: string | null;
  status: "bot" | "human" | "closed";
  human_requested_at: string | null;
  agent_replied_at: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: "user" | "bot" | "agent";
  content: string;
  created_at: string;
}

export interface SupportInboxConversation extends SupportConversation {
  customer_name: string;
  customer_email: string;
}

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
const guestTokenSchema = z.object({ visitorToken: z.string().uuid() });
const guestMessageSchema = messageSchema.extend({ visitorToken: z.string().uuid() });
const contactEmailSchema = z.object({ email: z.string().trim().email().max(320) });
const guestContactEmailSchema = contactEmailSchema.extend({ visitorToken: z.string().uuid() });
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b"];
const STARTER_PLAN_PRICE = formatNgn(PLANS.find((plan) => plan.id === "starter")?.ngn ?? 1000);

const KODARAI_PRODUCT_BRIEF = `
KodarAI is a client-acquisition and website-production toolkit. It does not employ users, pay users a salary, guarantee income, or close sales for them.

How a user can use it: choose a location and business type, research businesses that may have no website or need a better one, choose an opportunity, create a sample website in KodarAI Studio, prepare a message or call script, then contact the business themselves. The user and business agree the scope and price directly; the user delivers the work. Results depend on the user's effort, pricing, work quality, and deals they close.

No coding: users do not need to code to create a first website sample. They can give simple instructions to Studio. Experienced builders can customise further.

Starter: the visible Starter plan is ${STARTER_PLAN_PRICE} for 30-day access. It includes lead searches, Studio credits, the website builder, AI website and cold-call scripts, and a pipeline. The user sees the plan details before checkout. Payment uses Paystack and the plan does not renew automatically.

Lead information: contact details and business information are shown only where available. Users should verify each opportunity before contacting a business.

Other product areas: Finder is for searching and saving business opportunities; Leads and the pipeline help organise outreach; Studio creates, previews and edits website projects; Social Content helps draft content; Revenue and Invoices help users organise their business records; Referrals may reward eligible referral activity according to the current in-product terms. Give a short, feature-specific explanation when asked, but do not claim a feature is included in every plan unless the current plan page says so.

Virtual numbers: availability, countries, and supported services can vary. Never guarantee that a number will work with a particular service.

Support boundaries: do not claim to see a user's account, payment, lead, generated website, or checkout unless that information was provided in the chat. For refunds, failed payments, account access, security, billing disputes, or anything requiring account-specific investigation, hand off to a human.
`.trim();

type SupportReply = { content: string; status: "bot" | "human" };

function fallbackSupportReply(message: string): SupportReply {
  const lower = message.toLowerCase();
  if (/human|person|agent|someone|representative/.test(lower)) {
    return {
      content: "I have passed this to the KodarAI team. An agent will pick it up here as soon as one is available.",
      status: "human",
    };
  }
  if (/make money|earn|earning|get paid|income/.test(lower)) {
    return {
      content: "KodarAI does not guarantee income or pay you directly. It helps you find possible business opportunities, create a website sample and prepare a pitch. You contact the business, agree a price with them, and deliver the work if they accept.",
      status: "bot",
    };
  }
  if (/code|coding|developer/.test(lower)) {
    return {
      content: "You do not need to know how to code to make a first website sample in KodarAI Studio. You can give simple instructions, then contact the business yourself and agree the work and price directly.",
      status: "bot",
    };
  }
  if (/price|cost|starter|plan|₦|naira/.test(lower)) {
    return {
      content: `The visible Starter plan is ${STARTER_PLAN_PRICE} for 30-day access. It includes lead searches, Studio credits, the website builder, outreach scripts and a pipeline. You can review the plan details before payment.`,
      status: "bot",
    };
  }
  return {
    content: "I can help with finding leads, Studio, billing, and virtual numbers. I can also connect you with the KodarAI team when you need a person.",
    status: "bot",
  };
}

async function generateSupportReply(conversation: SupportConversation, message: string): Promise<SupportReply> {
  if (/human|person|agent|someone|representative/.test(message.toLowerCase())) {
    return fallbackSupportReply(message);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallbackSupportReply(message);

  const { data: history, error } = await db
    .from("support_messages")
    .select("sender,content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return fallbackSupportReply(message);

  const messages = (history ?? []).reverse().map((item: { sender: SupportMessage["sender"]; content: string }) => ({
    role: item.sender === "user" ? "user" : "assistant",
    content: item.content,
  }));
  const system = `You are KodarAI Support, a concise, warm product-support assistant.\n\n${KODARAI_PRODUCT_BRIEF}\n\nAnswer the user's question directly in plain language. Be clear about the user-owned work: KodarAI assists with research, sample creation and outreach preparation; the user contacts the business, agrees terms and delivers. Never frame KodarAI as an automatic income system. Answer only with information supported by this brief or the conversation. Do not invent plans, prices, refunds, account activity, delivery times, or actions you cannot perform. For account, billing, security, payment, refund, or complex issues, offer a human handoff. Never ask for passwords, one-time codes, card data, API keys, or other secrets. Return only valid JSON in this exact format: {"reply":"plain text under 900 characters","handoff":false}. Set handoff to true only when a person should take over.`;

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], temperature: 0.35, max_tokens: 350 }),
      });
      if (!response.ok) continue;
      const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = z.object({ reply: z.string().trim().min(1).max(1800), handoff: z.boolean() }).safeParse(JSON.parse(match[0]));
      if (!parsed.success) continue;
      return { content: parsed.data.reply, status: parsed.data.handoff ? "human" : "bot" };
    } catch {
      // A fallback reply keeps the customer conversation usable when the model is unavailable.
    }
  }
  return fallbackSupportReply(message);
}

async function getOrCreateConversation(userId: string) {
  const { data: existing, error: existingError } = await db
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as SupportConversation;

  const { data: created, error: createError } = await db
    .from("support_conversations")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return created as SupportConversation;
}

function hashVisitorToken(visitorToken: string) {
  return createHash("sha256").update(visitorToken).digest("hex");
}

async function getGuestConversation(visitorToken: string) {
  const { data, error } = await db
    .from("support_conversations")
    .select("*")
    .eq("visitor_token_hash", hashVisitorToken(visitorToken))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SupportConversation | null;
}

async function createGuestConversation(existingToken?: string) {
  const visitorToken = existingToken ?? randomUUID();
  const { data, error } = await db
    .from("support_conversations")
    .insert({ visitor_token_hash: hashVisitorToken(visitorToken) })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { conversation: data as SupportConversation, visitorToken };
}

async function notifySupportAdmin(conversationId: string, preview: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@kodarai.xyz";
  if (!publicKey || !privateKey) return;

  const { data: subscriptions, error } = await db
    .from("support_push_subscriptions")
    .select("id,endpoint,p256dh,auth");
  if (error || !subscriptions?.length) return;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const payload = JSON.stringify({
    title: "New support request",
    body: preview.slice(0, 120),
    url: "/support",
    conversationId,
  });
  await Promise.all(subscriptions.map(async (subscription: any) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.from("support_push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }));
}

async function getConversationCustomerEmail(conversation: SupportConversation) {
  if (conversation.contact_email) return conversation.contact_email;
  if (!conversation.user_id) return null;

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(conversation.user_id);
  if (error) return null;
  return data.user?.email?.trim().toLowerCase() || null;
}

async function emailSupportAdmin(conversation: SupportConversation, preview: string) {
  const recipient = process.env.SUPPORT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!recipient) return;
  const customerEmail = await getConversationCustomerEmail(conversation);
  const customer = customerEmail || "a guest visitor";
  await sendTransactionalEmail({
    to: recipient,
    subject: "New support message — KodarAI",
    title: "A customer needs support",
    preview: preview.slice(0, 140),
    body: `${customer} wrote:\n\n${preview}\n\nOpen the support inbox to reply.`,
    ctaLabel: "Open support inbox",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/support`,
  });
}

async function emailCustomerReply(conversation: SupportConversation, content: string) {
  const recipient = await getConversationCustomerEmail(conversation);
  if (!recipient) return;
  await sendTransactionalEmail({
    to: recipient,
    subject: "KodarAI Support replied to your message",
    title: "You have a reply from KodarAI Support",
    preview: content.slice(0, 140),
    body: `${content}\n\nYou can continue the conversation in KodarAI.`,
    ctaLabel: "Open support",
    ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/support`,
  });
}

async function appendCustomerMessage(conversation: SupportConversation, content: string) {
  if (conversation.status === "closed") throw new Error("This conversation has ended.");

  const { data: customerMessage, error: customerError } = await db
    .from("support_messages")
    .insert({ conversation_id: conversation.id, sender: "user", content })
    .select("*")
    .single();
  if (customerError) throw new Error(customerError.message);

  const now = new Date().toISOString();
  // Once a person has answered, the AI stays quiet so the human conversation (including Telegram replies) isn't interrupted.
  const humanIsHandling = conversation.status === "human" && Boolean(conversation.agent_replied_at);
  const reply: SupportReply | null = humanIsHandling ? null : await generateSupportReply(conversation, content);
  let botMessage: SupportMessage | null = null;
  if (reply) {
    const { data, error: botError } = await db
      .from("support_messages")
      .insert({ conversation_id: conversation.id, sender: "bot", content: reply.content })
      .select("*")
      .single();
    if (botError) throw new Error(botError.message);
    botMessage = data as SupportMessage;
  }

  const staysInHumanQueue = conversation.status === "human";
  const conversationUpdate = staysInHumanQueue
    ? { status: "human", updated_at: now }
    : reply?.status === "human"
    ? { status: "human", updated_at: now, human_requested_at: now, agent_replied_at: null }
    : { status: "bot", updated_at: now };
  await db
    .from("support_conversations")
    .update(conversationUpdate)
    .eq("id", conversation.id);

  if (conversationUpdate.status === "human") {
    await Promise.all([
      notifySupportAdmin(conversation.id, content),
      emailSupportAdmin({ ...conversation, ...conversationUpdate } as SupportConversation, content),
    ]);
  }
  await relayVisitorMessageToTelegram(conversation.visitor_token_hash, content);

  return {
    conversation: { ...conversation, ...conversationUpdate } as SupportConversation,
    messages: [customerMessage, ...(botMessage ? [botMessage] : [])] as SupportMessage[],
  };
}

async function isSupportAdmin(userId: string) {
  const configuredEmail = process.env.SUPPORT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) return false;

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return false;
  return data.user?.email?.trim().toLowerCase() === configuredEmail;
}

export const getSupportAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ authorized: await isSupportAdmin(context.userId) }));

export const getSupportChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const conversation = await getOrCreateConversation(context.userId);
      const { data, error } = await db
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (error) return { error: error.message, messages: [] as SupportMessage[] } as const;
      return { conversation, messages: (data ?? []) as SupportMessage[] } as const;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to start support chat.",
        messages: [] as SupportMessage[],
      } as const;
    }
  });

export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => messageSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const conversation = await getOrCreateConversation(context.userId);
      return await appendCustomerMessage(conversation, data.content);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to send your message." } as const;
    }
  });

export const startGuestSupportChat = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ visitorToken: z.string().uuid().optional() }).optional().parse(data))
  .handler(async ({ data }) => {
    try {
      const { conversation, visitorToken } = await createGuestConversation(data?.visitorToken);
      return { conversation, visitorToken, messages: [] as SupportMessage[] } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to start guest chat." } as const;
    }
  });

export const getGuestSupportChat = createServerFn({ method: "GET" })
  .inputValidator((data) => guestTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const conversation = await getGuestConversation(data.visitorToken);
      if (!conversation) return { error: "Guest conversation not found.", messages: [] as SupportMessage[] } as const;
      const { data: messages, error } = await db
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (error) return { error: error.message, messages: [] as SupportMessage[] } as const;
      return { conversation, messages: (messages ?? []) as SupportMessage[] } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to load guest chat.", messages: [] as SupportMessage[] } as const;
    }
  });

export const sendGuestSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => guestMessageSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const conversation = await getGuestConversation(data.visitorToken);
      if (!conversation) return { error: "Guest conversation not found." } as const;
      return await appendCustomerMessage(conversation, data.content);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to send your message." } as const;
    }
  });

async function saveConversationContactEmail(conversation: SupportConversation, email: string) {
  const updatedAt = new Date().toISOString();
  const { data, error } = await db
    .from("support_conversations")
    .update({ contact_email: email.toLowerCase(), contact_email_requested_at: updatedAt, updated_at: updatedAt })
    .eq("id", conversation.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SupportConversation;
}

export const saveSupportContactEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => contactEmailSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const conversation = await getOrCreateConversation(context.userId);
      return { conversation: await saveConversationContactEmail(conversation, data.email) } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to save your email." } as const;
    }
  });

export const saveGuestSupportContactEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => guestContactEmailSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const conversation = await getGuestConversation(data.visitorToken);
      if (!conversation) return { error: "Guest conversation not found." } as const;
      return { conversation: await saveConversationContactEmail(conversation, data.email) } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to save your email." } as const;
    }
  });

async function deleteSupportConversation(conversationId: string) {
  const { error } = await db
    .from("support_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw new Error(error.message);
}

export const leaveSupportChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const conversation = await getOrCreateConversation(context.userId);
      await deleteSupportConversation(conversation.id);
      return { success: true } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to end this chat." } as const;
    }
  });

export const leaveGuestSupportChat = createServerFn({ method: "POST" })
  .inputValidator((data) => guestTokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const conversation = await getGuestConversation(data.visitorToken);
      if (!conversation) return { error: "Guest conversation not found." } as const;
      await deleteSupportConversation(conversation.id);
      return { success: true } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to end this chat." } as const;
    }
  });

export const restartSupportChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const conversation = await getOrCreateConversation(context.userId);
      const { data, error } = await db
        .from("support_conversations")
        .update({ status: "bot", human_requested_at: null, agent_replied_at: null, updated_at: new Date().toISOString() })
        .eq("id", conversation.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { conversation: data as SupportConversation, messages: [] as SupportMessage[] } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to start a new chat." } as const;
    }
  });

export const getSupportPushConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isSupportAdmin(context.userId))) return { error: "Not authorized." } as const;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) return { error: "Push notifications are not configured." } as const;
    return { publicKey } as const;
  });

export const saveSupportPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => pushSubscriptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isSupportAdmin(context.userId))) return { error: "Not authorized." } as const;
    const { error } = await db
      .from("support_push_subscriptions")
      .upsert({ user_id: context.userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });

export const getSupportInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isSupportAdmin(context.userId))) {
      return { error: "This inbox is restricted to the configured support admin.", conversations: [] as SupportInboxConversation[] } as const;
    }

    const { data, error } = await db
      .from("support_conversations")
      .select("id,user_id,status,created_at,updated_at,human_requested_at,agent_replied_at,contact_email,profiles(full_name,email)")
      .neq("status", "closed")
      .order("updated_at", { ascending: false });
    if (error) return { error: error.message, conversations: [] as SupportInboxConversation[] } as const;

    const conversations = (data ?? []).map((conversation: any) => ({
      id: conversation.id,
      user_id: conversation.user_id,
      status: conversation.status,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      human_requested_at: conversation.human_requested_at,
      agent_replied_at: conversation.agent_replied_at,
      contact_email: conversation.contact_email,
      customer_name: conversation.profiles?.full_name || "Guest visitor",
      customer_email: conversation.profiles?.email || conversation.contact_email || "",
    })) as SupportInboxConversation[];
    return { conversations } as const;
  });

export const getSupportInboxMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isSupportAdmin(context.userId))) {
      return { error: "This inbox is restricted to the configured support admin.", messages: [] as SupportMessage[] } as const;
    }

    const { data: messages, error } = await db
      .from("support_messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) return { error: error.message, messages: [] as SupportMessage[] } as const;
    return { messages: (messages ?? []) as SupportMessage[] } as const;
  });

export const replyToSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ conversationId: z.string().uuid(), content: z.string().trim().min(1).max(2000) }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isSupportAdmin(context.userId))) {
      return { error: "This inbox is restricted to the configured support admin." } as const;
    }

    const { data: conversation, error: conversationError } = await db
      .from("support_conversations")
      .select("*")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (conversationError || !conversation) return { error: conversationError?.message || "Conversation not found." } as const;

    const { data: message, error } = await db
      .from("support_messages")
      .insert({ conversation_id: data.conversationId, sender: "agent", content: data.content })
      .select("*")
      .single();
    if (error) return { error: error.message } as const;

    await db
      .from("support_conversations")
      .update({ status: "human", agent_replied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);

    await emailCustomerReply(conversation as SupportConversation, data.content);

    return { message: message as SupportMessage } as const;
  });

export const closeSupportConversationByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await isSupportAdmin(context.userId))) return { error: "Not authorized." } as const;
    const { data: conversation, error } = await db
      .from("support_conversations")
      .select("*")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conversation) return { error: error?.message || "Conversation not found." } as const;
    await deleteSupportConversation((conversation as SupportConversation).id);
    return { success: true } as const;
  });
