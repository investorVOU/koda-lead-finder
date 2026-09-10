import {
  type ReactNode,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import {
  LogOut,
  Radar,
  Settings,
  Search,
  Bookmark,
  Code2,
  Phone,
  MoreHorizontal,
} from "lucide-react";
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
  {
    to: "/dashboard",
    label: "Finder",
    icon: faSearch,
  },
  {
    to: "/leads",
    label: "Saved",
    icon: faBookmark,
  },
  {
    to: "/studio",
    label: "Studio",
    icon: faCode,
  },
  {
    to: "/numbers",
    label: "Numbers",
    icon: faMobileAlt,
  },
  {
    to: "/revenue",
    label: "Revenue",
    icon: faChartBar,
    mobileHide: true,
  },
  {
    to: "/referrals",
    label: "Earn",
    icon: faGift,
    mobileHide: true,
  },
  {
    to: "/billing",
    label: "Billing",
    icon: faCreditCard,
    mobileHide: true,
  },
  {
    to: "/invoices",
    label: "Invoices",
    icon: faReceipt,
    mobileHide: true,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: faGear,
    mobileHide: true,
  },
];

const moreItems = navItems.filter(
  (item) => item.mobileHide,
);

type MobileNavKey =
  | "leads"
  | "studio"
  | "finder"
  | "numbers";

