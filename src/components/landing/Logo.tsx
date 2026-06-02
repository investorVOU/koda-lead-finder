import { Radar } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-md)]">
        <Radar className="size-5" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Koda<span className="text-primary">Rai</span>
      </span>
    </div>
  );
}
