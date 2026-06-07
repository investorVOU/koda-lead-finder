import type { SavedLead } from "@/components/dashboard/SavedLeadCard";
import { STATUS_LABELS } from "@/lib/constants";

function escapeCsv(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const EXPORT_COLUMNS: { header: string; get: (l: SavedLead) => string | number | null }[] =
  [
    { header: "Business", get: (l) => l.business_name },
    { header: "Category", get: (l) => l.category },
    { header: "Location", get: (l) => l.location },
    { header: "Address", get: (l) => l.address },
    { header: "Phone", get: (l) => l.phone },
    { header: "Rating", get: (l) => l.rating },
    { header: "Reviews", get: (l) => l.review_count },
    { header: "Has website", get: (l) => (l.has_website ? "Yes" : "No") },
    { header: "Status", get: (l) => STATUS_LABELS[l.status] ?? l.status },
    { header: "Deal value", get: (l) => l.deal_value ?? 0 },
    { header: "Maps URL", get: (l) => l.maps_url },
  ];

export function exportLeadsToCsv(
  leads: SavedLead[],
  selectedHeaders: Set<string> = new Set(EXPORT_COLUMNS.map((c) => c.header)),
  filename = "kodarai-leads.csv",
) {
  const columns = EXPORT_COLUMNS.filter((c) => selectedHeaders.has(c.header));
  const rows = [
    columns.map((c) => c.header).join(","),
    ...leads.map((l) => columns.map((c) => escapeCsv(c.get(l))).join(",")),
  ];
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
