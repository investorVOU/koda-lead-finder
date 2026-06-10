import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Zap, Loader2, Clock, CheckCircle2, XCircle, RefreshCw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listSMSPoolOrders, cancelSMSPoolTempOrder, resendSMSPoolOrder } from "@/lib/numbers-extra.functions";

interface Order {
  id: string;
  phone_number: string;
  country_code: string;
  provider_sid: string | null;
  twilio_sid: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  onRefreshNumbers?: () => void;
}

export function SMSPoolOrders({ onRefreshNumbers }: Props) {
  const runList   = useServerFn(listSMSPoolOrders);
  const runCancel = useServerFn(cancelSMSPoolTempOrder);
  const runResend = useServerFn(resendSMSPoolOrder);

  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await runList();
    if ("orders" in res) setOrders(res.orders as Order[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async (orderId: string) => {
    if (!confirm("Cancel this temp number? A refund will be added to your wallet.")) return;
    setCanceling(orderId);
    const res = await runCancel({ data: { numberId: orderId } });
    setCanceling(null);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Order cancelled — refund added to wallet");
    setOrders((o) => o.filter((x) => x.id !== orderId));
    onRefreshNumbers?.();
  };

  const resend = async (orderId: string) => {
    setResending(orderId);
    const res = await runResend({ data: { numberId: orderId } });
    setResending(null);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("SMS re-request sent — check your inbox shortly");
  };

  const getStatusBadge = (status: string, expiresAt: string | null) => {
    if (status === "expired" || (expiresAt && new Date(expiresAt) < new Date())) {
      return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="size-3" /> Expired</span>;
    }
    if (status === "active") {
      return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="size-3" /> Active</span>;
    }
    return <span className="inline-flex items-center gap-1 text-xs text-amber-500"><Clock className="size-3" /> Pending</span>;
  };

  const activeOrders = orders.filter(
    (o) => o.status !== "expired" && o.status !== "released" &&
           (!o.expires_at || new Date(o.expires_at) > new Date()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">SMSPool Temp Orders</p>
        <button onClick={load} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Zap className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium">No temp orders</p>
          <p className="text-xs text-muted-foreground">Your one-time temp numbers will appear here.</p>
        </div>
      )}

      {orders.map((order) => {
        const isExpired = order.status === "expired" || order.status === "released" ||
                          (order.expires_at ? new Date(order.expires_at) < new Date() : false);
        const timeLeft = order.expires_at
          ? Math.max(0, new Date(order.expires_at).getTime() - Date.now())
          : null;
        const minsLeft = timeLeft !== null ? Math.floor(timeLeft / 60000) : null;

        return (
          <div key={order.id} className={`rounded-xl border bg-card p-4 ${isExpired ? "border-border opacity-60" : "border-border"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {order.status === "active" ? "🟢" : isExpired ? "⚪" : "🟡"}
                  </span>
                  <p className="font-mono text-sm font-bold">
                    {order.phone_number === "pending" ? "Awaiting number…" : order.phone_number}
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {getStatusBadge(order.status, order.expires_at)}
                  <span>·</span>
                  <span>{order.country_code}</span>
                  {minsLeft !== null && !isExpired && (
                    <>
                      <span>·</span>
                      <span className={minsLeft < 5 ? "text-amber-500 font-medium" : ""}>
                        {minsLeft}m left
                      </span>
                    </>
                  )}
                </div>
              </div>

              {!isExpired && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => resend(order.id)}
                    disabled={resending === order.id}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    title="Re-request SMS"
                  >
                    {resending === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => cancel(order.id)}
                    disabled={canceling === order.id}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    title="Cancel & refund"
                  >
                    {canceling === order.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {orders.length > 0 && activeOrders.length === 0 && (
        <p className="text-center text-xs text-muted-foreground pt-2">All temp orders have expired.</p>
      )}
    </div>
  );
}