const MOBILE_NAV = [
  {
    key: "leads" as MobileNavKey,
    to: "/leads",
    label: "Leads",
    icon: Bookmark,
  },
  {
    key: "studio" as MobileNavKey,
    to: "/studio",
    label: "Studio",
    icon: Code2,
  },
  {
    key: "finder" as MobileNavKey,
    to: "/dashboard",
    label: "Finder",
    icon: Search,
    primary: true,
  },
  {
    key: "numbers" as MobileNavKey,
    to: "/numbers",
    label: "Numbers",
    icon: Phone,
  },
] as const;

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    profile,
    refreshProfile,
    signOut,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const { data: sub } = useSubscription(
    user?.id,
  );

  const [moreOpen, setMoreOpen] =
    useState(false);

  const mobileNavRefs = useRef<
    (HTMLAnchorElement | null)[]
  >([]);

  const handleSignOut = async () => {
    await signOut();

    navigate({
      to: "/login",
    });
  };

  const isPathActive = (
    path: string,
  ) => {
    if (path === "/dashboard") {
      return (
        location.pathname ===
        "/dashboard"
      );
    }

    return location.pathname.startsWith(
      path,
    );
  };

  const isMoreActive =
    moreItems.some((item) =>
      location.pathname.startsWith(
        item.to,
      ),
    );

  const handleNavKeyDown = (
    e: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    const totalItems =
      MOBILE_NAV.length;

    let next: number | null =
      null;

    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowDown"
    ) {
      next =
        (index + 1) %
        totalItems;
    } else if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowUp"
    ) {
      next =
        (index -
          1 +
          totalItems) %
        totalItems;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next =
        totalItems - 1;
    }

    if (next !== null) {
      e.preventDefault();

      mobileNavRefs.current[
        next
      ]?.focus();
    }
  };

  const displayName =
    profile?.full_name
      ?.split(" ")[0] ||
    user?.user_metadata?.full_name
      ?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* ─────────────────────────────
          HEADER
      ───────────────────────────── */}

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/dashboard">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeProps={{
                    className:
                      "bg-accent text-foreground",
                  }}
                  activeOptions={{
                    exact: false,
                  }}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">
              <CreditMeter compact />
            </div>

            {/* Greeting + avatar */}
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                Hi,{" "}
                <span className="text-foreground">
                  {displayName}
                </span>
              </span>

              <AvatarUpload
                avatarUrl={
                  profile?.avatar_url ??
                  null
                }
                name={displayName}
                onUpload={
                  refreshProfile
                }
                size={34}
              />
            </Link>

            {/* Settings shortcut desktop */}
            <Link
              to="/settings"
              aria-label="Settings"
              className="hidden md:inline-flex"
            >
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <span>
                  <Settings className="size-4" />
                </span>
              </Button>
            </Link>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              onClick={
                handleSignOut
              }
              aria-label="Sign out"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────
          PAGE CONTENT
      ───────────────────────────── */}

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div
          key={location.pathname}
          className="animate-page-enter"
        >
          {children}
        </div>
      </main>

      <VirtualNumberModal
        storageKey="virtual_number_modal_shown_dashboard"
      />

      <SupportChat />

      {/* ─────────────────────────────
          MOBILE FLOATING NAV
      ───────────────────────────── */}

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="relative mx-auto max-w-md">
          {/* Floating nav shell */}
          <div
            className="
              relative
              grid
              h-[70px]
              grid-cols-5
              items-center
              rounded-[24px]
              border
              border-border/80
              bg-background/95
              px-1.5
              shadow-[0_10px_35px_rgba(0,0,0,0.16)]
              backdrop-blur-xl
            "
          >
            {/* LEADS */}
            <MobileNavItem
              refCallback={(el) => {
                mobileNavRefs.current[0] =
                  el;
              }}
              to="/leads"
              label="Leads"
              icon={Bookmark}
              active={isPathActive(
                "/leads",
              )}
              onKeyDown={(e) =>
                handleNavKeyDown(
                  e,
                  0,
                )
              }
            />

            {/* STUDIO */}
            <MobileNavItem
              refCallback={(el) => {
                mobileNavRefs.current[1] =
                  el;
              }}
              to="/studio"
              label="Studio"
              icon={Code2}
              active={isPathActive(
                "/studio",
              )}
              onKeyDown={(e) =>
                handleNavKeyDown(
                  e,
                  1,
                )
              }
            />

            {/* FINDER CENTER CTA */}
            <div className="relative flex h-full items-end justify-center pb-2">
              <Link
                to="/dashboard"
                ref={(el) => {
                  mobileNavRefs.current[2] =
                    el;
                }}
                onKeyDown={(e) =>
                  handleNavKeyDown(
                    e,
                    2,
                  )
                }
                aria-label="Finder"
                className="
                  group
                  relative
                  flex
                  h-full
                  w-full
                  flex-col
                  items-center
                  justify-end
                  focus-visible:outline-none
                "
              >
                {/* raised finder circle */}
                <span
                  className={`
                    absolute
                    -top-[25px]
                    flex
                    size-[58px]
                    items-center
                    justify-center
                    rounded-full
                    border-[5px]
                    border-background
                    transition-all
                    duration-200
                    ease-out
                    group-active:scale-95
                    ${
                      isPathActive(
                        "/dashboard",
                      )
                        ? "bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.24),0_0_0_4px_hsl(var(--primary)/0.12)]"
                        : "bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(0,0,0,0.2)]"
                    }
                  `}
                >
                  <Search className="size-6" />
                </span>

                <span
                  className={`
                    mt-auto
                    text-[10px]
                    font-semibold
                    transition-colors
                    ${
                      isPathActive(
                        "/dashboard",
                      )
                        ? "text-primary"
                        : "text-foreground"
                    }
                  `}
                >
                  Finder
                </span>

                {/* Finder active indicator */}
                <span
                  className={`
                    mt-1
                    h-[3px]
                    rounded-full
                    bg-primary
                    transition-all
                    duration-200
                    ${
                      isPathActive(
                        "/dashboard",
                      )
                        ? "w-5 opacity-100"
                        : "w-0 opacity-0"
                    }
                  `}
                />
              </Link>
            </div>

            {/* NUMBERS */}
            <MobileNavItem
              refCallback={(el) => {
                mobileNavRefs.current[3] =
                  el;
              }}
              to="/numbers"
              label="Numbers"
              icon={Phone}
              active={isPathActive(
                "/numbers",
              )}
              onKeyDown={(e) =>
                handleNavKeyDown(
                  e,
                  3,
                )
              }
            />

            {/* MORE */}
            <button
              type="button"
              onClick={() =>
                setMoreOpen(true)
              }
              aria-label="More"
              className="
                relative
                flex
                h-full
                flex-col
                items-center
                justify-center
                gap-1
                rounded-xl
                text-[10px]
                font-medium
                transition-all
                duration-200
                active:scale-95
              "
            >
              <span
                className={`
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-xl
                  transition-colors
                  ${
                    isMoreActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }
                `}
              >
                <MoreHorizontal className="size-5" />
              </span>

              <span
                className={
                  isMoreActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }
              >
                More
              </span>

              <span
                className={`
                  absolute
                  bottom-1
                  h-[3px]
                  rounded-full
                  bg-primary
                  transition-all
                  duration-200
                  ${
                    isMoreActive
                      ? "w-5 opacity-100"
                      : "w-0 opacity-0"
                  }
                `}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────
          MOBILE MORE SHEET
      ───────────────────────────── */}

      {moreOpen && (
        <>
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() =>
              setMoreOpen(false)
            }
          />

          <div
            className="
              fixed
              inset-x-0
              bottom-0
              z-[70]
              rounded-t-[28px]
              border-t
              border-border
              bg-background
              pb-[max(24px,env(safe-area-inset-bottom))]
              shadow-2xl
              md:hidden
              animate-in
              slide-in-from-bottom
              duration-200
            "
          >
            {/* handle */}
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/25" />

            <div className="px-4 pb-3 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    More
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Account and business
                    tools
                  </p>
                </div>

                {isMoreActive && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    Current section
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {moreItems.map(
                  (item) => {
                    const isActive =
                      location.pathname.startsWith(
                        item.to,
                      );

                    return (
                      <Link
                        key={
                          item.to
                        }
                        to={item.to}
                        onClick={() =>
                          setMoreOpen(
                            false,
                          )
                        }
                        className={`
                          flex
                          items-center
                          gap-3
                          rounded-xl
                          px-4
                          py-3
                          text-sm
                          font-medium
                          transition-colors
                          ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent"
                          }
                        `}
                      >
                        <span
                          className={`
                            flex
                            size-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }
                          `}
                        >
                          <FontAwesomeIcon
                            icon={
                              item.icon
                            }
                            className="size-4"
                          />
                        </span>

                        <span className="flex-1">
                          {
                            item.label
                          }
                        </span>

                        {isActive && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  },
                )}

                <div className="my-2 h-px bg-border" />

                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(
                      false,
                    );

                    void handleSignOut();
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-destructive
                    transition-colors
                    hover:bg-destructive/10
                  "
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10">
                    <LogOut className="size-4" />
                  </span>

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

function MobileNavItem({
  to,
  label,
  icon: Icon,
  active,
  onKeyDown,
  refCallback,
}: {
  to:
    | "/leads"
    | "/studio"
    | "/numbers";
  label: string;
  icon: typeof Bookmark;
  active: boolean;
  onKeyDown: (
    e: KeyboardEvent<HTMLAnchorElement>,
  ) => void;
  refCallback: (
    element: HTMLAnchorElement | null,
  ) => void;
}) {
  return (
    <Link
      to={to}
      ref={refCallback}
      onKeyDown={onKeyDown}
      aria-label={label}
      className="
        relative
        flex
        h-full
        flex-col
        items-center
        justify-center
        gap-1
        rounded-xl
        text-[10px]
        font-medium
        transition-all
        duration-200
        active:scale-95
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
      "
    >
      <span
        className={`
          flex
          size-8
          items-center
          justify-center
          rounded-xl
          transition-all
          duration-200
          ${
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground"
          }
        `}
      >
        <Icon className="size-5" />
      </span>

      <span
        className={
          active
            ? "font-semibold text-primary"
            : "text-muted-foreground"
        }
      >
        {label}
      </span>

      {/* active indicator */}
      <span
        className={`
          absolute
          bottom-1
          h-[3px]
          rounded-full
          bg-primary
          transition-all
          duration-200
          ${
            active
              ? "w-5 opacity-100"
              : "w-0 opacity-0"
          }
        `}
      />
    </Link>
  );
}

export { Radar };
