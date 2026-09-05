import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, TrendingUp, MessageSquare, Clock, Loader2 } from "lucide-react";
import { getNumberAnalytics } from "@/lib/numbers-extra.functions";

interface Props {
  numberId: string;
}

export function NumberAnalytics({ numberId }: Props) {
  const runAnalytics = useServerFn(getNumberAnalytics);

  const [stats,   setStats]   = useState<{
    totalInbound: number;
    totalOutbound: number;
    last30Days: number;
    lastActivity: string | null;
    topSenders: Array<{ number: string; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAnalytics({ data: { numberId } }).then((res) => {
      if (!("error" in res)) setStats(res);
      setLoading(false);
    });
  }, [numberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Could not load analytics</p>;
  }

  const lastActivityLabel = stats.lastActivity
    ? new Date(stats.lastActivity).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "No messages yet";

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" /> Total received
          </div>
          <p className="mt-1.5 text-2xl font-bold">{stats.totalInbound}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" /> Last 30 days
          </div>
          <p className="mt-1.5 text-2xl font-bold">{stats.last30Days}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="size-3.5" /> Total sent
          </div>
          <p className="mt-1.5 text-2xl font-bold">{stats.totalOutbound}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Last activity
          </div>
          <p className="mt-1.5 text-sm font-semibold">{lastActivityLabel}</p>
        </div>
      </div>

      {/* Top senders */}
      {stats.topSenders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Top senders</p>
          {stats.topSenders.map((s, i) => (
            <div key={s.number} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="font-mono text-sm">
                  {/** Hide provider-like labels: show 'System' for non-phone senders */}
                  {/^[+\d].*/.test(String(s.number)) ? String(s.number) : "System"}
                </span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{s.count} SMS</span>
            </div>
          ))}
        </div>
      )}

      {stats.totalInbound === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <BarChart3 className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No messages received yet</p>
        </div>
      )}
    </div>
  );
}
