import { Resend } from "resend";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type TransactionalEmail = {
  to: string;
  subject: string;
  title: string;
  preview: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  headers?: Record<string, string>;
  footerHtml?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function getAppUrl() {
  return (process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "");
}

export async function sendTransactionalEmail({
  to,
  subject,
  title,
  preview,
  body,
  ctaLabel,
  ctaUrl,
  headers,
  footerHtml,
}: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "Email is not configured." } as const;

  const actionUrl = ctaUrl || getAppUrl();
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");
  const safeCtaLabel = escapeHtml(ctaLabel || "Open KodarAI");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f7f9;color:#171717;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <main style="max-width:600px;margin:32px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:22px 28px;border-bottom:1px solid #e5e7eb;font-size:18px;font-weight:700;">KodarAI</div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;">${safeTitle}</h1>
        <p style="margin:0;color:#52525b;font-size:15px;line-height:1.65;">${safeBody}</p>
        <p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;padding:11px 16px;border-radius:7px;text-decoration:none;font-size:14px;font-weight:600;">${safeCtaLabel}</a></p>
      </div>
      <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #e5e7eb;color:#71717a;font-size:12px;line-height:1.5;">${footerHtml || "This is a transactional KodarAI notification."}</div>
    </main>
  </body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text: `${title}\n\n${body}\n\n${safeCtaLabel}: ${actionUrl}`,
      headers,
    });
    if (error) {
      console.error("Unable to send transactional email:", error.message);
      return { sent: false, reason: error.message } as const;
    }
    return { sent: true } as const;
  } catch (error) {
    console.error("Unable to send transactional email:", error);
    return { sent: false, reason: "Email delivery failed." } as const;
  }
}

function unsubscribeSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET;
}

export function createMarketingUnsubscribeToken(userId: string) {
  const secret = unsubscribeSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function verifyMarketingUnsubscribeToken(userId: string, token: string) {
  const expected = createMarketingUnsubscribeToken(userId);
  if (!expected || !token) return false;
  const actual = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function sendMarketingEmail({ userId, to, name }: { userId: string; to: string; name?: string | null }) {
  const token = createMarketingUnsubscribeToken(userId);
  if (!token) return { sent: false, reason: "Marketing unsubscribe protection is not configured." } as const;
  const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim();
  if (!postalAddress) return { sent: false, reason: "Marketing sender address is not configured." } as const;
  const unsubscribeUrl = `${getAppUrl()}/api/public/marketing/unsubscribe?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const safePostalAddress = escapeHtml(postalAddress);
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  return sendTransactionalEmail({
    to,
    subject: "This week's local lead opportunity — KodarAI",
    title: "Find your next local client",
    preview: "A practical way to find businesses that need a stronger online presence.",
    body: `Hi ${firstName},\n\nEvery week, KodarAI helps you find local businesses that are missing a website and need a stronger online presence. Choose a plan when you are ready, then start building a focused prospect list in minutes.`,
    ctaLabel: "Explore KodarAI plans",
    ctaUrl: `${getAppUrl()}/billing`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    footerHtml: `You opted in to KodarAI lead ideas. <a href="${safeUnsubscribeUrl}" style="color:#52525b;">Unsubscribe from marketing emails</a>.<br />KodarAI, ${safePostalAddress}`,
  });
}

export async function sendUserTransactionalEmail(userId: string, email: Omit<TransactionalEmail, "to">) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    const recipient = data.user?.email?.trim().toLowerCase();
    if (error || !recipient) return { sent: false, reason: "User email was not found." } as const;
    return await sendTransactionalEmail({ ...email, to: recipient });
  } catch (error) {
    console.error("Unable to look up a transactional email recipient:", error);
    return { sent: false, reason: "User email was not found." } as const;
  }
}
