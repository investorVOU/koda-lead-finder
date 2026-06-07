import { TrendingUp, CheckCircle2, DollarSign, Users } from "lucide-react";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function LeadStats({ leads }: { leads: SavedLead[] }) {
  const total = leads.length;
  const won = leads.filter((l) => l.status === "closed" || l.status === "paid");
  const paid = leads.filter((l) => l.status === "paid");
  const earnings = paid.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
  const pipelineValue = won.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
  const conversion = total > 0 ? Math.round((won.length / total) * 100) : 0;

  const monthStart = startOfMonth();
  // Note: created_at is the save date; used as a proxy for monthly activity.
  const newThisMonth = leads.filter((l) => {
    const created = (l as SavedLead & { created_at?: string }).created_at;
    return created ? new Date(created).getTime() >= monthStart : false;
  }).length;

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const cards = [
    {
      label: "Estimated earnings",
      value: fmt(earnings),
      sub: `${paid.length} paid client${paid.length === 1 ? "" : "s"}`,
      icon: DollarSign,
    },
    {
      label: "Deals won",
      value: String(won.length),
      sub: `${fmt(pipelineValue)} total value`,
      icon: CheckCircle2,
    },
    {
      label: "Conversion rate",
      value: `${conversion}%`,
      sub: `${total} lead${total === 1 ? "" : "s"} tracked`,
      icon: TrendingUp,
    },
    {
      label: "New this month",
      value: String(newThisMonth),
      sub: "leads saved",
      icon: Users,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <c.icon className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
