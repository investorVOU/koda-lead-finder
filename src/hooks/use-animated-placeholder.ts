import { useState, useEffect, useRef } from "react";

export function useAnimatedPlaceholder(texts: string[], pauseMs = 2500): string {
  const [displayed, setDisplayed] = useState(texts[0] ?? "");
  const indexRef = useRef(0);
  const phaseRef = useRef<"pause" | "deleting" | "typing">("pause");
  const charRef = useRef(texts[0]?.length ?? 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (texts.length <= 1) return;

    const tick = () => {
      if (phaseRef.current === "pause") {
        phaseRef.current = "deleting";
        timerRef.current = setTimeout(tick, 30);
      } else if (phaseRef.current === "deleting") {
        const current = texts[indexRef.current];
        if (charRef.current > 0) {
          charRef.current--;
          setDisplayed(current.slice(0, charRef.current));
          timerRef.current = setTimeout(tick, 22);
        } else {
          indexRef.current = (indexRef.current + 1) % texts.length;
          charRef.current = 0;
          phaseRef.current = "typing";
          timerRef.current = setTimeout(tick, 120);
        }
      } else {
        const next = texts[indexRef.current];
        if (charRef.current < next.length) {
          charRef.current++;
          setDisplayed(next.slice(0, charRef.current));
          timerRef.current = setTimeout(tick, 42);
        } else {
          phaseRef.current = "pause";
          timerRef.current = setTimeout(tick, pauseMs);
        }
      }
    };

    timerRef.current = setTimeout(tick, pauseMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [texts, pauseMs]);

  return displayed;
}
