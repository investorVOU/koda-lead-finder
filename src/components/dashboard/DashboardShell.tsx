import { type ReactNode, useRef, type KeyboardEvent } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { LogOut, Radar } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBookmark, faCreditCard, faReceipt, faMobileAlt, faChartBar } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSubscription, trialDaysLeft, isTrialExpired } from "@/lib/queries";

const navItems: { to: string; label: string; icon: IconDefinition }[] = [
  { to: "/dashboard", label: "Finder", icon: faSearch },
  { to: "/leads", label: "Saved", icon: faBookmark },
  { to: "/revenue", label: "Revenue", icon: faChartBar },
  { to: "/numbers", label: "Numbers", icon: faMobileAlt },
  { to: "/billing", label: "Billing", icon: faCreditCard },
  { to: "/invoices", label: "Invoices", icon: faReceipt },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sub } = useSubscription(user?.id);
  const daysLeft = trialDaysLeft(sub);
  const trialExpired = isTrialExpired(sub);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const handleNavKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % navItems.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + navItems.length) % navItems.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = navItems.length - 1;
    }
    if (next !== null) {
      e.preventDefault();
      navRefs.current[next]?.focus();
    }
  };

  const displayName =
    profile?.full_name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/dashboard">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CreditMeter compact />
            </div>

            {/* Greeting + avatar */}
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                Hi, <span className="text-foreground">{displayName}</span>
              </span>
              <AvatarUpload
                avatarUrl={profile?.avatar_url ?? null}
                name={displayName}
                onUpload={refreshProfile}
                size={34}
              />
            </div>

            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Trial banner */}
      {sub?.plan === "trial" && (
        <div className={`border-b px-4 py-2 text-center text-xs font-medium ${trialExpired ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/5 text-primary"}`}>
          {trialExpired ? (
            <>
              Your free trial has expired.{" "}
              <button className="underline underline-offset-2" onClick={() => navigate({ to: "/billing" })}>
                Upgrade to keep searching
              </button>
            </>
          ) : (
            <>
              Free trial — <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</strong>{" "}
              <span className="text-primary/60">·</span>{" "}
              <button className="underline underline-offset-2" onClick={() => navigate({ to: "/billing" })}>
                Upgrade now
              </button>
            </>
          )}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:py-8 md:pb-8">
        <div key={location.pathname} className="animate-page-enter">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center px-2">
          {navItems.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              ref={(el) => {
                navRefs.current[index] = el;
              }}
              onKeyDown={(e) => handleNavKeyDown(e, index)}
              aria-label={item.label}
              className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              activeProps={{ className: "text-primary bottom-nav-active" }}
            >
              <FontAwesomeIcon icon={item.icon} className="size-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export { Radar };
