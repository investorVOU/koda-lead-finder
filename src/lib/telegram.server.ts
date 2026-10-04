import { timingSafeEqual } from "node:crypto";

const API = "https://api.telegram.org";

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_OPERATOR_CHAT_ID);
}

export function operatorChatId() {
  return Number(process.env.TELEGRAM_OPERATOR_CHAT_ID);
}

export function verifyTelegramSecret(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function telegramCall<T = any>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: T };
    return json.ok ? (json.result ?? null) : null;
  } catch {
    return null;
  }
}

export function sendTelegram(text: string, extra: Record<string, unknown> = {}) {
  return telegramCall<{ message_id: number }>("sendMessage", {
    chat_id: operatorChatId(),
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}
