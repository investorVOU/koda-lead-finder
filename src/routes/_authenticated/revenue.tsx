import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Target, Trophy, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Kodarai" }] }),
  component: RevenuePage,
});

interface RawLead {
  status: string;
  deal_value: number;
  created_at: string;
}

function fmt(n: number) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  return "$" + n.toLocaleString();
}

function StatCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-xl ${accent ? "bg-primary/15" : "bg-accent"}`}>
          <Icon className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </span>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-3 text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-primary font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function RevenuePage() {
  const { user } = useAuth();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["revenue-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("status, deal_value, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RawLead[];
    },
  });

  const stats = useMemo(() => {
    if (!leads) return null;
    const total = leads.length;
    const paidLeads = leads.filter((l) => l.status === "paid");
    const closedLeads = leads.filter((l) => l.status === "closed" || l.status === "paid");
    const pipeline = leads.reduce((s, l) => s + (l.deal_value || 0), 0);
    const won = paidLeads.reduce((s, l) => s + (l.deal_value || 0), 0);
    const winRate = total > 0 ? Math.round((paidLeads.length / total) * 100) : 0;
    return { total, won, pipeline, winRate, closedLeads: closedLeads.length, paidCount: paidLeads.length };
  }, [leads]);

  const chartData = useMemo(() => {
    if (!leads) return [];
    const buckets: Record<string, number> = {};
    for (const lead of leads) {
      if ((lead.status === "paid" || lead.status === "closed") && lead.deal_value > 0) {
        const d = new Date(lead.created_at);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        buckets[key] = (buckets[key] ?? 0) + lead.deal_value;
      }
    }
    return Object.entries(buckets).map(([month, revenue]) => ({ month, revenue }));
  }, [leads]);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 0);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your deal pipeline and closed revenue over time.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label="Total won"
              value={fmt(stats?.won ?? 0)}
              sub={`${stats?.paidCount ?? 0} paid clients`}
              accent
            />
            <StatCard
              icon={TrendingUp}
              label="Pipeline value"
              value={fmt(stats?.pipeline ?? 0)}
              sub="All deals combined"
            />
            <StatCard
              icon={Target}
              label="Win rate"
              value={`${stats?.winRate ?? 0}%`}
              sub={`${stats?.closedLeads ?? 0} closed / ${stats?.total ?? 0} total`}
            />
            <StatCard
              icon={Trophy}
              label="Total leads"
              value={String(stats?.total ?? 0)}
              sub="Saved in pipeline"
            />
          </div>

          {/* Bar chart */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-6 text-base font-semibold">Closed Revenue by Month</h2>

            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="size-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No closed deals yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Move leads to <strong>Closed</strong> or <strong>Paid</strong> and add a deal value to see revenue here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={36} margin={{ left: 0, right: 0, bottom: 0, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmt(v)}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent)", radius: 8 }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.revenue === maxRevenue ? "var(--primary)" : "var(--primary)"}
                        opacity={entry.revenue === maxRevenue ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pipeline breakdown by status */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold">Pipeline by Stage</h2>
            <div className="space-y-3">
              {["new", "contacted", "proposal", "closed", "paid"].map((status) => {
                const statusLeads = leads?.filter((l) => l.status === status) ?? [];
                const statusValue = statusLeads.reduce((s, l) => s + (l.deal_value || 0), 0);
                const pct = stats?.pipeline ? Math.round((statusValue / stats.pipeline) * 100) : 0;
                const labels: Record<string, string> = { new: "New", contacted: "Contacted", proposal: "Proposal", closed: "Closed", paid: "Paid" };
                const colors: Record<string, string> = { new: "bg-muted-foreground/40", contacted: "bg-blue-500", proposal: "bg-amber-500", closed: "bg-purple-500", paid: "bg-primary" };
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{labels[status]}</span>
                      <span className="text-muted-foreground">{statusLeads.length} leads · {fmt(statusValue)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full transition-all ${colors[status]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
