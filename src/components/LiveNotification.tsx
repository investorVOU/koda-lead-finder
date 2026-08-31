import { useEffect, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Search,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

import {
  NOTIFICATION_POOL,
  type LiveNotification as Notification,
  type NotificationCategory,
} from "./notification-data";

/*
 * Version the storage key.

 * This means notifications you may have already marked as "seen"
 * during testing won't permanently kill the notification system.
 *
 * Once a notification has appeared under this version, it will not
 * appear again for that browser.
 */
const STORAGE_KEY = "kodarai_seen_live_notifications_v2";

const SHOW_DURATION = 4000;
const HIDE_DURATION = 350;
const BETWEEN_DURATION = 2500;
const INITIAL_DELAY = 1800;

const CATEGORY_ICONS: Record<
  NotificationCategory,
  LucideIcon
> = {
  deal: BadgeDollarSign,
  leads: Search,
  upgrade: CreditCard,
  activity: CheckCircle2,
};

function getSeenIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);

    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (id): id is string => typeof id === "string",
    );
  } catch {
    return [];
  }
}

function markAsSeen(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const seen = getSeenIds();

    if (seen.includes(id)) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...seen, id]),
    );
  } catch {
    // Ignore storage errors.
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function buildQueue(): Notification[] {
  const seen = getSeenIds();

  const unseen = NOTIFICATION_POOL.filter(
    (notification) => !seen.includes(notification.id),
  );

  return shuffle(unseen);
}

export function LiveNotification() {
  const [notification, setNotification] =
    useState<Notification | null>(null);

  const [visible, setVisible] = useState(false);

  const queueRef = useRef<Notification[]>([]);
  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueRef.current = buildQueue();

    /*
     * If there are no unseen notifications, there is nothing to show.
     *
     * This is intentional:
     * the same notification should never be shown twice
     * for the same browser.
     */
    if (queueRef.current.length === 0) {
      return;
    }

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const showNext = () => {
      const next = queueRef.current.shift();

      if (!next) {
        return;
      }

      /*
       * Mark it as seen immediately.
       * This prevents the same notification from appearing
       * again after a refresh.
       */
      markAsSeen(next.id);

      setNotification(next);
      setVisible(false);

      /*
       * Wait until the notification has rendered before
       * switching opacity/transform to the visible state.
       */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      /*
       * Keep it visible for SHOW_DURATION.
       */
      timerRef.current = setTimeout(() => {
        setVisible(false);

        /*
         * Wait for the fade-out animation.
         */
        timerRef.current = setTimeout(() => {
          setNotification(null);

          /*
           * Small gap before the next notification.
           */
          timerRef.current = setTimeout(
            showNext,
            BETWEEN_DURATION,
          );
        }, HIDE_DURATION);
      }, SHOW_DURATION);
    };

    /*
     * Don't immediately throw a notification at the visitor.
     */
    timerRef.current = setTimeout(
      showNext,
      INITIAL_DELAY,
    );

    return clearTimer;
  }, []);

  if (!notification) {
    return null;
  }

  const Icon =
    CATEGORY_ICONS[notification.category];

  return (
    <div
      className={[
        "pointer-events-none fixed inset-x-0 z-30",
        "top-[calc(4.5rem+env(safe-area-inset-top))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:top-auto",
        "flex justify-center px-4",
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0",
      ].join(" ")}
      aria-live="polite"
      role="status"
    >
      <div
        className={[
          "flex w-full max-w-sm items-start gap-3",
          "rounded-xl border border-border/80",
          "bg-card/95 p-3",
          "shadow-lg shadow-black/5",
          "backdrop-blur-md",
        ].join(" ")}
      >
        {/* Real Lucide icon — no emoji, no AI-style Sparkles */}
        <div
          className={[
            "mt-0.5 flex size-8 shrink-0",
            "items-center justify-center",
            "rounded-lg",
            "bg-primary/10 text-primary",
          ].join(" ")}
        >
          <Icon className="size-4" strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug">
            {notification.title}
          </p>

          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {notification.description}
          </p>
        </div>
      </div>
    </div>
  );
}
