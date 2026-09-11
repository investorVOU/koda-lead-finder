import { Resend } from "resend";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

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

export type WelcomeAuthMethod =
  | "email"
  | "google";

export const PLAN_ACTIVATION_CAMPAIGNS = [
  "plan-activation-6h",
  "plan-activation-24h",
  "plan-activation-3d",
  "plan-activation-7d",
] as const;

export type PlanActivationCampaignKey =
  (typeof PLAN_ACTIVATION_CAMPAIGNS)[number];

const WELCOME_EMAIL_SENT_KEY =
  "kodarai_welcome_email_sent_at";

function escapeHtml(
  value: string,
) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ??
      character,
  );
}

function getAppUrl() {
  return (
    process.env.APP_URL ||
    "https://kodarai.xyz"
  ).replace(/\/$/, "");
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
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      reason:
        "Email is not configured.",
    } as const;
  }

  const actionUrl =
    ctaUrl || getAppUrl();

  const safeTitle =
    escapeHtml(title);

  const safePreview =
    escapeHtml(preview);

  const safeBody =
    escapeHtml(body).replace(
      /\n/g,
      "<br />",
    );

  const safeCtaLabel =
    escapeHtml(
      ctaLabel ||
        "Open KodarAI",
    );

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f7f9;color:#171717;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${safePreview}
    </div>

    <main style="max-width:600px;margin:32px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:22px 28px;border-bottom:1px solid #e5e7eb;font-size:18px;font-weight:700;">
        KodarAI
      </div>

      <div style="padding:28px;">
        <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;">
          ${safeTitle}
        </h1>

        <p style="margin:0;color:#52525b;font-size:15px;line-height:1.65;">
          ${safeBody}
        </p>

        <p style="margin:24px 0 0;">
          <a
            href="${escapeHtml(actionUrl)}"
            style="display:inline-block;background:#076b3a;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;"
          >
            ${safeCtaLabel}
          </a>
        </p>
      </div>

      <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #e5e7eb;color:#71717a;font-size:12px;line-height:1.5;">
        ${
          footerHtml ||
          "This is a transactional KodarAI notification."
        }
      </div>
    </main>
  </body>
</html>`;

  try {
    const resend =
      new Resend(apiKey);

    const { error } =
      await resend.emails.send({
        from,
        to: [to],
        subject,
        html,

        text: `${title}

${body}

