import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { eventForPath, startPresence, trackVisitorEvent } from "@/lib/visitor-tracking";

/** Mounted once in the root. Tracks anonymous visitors only; signed-in users are not tracked. */
export function VisitorTracker() {
  const { user, loading } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    if (loading || user) return;
    trackVisitorEvent(eventForPath(pathname));
  }, [pathname, user?.id, loading]);

  useEffect(() => {
    if (loading || user) return;
    return startPresence();
  }, [user?.id, loading]);

  // Landing-page pricing section: fire once when it scrolls into view.
  useEffect(() => {
    if (loading || user) return;
    const section = document.getElementById("pricing");
    if (!section || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        trackVisitorEvent("pricing_opened");
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [pathname, user?.id, loading]);

  return null;
}
