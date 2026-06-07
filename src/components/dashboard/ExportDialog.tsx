import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportLeadsToCsv, EXPORT_COLUMNS } from "@/lib/csv";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

export function ExportDialog({
  open,
  onOpenChange,
  leads,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leads: SavedLead[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.map((c) => c.header)),
  );
  const [statusFilter, setStatusFilter] = useState("all");

  const toggle = (header: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(header) ? next.delete(header) : next.add(header);
      return next;
    });

  const filtered =
    statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);

  const doExport = (openSheets: boolean) => {
    exportLeadsToCsv(filtered, selected);
    if (openSheets) {
      window.open("https://sheets.new", "_blank", "noopener,noreferrer");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
          <DialogDescription>Choose pipeline stage and columns to export.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Pipeline stage</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages ({leads.length} leads)</SelectItem>
                {LEAD_STATUSES.map((s) => {
                  const count = leads.filter((l) => l.status === s).length;
                  return count > 0 ? (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]} ({count})
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Columns to include</p>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_COLUMNS.map((col) => (
                <div key={col.header} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col.header}`}
                    checked={selected.has(col.header)}
                    onCheckedChange={() => toggle(col.header)}
                  />
                  <Label htmlFor={`col-${col.header}`} className="cursor-pointer text-xs">
                    {col.header}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} · {selected.size} column
            {selected.size !== 1 ? "s" : ""}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => doExport(false)}
              disabled={selected.size === 0 || filtered.length === 0}
            >
              <Download className="size-4" /> Download CSV
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={() => doExport(true)}
              disabled={selected.size === 0 || filtered.length === 0}
            >
              <ExternalLink className="size-4" /> Open in Sheets
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Google Sheets will open. Use File → Import → Upload to load your CSV.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
