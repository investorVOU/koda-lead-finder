import { createFileRoute, Link } from "@tanstack/react-router";
import { ReceiptText, ArrowLeft, Loader2, CreditCard, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { usePaymentHistory } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices & History — KodaRai" }] }),
  component: InvoicesPage,
});

function formatAmount(amount: number, currency: string) {
  if (currency === "NGN") return "₦" + amount.toLocaleString("en-NG");
  return "$" + amount.toFixed(2);
}

function InvoicesPage() {
  const { user } = useAuth();
  const { data: history, isLoading } = usePaymentHistory(user?.id);

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices & History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every subscription payment and lead pack purchase.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing">
            <ArrowLeft className="size-4" /> Back to billing
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !history || history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <ReceiptText className="size-6" />
          </span>
          <h3 className="mt-4 font-semibold">No payments yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Your invoices appear here once you subscribe or buy a lead pack.
          </p>
          <Button variant="hero" size="sm" className="mt-5" asChild>
            <Link to="/billing">View plans</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Leads</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Method</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {row.kind === "subscription" ? (
                        <CreditCard className="size-4 text-primary" />
                      ) : (
                        <Zap className="size-4 text-primary" />
                      )}
                      {row.description ?? row.plan_id}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    +{row.credits_granted}
                  </td>
                  <td className="hidden px-4 py-3 capitalize text-muted-foreground sm:table-cell">
                    {row.provider}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {formatAmount(Number(row.amount), row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
