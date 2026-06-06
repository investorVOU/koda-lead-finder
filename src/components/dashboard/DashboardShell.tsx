import { type ReactNode, useRef, type KeyboardEvent } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { LogOut, Radar } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBookmark, faCreditCard, faReceipt } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const navItems: { to: string; label: string; icon: IconDefinition }[] = [
  { to: "/dashboard", label: "Finder", icon: faSearch },
  { to: "/leads", label: "Saved", icon: faBookmark },
  { to: "/billing", label: "Billing", icon: faCreditCard },
  { to: "/invoices", label: "Invoices", icon: faReceipt },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

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
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-2">
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
