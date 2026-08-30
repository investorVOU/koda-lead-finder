import { useEffect, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CreditCard,
  FileText,
  PhoneCall,
  Search,
  Globe,
  Youtube,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  NOTIFICATION_POOL,
  type LiveNotification as Notification,
  type NotificationCategory,
} from "./notification-data";

const STORAGE_KEY = "kodarai_seen_live_notifications";

const SHOW_DURATION = 4000;
const HIDE_DURATION = 350;
const BETWEEN_DURATION = 2500;
const INITIAL_DELAY = 2500;

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  deal: BadgeDollarSign,
  leads: Users,
  upgrade: CreditCard,
  activity: FileText,
};

function getSeenIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = localStorage.getItem(STORAGE_KEY);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markAsSeen(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  const seen = getSeenIds();

  if (seen.includes(id)) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...seen, id]),
  );
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueRef.current = buildQueue();

    if (queueRef.current.length === 0) {
      return;
    }

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const showNext = () => {
      const next = queueRef.current.shift();

      if (!next) {
        return;
      }

      markAsSeen(next.id);

      setNotification(next);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      timerRef.current = setTimeout(() => {
        setVisible(false);

        timerRef.current = setTimeout(() => {
          setNotification(null);

          timerRef.current = setTimeout(
            showNext,
            BETWEEN_DURATION,
          );
        }, HIDE_DURATION);
      }, SHOW_DURATION);
    };

    timerRef.current = setTimeout(
      showNext,
      INITIAL_DELAY,
    );

    return clearTimer;
  }, []);

  if (!notification) {
    return null;
  }

  const Icon = CATEGORY_ICONS[notification.category];

  return (
    <div
      className={[
        "pointer-events-none fixed inset-x-0 z-[60]",
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]",
        "flex justify-center px-4",
        "transition-all duration-350 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0",
      ].join(" ")}
      aria-live="polite"
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
        <div
          className={[
            "mt-0.5 flex size-8 shrink-0 items-center",
            "justify-center rounded-lg",
            "bg-primary/10 text-primary",
          ].join(" ")}
        >
          <Icon className="size-4" />
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
