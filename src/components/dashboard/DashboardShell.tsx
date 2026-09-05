import { type ReactNode, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { LogOut, Radar, Settings } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faBookmark,
  faCreditCard,
  faReceipt,
  faMobileAlt,
  faChartBar,
  faGift,
  faGear,
  faCode,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditMeter } from "@/components/dashboard/CreditMeter";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { VirtualNumberModal } from "@/components/landing/VirtualNumberModal";
import { SupportChat } from "@/components/support/SupportChat";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";

interface NavItem {
  to: string;
  label: string;
  icon: IconDefinition;
  mobileHide?: boolean;
}

const navItems: NavItem[] = [
  { to: "/dashboard",        label: "Finder",         icon: faSearch },
  { to: "/leads",            label: "Saved",          icon: faBookmark },
  { to: "/studio",           label: "Studio",         icon: faCode },
  { to: "/numbers",          label: "Numbers",        icon: faMobileAlt },
  { to: "/revenue",          label: "Revenue",        icon: faChartBar, mobileHide: true },
  { to: "/referrals",        label: "Earn",           icon: faGift, mobileHide: true },
  { to: "/billing",          label: "Billing",        icon: faCreditCard },
  { to: "/invoices",         label: "Invoices",       icon: faReceipt, mobileHide: true },
  { to: "/settings",         label: "Settings",       icon: faGear, mobileHide: true },
];

const mobileNavItems = navItems.filter((i) => !i.mobileHide);
const moreItems = navItems.filter((i) => i.mobileHide);

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sub } = useSubscription(user?.id);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const mobileNavRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const handleNavKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % mobileNavItems.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + mobileNavItems.length) % mobileNavItems.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = mobileNavItems.length - 1;
    if (next !== null) { e.preventDefault(); mobileNavRefs.current[next]?.focus(); }
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

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
                activeOptions={{ exact: false }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">
              <CreditMeter compact />
            </div>

            {/* Greeting + avatar — clicking avatar goes to settings */}
            <Link to="/settings" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                Hi, <span className="text-foreground">{displayName}</span>
              </span>
              <AvatarUpload
                avatarUrl={profile?.avatar_url ?? null}
                name={displayName}
                onUpload={refreshProfile}
                size={34}
              />
            </Link>

            {/* Settings shortcut (desktop) */}
            <Link to="/settings" aria-label="Settings" className="hidden md:inline-flex">
              <Button variant="ghost" size="icon" asChild>
                <span><Settings className="size-4" /></span>
              </Button>
            </Link>

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

      <VirtualNumberModal storageKey="virtual_number_modal_shown_dashboard" />
      <SupportChat />

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      >
        <div
          className="mx-auto grid h-16 max-w-md items-center px-2"
          style={{ gridTemplateColumns: `repeat(${mobileNavItems.length + 1}, 1fr)` }}
        >
          {mobileNavItems.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              ref={(el) => { mobileNavRefs.current[index] = el; }}
              onKeyDown={(e) => handleNavKeyDown(e, index)}
              aria-label={item.label}
              className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              activeProps={{ className: "text-primary bottom-nav-active" }}
            >
              <FontAwesomeIcon icon={item.icon} className="size-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
              moreItems.some((i) => location.pathname.startsWith(i.to))
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <FontAwesomeIcon icon={faEllipsis} className="size-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More slide-up sheet */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-border bg-background pb-safe md:hidden animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
            <div className="px-4 pb-6 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">More</p>
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setMoreOpen(false); handleSignOut(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { Radar };
