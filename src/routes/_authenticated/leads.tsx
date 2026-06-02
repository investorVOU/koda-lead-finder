import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SavedLeadCard, type SavedLead } from "@/components/dashboard/SavedLeadCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Saved Leads — KodaRai" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const { user } = useAuth();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["saved-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedLead[];
    },
  });

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your pipeline from first contact to closed deal.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !leads || leads.length === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LEAD_STATUSES.map((status) => {
            const items = leads.filter((l) => l.status === status);
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
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
