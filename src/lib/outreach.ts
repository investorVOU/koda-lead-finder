import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

export interface OutreachTemplate {
  id: string;
  label: string;
  channel: "whatsapp" | "email";
  subject?: string;
  build: (lead: SavedLead) => string;
}

const firstName = (name: string) => name.split(/[\s,&-]/)[0] || name;
const place = (lead: SavedLead) => lead.location || lead.address || "your area";
const niche = (lead: SavedLead) => (lead.category || "business").toLowerCase();

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: "wa-intro-nowebsite",
    label: "WhatsApp · No website intro",
    channel: "whatsapp",
    build: (l) =>
      `Hi ${firstName(l.business_name)} 👋\n\n` +
      `I came across ${l.business_name} on Google Maps while looking for ${niche(l)} services in ${place(l)}. ` +
      `You've got great reviews${l.rating ? ` (${l.rating.toFixed(1)}★)` : ""}, but I noticed you don't have a website yet.\n\n` +
      `I build clean, mobile-friendly websites that help ${niche(l)} businesses show up on Google and win more customers. ` +
      `Would you be open to a quick chat this week? I can even show you a free preview first. 🙌`,
  },
  {
    id: "wa-intro-general",
    label: "WhatsApp · General intro",
    channel: "whatsapp",
    build: (l) =>
      `Hello ${firstName(l.business_name)}! 👋\n\n` +
      `I help ${niche(l)} businesses in ${place(l)} get more bookings through better websites and online presence. ` +
      `I'd love to show you a few ideas tailored to ${l.business_name}.\n\n` +
      `Are you free for a 5-minute call today or tomorrow?`,
  },
  {
    id: "wa-followup",
    label: "WhatsApp · Follow-up",
    channel: "whatsapp",
    build: (l) =>
      `Hi again ${firstName(l.business_name)} 🙂\n\n` +
      `Just following up on my message about a website for ${l.business_name}. ` +
      `I've put together a free preview you can look at — no obligation at all.\n\n` +
      `Want me to send the link?`,
  },
  {
    id: "email-intro",
    label: "Email · Professional intro",
    channel: "email",
    subject: "A website idea for {business}",
    build: (l) =>
      `Hi ${firstName(l.business_name)},\n\n` +
      `I came across ${l.business_name} while researching ${niche(l)} businesses in ${place(l)}. ` +
      `Your reputation${l.rating ? ` (${l.rating.toFixed(1)}★ on Google)` : ""} is impressive, but a strong website could bring you even more customers.\n\n` +
      `I design fast, modern, mobile-friendly websites specifically for ${niche(l)} businesses. ` +
      `I'd be happy to put together a free preview so you can see exactly what it would look like — with no commitment.\n\n` +
      `Would you be open to a short call this week?\n\n` +
      `Best regards,\nYour name`,
  },
  {
    id: "email-followup",
    label: "Email · Follow-up",
    channel: "email",
    subject: "Following up — {business}",
    build: (l) =>
      `Hi ${firstName(l.business_name)},\n\n` +
      `Just circling back on my earlier note about a website for ${l.business_name}. ` +
      `I've prepared a free, no-obligation preview you're welcome to review.\n\n` +
      `Let me know if you'd like the link and I'll send it right over.\n\n` +
      `Best regards,\nYour name`,
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
