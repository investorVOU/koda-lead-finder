import type { BillingCycle } from "@/lib/billing";

export function BillingCycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="mx-auto flex w-fit rounded-xl border border-border bg-background p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
          cycle === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annually")}
        className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
          cycle === "annually" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Yearly <span className="text-xs opacity-80">Save 20%</span>
      </button>
    </div>
  );
}