${safeCtaLabel}: ${actionUrl}`,

        headers,
      });

    if (error) {
      console.error(
        "Unable to send transactional email:",
        error.message,
      );

      return {
        sent: false,
        reason: error.message,
      } as const;
    }

    return {
      sent: true,
    } as const;
  } catch (error) {
    console.error(
      "Unable to send transactional email:",
      error,
    );

    return {
      sent: false,
      reason:
        "Email delivery failed.",
    } as const;
  }
}

function unsubscribeSecret() {
  return process.env
    .EMAIL_UNSUBSCRIBE_SECRET;
}

export function createMarketingUnsubscribeToken(
  userId: string,
) {
  const secret =
    unsubscribeSecret();

  if (!secret) {
    return null;
  }

  return createHmac(
    "sha256",
    secret,
  )
    .update(userId)
    .digest("hex");
}

export function verifyMarketingUnsubscribeToken(
  userId: string,
  token: string,
) {
  const expected =
    createMarketingUnsubscribeToken(
      userId,
    );

  if (
    !expected ||
    !token
  ) {
    return false;
  }

  const actual =
    Buffer.from(token);

  const expectedBuffer =
    Buffer.from(expected);

  return (
    actual.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      actual,
      expectedBuffer,
    )
  );
}

export function createMarketingCampaignToken(
  userId: string,
  campaignKey: PlanActivationCampaignKey,
) {
  const secret = unsubscribeSecret();

  if (!secret) {
    return null;
  }

  return createHmac(
    "sha256",
    secret,
  )
    .update(`campaign:${campaignKey}:${userId}`)
    .digest("hex");
}

export function verifyMarketingCampaignToken(
  userId: string,
  campaignKey: PlanActivationCampaignKey,
  token: string,
) {
  const expected = createMarketingCampaignToken(
    userId,
    campaignKey,
  );

  if (!expected || !token) {
    return false;
  }

  const actual = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function sendMarketingEmail({
  userId,
  to,
  name,
}: {
  userId: string;
  to: string;
  name?: string | null;
}) {
  const token =
    createMarketingUnsubscribeToken(
      userId,
    );

  if (!token) {
    return {
      sent: false,
      reason:
        "Marketing unsubscribe protection is not configured.",
    } as const;
  }

  const postalAddress =
    process.env.MARKETING_POSTAL_ADDRESS?.trim();

  if (!postalAddress) {
    return {
      sent: false,
      reason:
        "Marketing sender address is not configured.",
    } as const;
  }

  const unsubscribeUrl =
    `${getAppUrl()}/api/public/marketing/unsubscribe` +
    `?user=${encodeURIComponent(userId)}` +
    `&token=${encodeURIComponent(token)}`;

  const safeUnsubscribeUrl =
    escapeHtml(
      unsubscribeUrl,
    );

  const safePostalAddress =
    escapeHtml(
      postalAddress,
    );

  const firstName =
    name
      ?.trim()
      .split(/\s+/)[0] ||
    "there";

  return sendTransactionalEmail({
    to,

    subject:
      "This week's local lead opportunity — KodarAI",

    title:
      "Find your next local client",

    preview:
      "A practical way to find businesses that need a stronger online presence.",

    body:
      `Hi ${firstName},\n\n` +
      `Every week, KodarAI helps you find local businesses that are missing a website and need a stronger online presence. ` +
      `Choose a plan when you are ready, then start building a focused prospect list in minutes.`,

    ctaLabel:
      "Explore KodarAI plans",

    ctaUrl:
      `${getAppUrl()}/billing`,

    headers: {
      "List-Unsubscribe":
        `<${unsubscribeUrl}>`,

      "List-Unsubscribe-Post":
        "List-Unsubscribe=One-Click",
    },

    footerHtml:
      `You opted in to KodarAI lead ideas. ` +
      `<a href="${safeUnsubscribeUrl}" style="color:#52525b;">Unsubscribe from marketing emails</a>.` +
      `<br />KodarAI, ${safePostalAddress}`,
  });
}

const planActivationCopy: Record<
  PlanActivationCampaignKey,
  {
    subject: string;
    title: string;
    preview: string;
    body: string;
  }
> = {
  "plan-activation-6h": {
    subject: "Find a business. Build a sample. Get paid.",
    title: "Your next client could start with one search",
    preview: "Find businesses with weak websites, build a sample, and start a client conversation.",
    body:
      "You joined KodarAI to find clients, not another tool to learn.\n\n" +
      "Use Finder to spot businesses with weak or missing websites. Build them a sample in Studio. Then give the owner something real to react to.\n\n" +
      "One good website client can be worth far more than the cost of getting started.",
  },
  "plan-activation-24h": {
    subject: "Choose the route to your next paid client",
    title: "A simple way to start pitching",
    preview: "Pick the setup that matches how you want to find and win clients.",
    body:
      "You do not need a huge audience or more referrals to start.\n\n" +
      "Choose a monthly plan for the full KodarAI workflow, or start with a lead pack when you only need businesses to pitch now.\n\n" +
      "The goal is simple: find a business, show a better website, and turn the conversation into paid work.",
  },
  "plan-activation-3d": {
    subject: "A 15-minute plan to find your next client",
    title: "Find three businesses worth pitching",
    preview: "A practical first move for turning your web skills into client opportunities.",
    body:
      "Here is a practical first session:\n\n" +
      "1. Search one city and niche in Finder\n" +
      "2. Save three businesses with weak websites\n" +
      "3. Build one sample site in Studio\n" +
      "4. Send the owner a short, specific pitch\n\n" +
      "You are not waiting for work to appear. You are creating a reason for a business owner to talk to you.",
  },
  "plan-activation-7d": {
    subject: "Still looking for your next website client?",
    title: "Your plan is waiting when you are ready",
    preview: "Turn local-business research into client conversations you can act on.",
    body:
      "KodarAI is ready when you are.\n\n" +
      "Start with a focused search, find a business that needs a stronger web presence, and show them what better could look like. That is the first step toward a paid website project.",
  },
};

export async function sendPlanActivationEmail({
  userId,
  to,
  name,
  campaignKey,
}: {
  userId: string;
  to: string;
  name?: string | null;
  campaignKey: PlanActivationCampaignKey;
}) {
  const unsubscribeToken = createMarketingUnsubscribeToken(userId);
  const campaignToken = createMarketingCampaignToken(userId, campaignKey);
  const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim();

  if (!unsubscribeToken || !campaignToken || !postalAddress) {
    return {
      sent: false,
      reason: "Marketing email configuration is incomplete.",
    } as const;
  }

  const unsubscribeUrl = `${getAppUrl()}/api/public/marketing/unsubscribe?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(unsubscribeToken)}`;
  const clickUrl = `${getAppUrl()}/api/public/marketing/click?user=${encodeURIComponent(userId)}&campaign=${encodeURIComponent(campaignKey)}&token=${encodeURIComponent(campaignToken)}`;
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  const copy = planActivationCopy[campaignKey];

  return sendTransactionalEmail({
    to,
    subject: copy.subject,
    title: copy.title,
    preview: copy.preview,
    body: `Hi ${firstName},\n\n${copy.body}`,
    ctaLabel: "Choose a plan",
    ctaUrl: clickUrl,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    footerHtml:
      `You are receiving this because you signed up for KodarAI and reached plan selection. ` +
      `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#52525b;">Unsubscribe from these emails</a>.` +
      `<br />KodarAI, ${escapeHtml(postalAddress)}`,
  });
}

