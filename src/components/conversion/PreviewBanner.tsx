import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";

export function PreviewBanner() {
  const { user } = useAuth();
  const { data: subscription } = useSubscription(user?.id);
  if (subscription?.status !== "pending_plan") return null;
  return (
    <div className="border-b border-primary/15 bg-primary/5 px-4 py-2 text-center text-xs text-muted-foreground">
      <span className="font-medium text-foreground">You&apos;re exploring Kodarai.</span> Choose a plan when you&apos;re ready to start finding businesses and building websites. {" "}
      <Link to="/choose-plan" className="font-semibold text-primary hover:underline">View plans →</Link>
    </div>
  );
}
