import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, Loader2, Download, Upload, Bell, Lock } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SavedLeadCard, type SavedLead } from "@/components/dashboard/SavedLeadCard";
import { LeadStats } from "@/components/dashboard/LeadStats";
import { ExportDialog } from "@/components/dashboard/ExportDialog";
import { CsvImportDialog } from "@/components/dashboard/CsvImportDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { hasPlanAccess, type PaidPlanId } from "@/lib/billing";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { UpgradeDialog } from "@/components/dashboard/UpgradeDialog";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Saved Leads — Kodarai" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const { user } = useAuth();
  const { data: subscription } = useSubscription(user?.id);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [upgrade, setUpgrade] = useState<{ feature: string; plan: PaidPlanId } | null>(null);

  const activeSubscription = subscription?.status === "active" || subscription?.status === "canceling";
  const canExport = activeSubscription && hasPlanAccess(subscription?.plan, "pro");
  const canImport = activeSubscription && hasPlanAccess(subscription?.plan, "agency");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["saved-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // follow_up_at added by migration 20260608000000_follow_up_referral.sql
      return (data as unknown) as SavedLead[];
    },
  });

  const hasLeads = !!leads && leads.length > 0;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Saved Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your pipeline from first contact to paid client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => (canImport ? setImportOpen(true) : setUpgrade({ feature: "Bulk CSV lead import", plan: "agency" }))}>
            {canImport ? <Upload className="size-4" /> : <Lock className="size-4" />} Import CSV
          </Button>
          {hasLeads && (
            <Button variant="outline" size="sm" onClick={() => (canExport ? setExportOpen(true) : setUpgrade({ feature: "Lead CSV exports", plan: "pro" }))}>
              {canExport ? <Download className="size-4" /> : <Lock className="size-4" />} Export
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !hasLeads ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Bookmark className="size-6" />
          </span>
          <h3 className="mt-4 font-semibold">No saved leads yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Save leads from the Lead Finder to start building your pipeline.
          </p>
        </div>
      ) : (
        <>
          <LeadStats leads={leads!} />

          {/* Due-today / overdue banner */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = leads!.filter((l) => {
              if (!l.follow_up_at) return false;
              const d = new Date(l.follow_up_at);
              d.setHours(0, 0, 0, 0);
              return d <= today;
            });
            if (due.length === 0) return null;
            return (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <Bell className="size-4 shrink-0 text-amber-500" />
                <span>
                  <strong className="text-foreground">{due.length} lead{due.length !== 1 ? "s" : ""}</strong>{" "}
                  <span className="text-muted-foreground">due for follow-up today or overdue.</span>
                </span>
              </div>
            );
          })()}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {LEAD_STATUSES.map((status) => {
              const items = leads!.filter((l) => l.status === status);
              return (
                <div key={status} className="rounded-2xl bg-secondary/40 p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((lead) => (
                      <SavedLeadCard key={lead.id} lead={lead} />
                    ))}
                    {items.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                        Nothing here yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasLeads && (
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} leads={leads!} />
      )}
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <UpgradeDialog
        open={upgrade !== null}
        onOpenChange={(open) => !open && setUpgrade(null)}
        feature={upgrade?.feature}
        requiredPlan={upgrade?.plan}
      />
    </DashboardShell>
  );
}
