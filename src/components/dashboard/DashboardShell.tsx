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

const MOBILE_NAV = [
  {
    to: "/leads",
    label: "Leads",
  },
  {
    to: "/studio",
    label: "Studio",
  },
  {
    to: "/dashboard",
    label: "Finder",
  },
  {
    to: "/numbers",
    label: "Numbers",
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

  useSubscription(user?.id);

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
      return location.pathname === "/dashboard";
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
    } else if (
      e.key === "Home"
    ) {
      next = 0;
    } else if (
      e.key === "End"
    ) {
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
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/dashboard">
            <Logo />
          </Link>

          {/* DESKTOP NAV */}
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

      {/* CONTENT */}

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:py-8 md:pb-8">
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

      {/* MOBILE LIQUID GLASS NAV */}

      <nav
        aria-label="Primary navigation"
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          px-3
          pb-[max(10px,env(safe-area-inset-bottom))]
          md:hidden
        "
      >
        <div className="relative mx-auto max-w-md">
          {/* ambient shadow/glow */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-8
              bottom-0
              h-14
              rounded-full
              bg-primary/10
              blur-2xl
            "
          />

          {/* LIQUID GLASS SHELL */}
          <div
            className="
              relative
              grid
              h-[72px]
              grid-cols-5
              items-center
              overflow-visible
              rounded-[28px]

              border
              border-white/40

              bg-white/60

              px-1.5

              shadow-[0_18px_50px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.15)]

              backdrop-blur-[30px]
              backdrop-saturate-150

              dark:border-white/10
              dark:bg-black/40

              dark:shadow-[0_20px_55px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(255,255,255,0.04)]
            "
          >
            {/* top reflection */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-5
                top-[1px]
                h-px
                bg-gradient-to-r
                from-transparent
                via-white/90
                to-transparent

                dark:via-white/30
              "
            />

            {/* internal curved reflection */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-3
                top-[3px]
                h-8
                rounded-[24px]

                bg-gradient-to-b
                from-white/25
                via-white/[0.08]
                to-transparent

                dark:from-white/[0.07]
                dark:via-white/[0.02]
              "
            />

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
                {/* OUTER GLASS HALO */}
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    -top-[31px]

                    size-[70px]

                    rounded-full

                    border
                    border-white/55

                    bg-white/25

                    shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_25px_rgba(0,0,0,0.10)]

                    backdrop-blur-xl

                    transition-all
                    duration-300

                    dark:border-white/15
                    dark:bg-white/[0.06]

                    dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.28)]

                    ${
                      isPathActive(
                        "/dashboard",
                      )
                        ? "scale-100 opacity-100"
                        : "scale-95 opacity-85"
                    }
                  `}
                />

                {/* FINDER BUTTON */}
                <span
                  className={`
                    absolute
                    -top-[25px]

                    flex
                    size-[58px]
                    items-center
                    justify-center

                    overflow-hidden

                    rounded-full

                    border
                    border-white/45

                    bg-primary
                    text-primary-foreground

                    transition-all
                    duration-200
                    ease-out

                    group-active:scale-95

                    ${
                      isPathActive(
                        "/dashboard",
                      )
                        ? "shadow-[0_12px_30px_rgba(0,0,0,0.28),0_0_0_5px_hsl(var(--primary)/0.16),0_0_25px_hsl(var(--primary)/0.22),inset_0_1px_0_rgba(255,255,255,0.45)]"
                        : "shadow-[0_10px_25px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.35)]"
                    }
                  `}
                >
                  {/* glossy highlight */}
                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      left-[8px]
                      right-[8px]
                      top-[5px]

                      h-[19px]

                      rounded-full

                      bg-gradient-to-b
                      from-white/40
                      via-white/10
                      to-transparent
                    "
                  />

                  {/* subtle lower depth */}
                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-2
                      bottom-1

                      h-4

                      rounded-full

                      bg-black/10

                      blur-sm
                    "
                  />

                  <Search className="relative z-10 size-6" />
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
                        : "text-foreground/70 dark:text-white/70"
                    }
                  `}
                >
                  Finder
                </span>

                <span
                  className={`
                    mt-1
                    h-[3px]

                    rounded-full

                    bg-primary

                    shadow-[0_0_8px_hsl(var(--primary)/0.55)]

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
                z-10

                flex
                h-full
                flex-col
                items-center
                justify-center
                gap-1

                rounded-2xl

                text-[10px]
                font-medium

                transition-all
                duration-200

                active:scale-95
              "
            >
              <span
                className={`
                  relative

                  flex
                  size-9
                  items-center
                  justify-center

                  overflow-hidden

                  rounded-[14px]

                  border

                  transition-all
                  duration-200

                  ${
                    isMoreActive
                      ? `
                          border-primary/20
                          bg-primary/15
                          text-primary

                          shadow-[inset_0_1px_0_rgba(255,255,255,0.30)]
                        `
                      : `
                          border-transparent
                          text-foreground/60
                          dark:text-white/60
                        `
                  }
                `}
              >
                {isMoreActive && (
                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-1
                      top-[2px]

                      h-3

                      rounded-full

                      bg-gradient-to-b
                      from-white/30
                      to-transparent

                      dark:from-white/10
                    "
                  />
                )}

                <MoreHorizontal className="relative z-10 size-5" />
              </span>

              <span
                className={
                  isMoreActive
                    ? "font-semibold text-primary"
                    : "text-foreground/65 dark:text-white/65"
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

                  shadow-[0_0_8px_hsl(var(--primary)/0.55)]

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

      {/* MORE SHEET */}

      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="
              fixed
              inset-0
              z-[60]

              bg-black/40

              backdrop-blur-sm

              md:hidden
            "
            onClick={() =>
              setMoreOpen(false)
            }
          />

          <div
            className="
              fixed
              inset-x-2
              bottom-2
              z-[70]

              max-h-[80vh]

              overflow-y-auto

              rounded-[30px]

              border
              border-white/25

              bg-white/80

              pb-[max(20px,env(safe-area-inset-bottom))]

              shadow-[0_25px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.8)]

              backdrop-blur-[30px]
              backdrop-saturate-150

              dark:border-white/10
              dark:bg-black/70

              dark:shadow-[0_25px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]

              md:hidden

              animate-in
              slide-in-from-bottom
              duration-200
            "
          >
            {/* GLASS SHEET REFLECTION */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-x-6
                top-[1px]

                h-px

                bg-gradient-to-r
                from-transparent
                via-white/80
                to-transparent

                dark:via-white/25
              "
            />

            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-foreground/15 dark:bg-white/20" />

            <div className="px-4 pb-3 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    More
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Account and business tools
                  </p>
                </div>

                {isMoreActive && (
                  <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    Current section
                  </span>
                )}
              </div>

              <div
                className="
                  overflow-hidden

                  rounded-[20px]

                  border
                  border-border/60

                  bg-background/45

                  backdrop-blur-lg

                  dark:border-white/10
                  dark:bg-white/[0.04]
                "
              >
                {moreItems.map(
                  (item, index) => {
                    const isActive =
                      location.pathname.startsWith(
                        item.to,
                      );

                    return (
                      <div
                        key={
                          item.to
                        }
                      >
                        {index > 0 && (
                          <div className="mx-4 h-px bg-border/60 dark:bg-white/10" />
                        )}

                        <Link
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

                            px-4
                            py-3.5

                            text-sm
                            font-medium

                            transition-colors

                            ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-accent/60"
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

                              rounded-[12px]

                              border

                              ${
                                isActive
                                  ? "border-primary/15 bg-primary/10 text-primary"
                                  : "border-border/50 bg-background/50 text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]"
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
                            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.55)]" />
                          )}
                        </Link>
                      </div>
                    );
                  },
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(
                    false,
                  );

                  void handleSignOut();
                }}
                className="
                  mt-3

                  flex
                  w-full
                  items-center
                  gap-3

                  rounded-[18px]

                  border
                  border-destructive/10

                  bg-destructive/[0.06]

                  px-4
                  py-3.5

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
        z-10

        flex
        h-full
        flex-col
        items-center
        justify-center
        gap-1

        rounded-2xl

        text-[10px]
        font-medium

        transition-all
        duration-200

        active:scale-95

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary/40
      "
    >
      <span
        className={`
          relative

          flex
          size-9
          items-center
          justify-center

          overflow-hidden

          rounded-[14px]

          border

          transition-all
          duration-200

          ${
            active
              ? `
                  border-primary/20
                  bg-primary/15
                  text-primary

                  shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
                `
              : `
                  border-transparent
                  text-foreground/60
                  dark:text-white/60
                `
          }
        `}
      >
        {active && (
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-1
              top-[2px]

              h-3

              rounded-full

              bg-gradient-to-b
              from-white/30
              to-transparent

              dark:from-white/10
            "
          />
        )}

        <Icon className="relative z-10 size-5" />
      </span>

      <span
        className={
          active
            ? "font-semibold text-primary"
            : "text-foreground/65 dark:text-white/65"
        }
      >
        {label}
      </span>

      <span
        className={`
          absolute
          bottom-1

          h-[3px]

          rounded-full

          bg-primary

          shadow-[0_0_8px_hsl(var(--primary)/0.55)]

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