export async function sendUserTransactionalEmail(
  userId: string,
  email: Omit<
    TransactionalEmail,
    "to"
  >,
) {
  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId,
      );

    const recipient =
      data.user?.email
        ?.trim()
        .toLowerCase();

    if (
      error ||
      !recipient
    ) {
      return {
        sent: false,
        reason:
          "User email was not found.",
      } as const;
    }

    return await sendTransactionalEmail({
      ...email,
      to: recipient,
    });
  } catch (error) {
    console.error(
      "Unable to look up a transactional email recipient:",
      error,
    );

    return {
      sent: false,
      reason:
        "User email was not found.",
    } as const;
  }
}

/**
 * Sends the one-time account welcome email.
 *
 * Duplicate protection is stored inside Supabase app_metadata,
 * which normal browser users cannot modify themselves.
 */
export async function sendWelcomeEmailForUser(
  userId: string,
  authMethod: WelcomeAuthMethod,
) {
  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId,
      );

    if (
      error ||
      !data.user
    ) {
      return {
        sent: false,
        reason:
          "User was not found.",
      } as const;
    }

    const user =
      data.user;

    const alreadySent =
      user.app_metadata?.[
        WELCOME_EMAIL_SENT_KEY
      ];

    if (alreadySent) {
      return {
        sent: false,
        skipped: true,
        reason:
          "Welcome email was already sent.",
      } as const;
    }

    const recipient =
      user.email
        ?.trim()
        .toLowerCase();

    if (!recipient) {
      return {
        sent: false,
        reason:
          "User email was not found.",
      } as const;
    }

    const rawName =
      typeof user.user_metadata
        ?.full_name ===
      "string"
        ? user.user_metadata
            .full_name
        : typeof user
              .user_metadata
              ?.name ===
            "string"
          ? user.user_metadata
              .name
          : "";

    const firstName =
      rawName
        .trim()
        .split(/\s+/)[0] ||
      "there";

    const appUrl =
      getAppUrl();

    const loginUrl =
      `${appUrl}/login`;

    const dashboardUrl =
      `${appUrl}/dashboard`;

    const fromAdFunnel =
      user.user_metadata
        ?.acquisition_source ===
      "ads";

    const methodLabel =
      authMethod ===
      "google"
        ? "Google"
        : "email and password";

    const intro =
      fromAdFunnel
        ? "Your KodarAI account is ready — and so is the plan you started building."
        : "Your KodarAI account is ready.";

    const confirmationNote =
      authMethod ===
      "email"
        ? "\n\nIf KodarAI asked you to confirm your email address, complete that confirmation first before signing in."
        : "";

    const result =
      await sendTransactionalEmail({
        to: recipient,

        subject:
          "Welcome to KodarAI 👋",

        title:
          `Welcome to KodarAI, ${firstName}`,

        preview:
          "Your KodarAI account is ready. Start finding businesses, building websites and creating new opportunities.",

        body:
          `Hi ${firstName},\n\n` +
          `${intro}\n\n` +
          `KodarAI helps you find businesses that need a stronger online presence, build websites you can show them, and turn those opportunities into paying clients.\n\n` +
          `Here's a simple way to get started:\n\n` +
          `1. Find a business using Finder\n` +
          `2. Pick one that needs a better website\n` +
          `3. Build a sample website in Studio\n` +
          `4. Contact the owner and show them what you made\n\n` +
          `Account email: ${recipient}\n` +
          `Sign-in method: ${methodLabel}\n` +
          `Login: ${loginUrl}` +
          `${confirmationNote}\n\n` +
          `If you need help, use Support inside KodarAI.`,

        ctaLabel:
          fromAdFunnel
            ? "Find my first business"
            : "Open KodarAI",

        ctaUrl:
          dashboardUrl,

        footerHtml:
          `You're receiving this because a KodarAI account was created for this email address. ` +
          `<a href="${escapeHtml(loginUrl)}" style="color:#076b3a;">Sign in to KodarAI</a>.`,
      });

    if (!result.sent) {
      return result;
    }

    const nextAppMetadata =
      {
        ...(user.app_metadata ??
          {}),

        [WELCOME_EMAIL_SENT_KEY]:
          new Date().toISOString(),
      };

    const {
      error:
        updateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata:
            nextAppMetadata,
        },
      );

    if (updateError) {
      /*
       * Email was delivered already.
       *
       * Log marker failure, but do not report
       * the actual email delivery as failed.
       */
      console.error(
        "Welcome email sent, but unable to save welcome marker:",
        updateError.message,
      );
    }

    return {
      sent: true,
    } as const;
  } catch (error) {
    console.error(
      "Unable to send welcome email:",
      error,
    );

    return {
      sent: false,
      reason:
        "Welcome email delivery failed.",
    } as const;
  }
}
