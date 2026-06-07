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

// Kodarai brand green (approx of the oklch primary token) as RGB.
const BRAND: [number, number, number] = [22, 163, 74];
const DARK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];

export function generateProposalPdf(lead: SavedLead, opts: ProposalOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.text(opts.fromCompany || "Website Proposal", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  y += 18;
  const meta = [opts.fromName, opts.fromContact].filter(Boolean).join("  ·  ");
  if (meta) doc.text(meta, margin, y);
  doc.text(new Date().toLocaleDateString(), pageW - margin, y, { align: "right" });

  // Title
  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text("Website Proposal", margin, y);

  y += 22;
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(`Prepared for: ${lead.business_name}`, margin, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const details = [lead.category, lead.location || lead.address].filter(Boolean).join("  ·  ");
  if (details) {
    doc.text(details, margin, y);
    y += 14;
  }
  if (lead.rating != null) {
    doc.text(`Google rating: ${lead.rating.toFixed(1)} stars (${lead.review_count} reviews)`, margin, y);
    y += 14;
  }

  const section = (title: string) => {
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(title, margin, y);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1);
    doc.line(margin, y + 4, margin + 36, y + 4);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 13;
  };

  section("Overview");
  paragraph(
    `${lead.business_name} has built a strong reputation${
      lead.rating != null ? ` with a ${lead.rating.toFixed(1)}-star Google rating` : ""
    }. A modern, mobile-friendly website will help convert that reputation into more enquiries, bookings, and revenue — and make it easy for new customers in ${
      lead.location || "your area"
    } to find and trust you.`,
  );

  section("Scope of work");
  paragraph(opts.scope || "Custom website design, mobile optimisation, contact and booking integration, Google Maps embed, and basic SEO setup.");

  section("Package");
  paragraph(`${opts.packageName || "Professional Website"} — ${opts.price || "Contact for pricing"}`);

  section("Timeline");
  paragraph(opts.timeline || "Estimated 1–2 weeks from kickoff to launch.");

  section("Next steps");
  paragraph(
    `Reply to confirm and we'll send over a free preview of your new website. Once approved, work begins immediately. ${
      opts.fromContact ? `Questions? Reach me at ${opts.fromContact}.` : ""
    }`,
  );

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 32;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Proposal generated with Kodarai", margin, footerY + 14);

  const safeName = lead.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`proposal-${safeName}.pdf`);
}
