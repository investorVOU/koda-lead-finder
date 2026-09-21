import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

export interface OutreachTemplate {
  id: string;
  label: string;
  channel: "whatsapp" | "email";
  subject?: string;
  build: (lead: SavedLead) => string;
}

const firstName = (name: string) => name.split(/[\s,&-]/)[0] || name;
const niche = (lead: SavedLead) => (lead.category || "business").toLowerCase();

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: "wa-intro-nowebsite",
    label: "WhatsApp · No website intro",
    channel: "whatsapp",
    build: (lead) =>
      `Hi ${firstName(lead.business_name)},\n\n` +
      `I came across your business while researching businesses online. I noticed you don't have a website yet, so I made a quick sample to show what your business could look like online.\n\n` +
      `Can I send it to you?`,
  },
  {
    id: "wa-intro-general",
    label: "WhatsApp · General intro",
    channel: "whatsapp",
    build: (lead) =>
      `Hello ${firstName(lead.business_name)},\n\n` +
      `I came across your business while researching businesses online. I have a few website ideas that could help ${lead.business_name} show up clearly online.\n\n` +
      `Would you be open to a quick chat this week?`,
  },
  {
    id: "wa-followup",
    label: "WhatsApp · Follow-up",
    channel: "whatsapp",
    build: (lead) =>
      `Hi again ${firstName(lead.business_name)},\n\n` +
      `Just following up on my message about a website for ${lead.business_name}. I've put together a free preview you can look at — no obligation.\n\n` +
      `Would you like me to send the link?`,
  },
  {
    id: "email-intro",
    label: "Email · Professional intro",
    channel: "email",
    subject: "A website idea for {business}",
    build: (lead) =>
      `Hi ${firstName(lead.business_name)},\n\n` +
      `I came across ${lead.business_name} while researching businesses online. Your reputation${lead.rating ? ` (${lead.rating.toFixed(1)}★ on Google)` : ""} is impressive, and a stronger website could help more people find what you offer.\n\n` +
      `I design fast, modern, mobile-friendly websites for ${niche(lead)} businesses. I'd be happy to put together a free preview so you can see what it could look like — with no commitment.\n\n` +
      `Would you be open to a short call this week?\n\nBest regards,\nYour name`,
  },
  {
    id: "email-followup",
    label: "Email · Follow-up",
    channel: "email",
    subject: "Following up — {business}",
    build: (lead) =>
      `Hi ${firstName(lead.business_name)},\n\n` +
      `Just circling back on my earlier note about a website for ${lead.business_name}. I've prepared a free, no-obligation preview you're welcome to review.\n\n` +
      `Let me know if you'd like the link and I'll send it right over.\n\nBest regards,\nYour name`,
  },
];

export function buildSubject(template: OutreachTemplate, lead: SavedLead) {
  return (template.subject ?? "").replace("{business}", lead.business_name);
}

const digitsOnly = (phone: string) => phone.replace(/[^\d]/g, "");

export function whatsappLink(lead: SavedLead, message: string) {
  const phone = lead.phone ? digitsOnly(lead.phone) : "";
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(lead: SavedLead, template: OutreachTemplate, message: string) {
  const subject = encodeURIComponent(buildSubject(template, lead));
  return `mailto:?subject=${subject}&body=${encodeURIComponent(message)}`;
}
