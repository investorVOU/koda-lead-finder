/**
 * SMS parsing utilities — safe for both client and server.
 * No process.env, no fetch, no server-only imports.
 */

const OTP_PATTERNS = [
  /\b(\d{6})\b/,                             // 6-digit (most common)
  /\b(\d{4})\b/,                             // 4-digit
  /code[:\s]+(\d{4,8})/i,
  /OTP[:\s]+(\d{4,8})/i,
  /verification code[:\s]+(\d{4,8})/i,
  /\b(?:is|:)\s*(\d{4,8})/i,
  /your.*?(\d{4,8})/i,
];

export function extractOTP(body: string): string | null {
  for (const pattern of OTP_PATTERNS) {
    const m = body.match(pattern);
    if (m?.[1]) return m[1];
  }
  return null;
}

const SERVICE_SENDERS: Record<string, string> = {
  "+14155238886": "WhatsApp",
  "+12029702060": "WhatsApp",
  "+16692002773": "WhatsApp",
  "+447903561234": "WhatsApp UK",
  "+16505551234": "Instagram",
  "+12025551234": "Facebook",
  "+18005551234": "Google",
  "+15005550006": "Twilio Test",
};

export function detectService(senderNumber: string): string | null {
  return SERVICE_SENDERS[senderNumber] ?? null;
}
