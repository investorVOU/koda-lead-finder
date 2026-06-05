import { type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
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
