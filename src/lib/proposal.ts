import { jsPDF } from "jspdf";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

export interface ProposalOptions {
  fromName: string;
  fromCompany: string;
  fromContact: string;
  packageName: string;
  price: string;
  timeline: string;
  scope: string;
}

const BRAND: [number, number, number] = [22, 163, 74];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const safe = (value: string) =>
  value
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

/** A deliberately small PDF: only selected scope items are printed. */
export function generateProposalPdf(lead: SavedLead, opts: ProposalOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;
  const add = (text: string, size = 10, color: [number, number, number] = MUTED) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe(text), width - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (size + 3);
  };
  const section = (title: string) => {
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(title, margin, y);
    doc.setDrawColor(...BRAND);
    doc.line(margin, y + 4, margin + 36, y + 4);
    y += 20;
  };
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, width, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.text(safe(opts.fromCompany) || "Website Proposal", margin, y);
  y += 22;
  add([safe(opts.fromName), safe(opts.fromContact)].filter(Boolean).join("  "), 10);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text("Website Proposal", margin, y);
  y += 24;
  add(`Prepared for: ${lead.business_name}`, 12, DARK);
  const context = [lead.category, lead.location || lead.address].filter(Boolean).join("  ");
  if (context) add(context);
  section("What I'll build");
  const items = safe(opts.scope)
    .split(/\n|/)
    .map((item) => safe(item.replace(/^-\s*/, "")))
    .filter(Boolean);
  if (items.length) items.forEach((item) => add(` ${item}`));
  else add("Website details to be agreed.");
  section("Price");
  add(safe(opts.price) || "To be agreed.");
  section("Delivery");
  add(safe(opts.timeline) || "To be agreed.");
  section("Next step");
  add(
    "If you are happy with the sample, we can agree the final details and I can complete the website for you.",
  );
  const footerY = doc.internal.pageSize.getHeight() - 32;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, footerY, width - margin, footerY);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Proposal generated with Kodarai", margin, footerY + 14);
  const filename =
    safe(lead.business_name)
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "website";
  doc.save(`proposal-${filename}.pdf`);
}
