import process from "node:process";

const GRAPH_API_VERSION = "v23.0";

type CheckoutReminder = {
  to: string;
  firstName: string;
  planName: string;
};

function config() {
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_CHECKOUT_TEMPLATE?.trim() || "checkout_reminder";
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en_US";
  return { accessToken, phoneNumberId, templateName, templateLanguage };
}

export function whatsappConfigured() {
  const { accessToken, phoneNumberId } = config();
  return Boolean(accessToken && phoneNumberId);
}

/**
 * Sends a Meta-approved, business-initiated template. Create this template in
 * WhatsApp Manager before enabling the environment variables:
 *
 * Hi {{1}}, you started activating {{2}} on KodarAI but payment was not completed.
 * Complete setup when you are ready.
 */
export async function sendCheckoutRecoveryWhatsApp(message: CheckoutReminder) {
  const { accessToken, phoneNumberId, templateName, templateLanguage } = config();
  if (!accessToken || !phoneNumberId) {
    return { sent: false, reason: "WhatsApp Cloud API is not configured." } as const;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: message.firstName },
                { type: "text", text: message.planName },
              ],
            }],
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("WhatsApp checkout reminder failed:", response.status, detail.slice(0, 500));
      return { sent: false, reason: "WhatsApp delivery failed." } as const;
    }

    return { sent: true } as const;
  } catch (error) {
    console.error("WhatsApp checkout reminder failed:", error);
    return { sent: false, reason: "WhatsApp delivery failed." } as const;
  }
}
