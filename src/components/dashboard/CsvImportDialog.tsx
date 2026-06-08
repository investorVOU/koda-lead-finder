import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, Loader2, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

// Column auto-detection aliases
const FIELD_ALIASES: Record<string, string[]> = {
  business_name: ["business_name", "name", "business", "company", "company_name", "store"],
  phone: ["phone", "tel", "telephone", "mobile", "contact", "phone_number"],
  address: ["address", "location", "street", "full_address", "addr"],
  category: ["category", "type", "industry", "niche", "business_type"],
  rating: ["rating", "stars", "score", "google_rating"],
  location: ["location", "city", "area", "region", "town"],
};

function detectColumn(headers: string[], field: string): string | null {
  const aliases = FIELD_ALIASES[field] ?? [field];
  const lower = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, "_"));
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h === alias || h.includes(alias));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

interface ColumnMap {
  business_name: string;
  phone: string;
  address: string;
  category: string;
  rating: string;
  location: string;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({ business_name: "", phone: "", address: "", category: "", rating: "", location: "" });
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setHeaders([]);
    setRows([]);
    setColMap({ business_name: "", phone: "", address: "", category: "", rating: "", location: "" });
    setImporting(false);
    setDone(0);
    setFileName("");
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hdrs = result.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(result.data.slice(0, 200)); // cap at 200 for preview+import
        // Auto-detect columns
        setColMap({
          business_name: detectColumn(hdrs, "business_name") ?? "",
          phone: detectColumn(hdrs, "phone") ?? "",
          address: detectColumn(hdrs, "address") ?? "",
          category: detectColumn(hdrs, "category") ?? "",
          rating: detectColumn(hdrs, "rating") ?? "",
          location: detectColumn(hdrs, "location") ?? "",
        });
      },
      error: (err) => {
        toast.error("Failed to parse CSV: " + err.message);
      },
    });
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) parseFile(file);
    else toast.error("Please drop a .csv file");
  };

  const doImport = async () => {
    if (!colMap.business_name) {
      toast.error("Please map the Business Name column");
      return;
    }
    setImporting(true);
    const records = rows
      .map((row) => ({
        user_id: user!.id,
        business_name: row[colMap.business_name]?.trim() || "",
        phone: colMap.phone ? row[colMap.phone]?.trim() || null : null,
        address: colMap.address ? row[colMap.address]?.trim() || null : null,
        category: colMap.category ? row[colMap.category]?.trim() || null : null,
        location: colMap.location ? row[colMap.location]?.trim() || null : null,
        rating: colMap.rating ? parseFloat(row[colMap.rating]) || null : null,
        review_count: 0,
        has_website: false,
        status: "new" as const,
        deal_value: 0,
      }))
      .filter((r) => r.business_name.length > 0);

    // Batch insert in chunks of 50
    let imported = 0;
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);
      const { error } = await supabase.from("saved_leads").insert(chunk);
      if (error) {
        toast.error(`Import failed at row ${i + 1}: ${error.message}`);
        break;
      }
      imported += chunk.length;
    }

    setImporting(false);
    setDone(imported);
    queryClient.invalidateQueries({ queryKey: ["saved-leads", user?.id] });
    toast.success(`Imported ${imported} leads to your pipeline!`);
    onImported?.();
  };

  const validRows = rows.filter((r) => r[colMap.business_name]?.trim());
  const previewRows = validRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" /> Import Leads from CSV
          </DialogTitle>
          <DialogDescription>
            Upload your own list — Kodarai will add them to your pipeline instantly.
          </DialogDescription>
        </DialogHeader>

        {done > 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="size-8 text-primary" />
            </span>
            <p className="text-xl font-bold">{done} leads imported!</p>
            <p className="text-sm text-muted-foreground">They're in your Saved Leads pipeline under "New".</p>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          </div>
        ) : headers.length === 0 ? (
          /* ── Drop zone ── */
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/40"}`}
          >
            <Upload className={`size-10 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold">Drop your CSV here or click to browse</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Columns: <code className="rounded bg-muted px-1 text-xs">name</code>,{" "}
                <code className="rounded bg-muted px-1 text-xs">phone</code>,{" "}
                <code className="rounded bg-muted px-1 text-xs">address</code>,{" "}
                <code className="rounded bg-muted px-1 text-xs">category</code> and more — headers auto-detected
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          </div>
        ) : (
          /* ── Mapping + Preview ── */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{fileName} — <span className="text-muted-foreground">{validRows.length} valid rows</span></p>
              <Button variant="ghost" size="sm" onClick={reset}><X className="size-3.5 mr-1" />Clear</Button>
            </div>

            {/* Column mapping */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Column Mapping</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {(Object.keys(colMap) as Array<keyof ColumnMap>).map((field) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground capitalize">
                      {field.replace(/_/g, " ")}{field === "business_name" && <span className="text-destructive"> *</span>}
                    </label>
                    <select
                      value={colMap[field]}
                      onChange={(e) => setColMap((m) => ({ ...m, [field]: e.target.value }))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Preview (first {previewRows.length} rows)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {["business_name", "phone", "address", "category", "location"].map((f) => (
                          <th key={f} className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {f.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2 font-medium">{row[colMap.business_name] || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{colMap.phone ? row[colMap.phone] || "—" : "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{colMap.address ? row[colMap.address] || "—" : "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{colMap.category ? row[colMap.category] || "—" : "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{colMap.location ? row[colMap.location] || "—" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!colMap.business_name && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" /> Map the "Business name" column to continue.
              </div>
            )}

            <Button variant="hero" className="w-full" onClick={doImport} disabled={importing || !colMap.business_name || validRows.length === 0}>
              {importing ? <><Loader2 className="size-4 animate-spin" /> Importing…</> : `Import ${validRows.length} leads →`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
