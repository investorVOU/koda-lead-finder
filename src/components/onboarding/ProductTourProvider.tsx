import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import { saveProductTourState } from "@/lib/product-tour.functions";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "kodarai_product_tour";
type TourState = "not_started" | "in_progress" | "completed" | "skipped";
const STEP_STORAGE_KEY = "kodarai_product_tour_step";
const steps = [
  { target: "dashboard", route: "/dashboard", title: "Welcome to KodarAI", description: "Here's a quick tour to show you how to find businesses, make websites and get paid." },
  { target: "finder", route: "/dashboard", title: "Find businesses", description: "Search for real businesses in your area that need a website." },
  { target: "studio", route: "/studio", title: "Make websites", description: "Use AI to create a professional website for any business in minutes." },
  { target: "leads", route: "/leads", title: "Contact business owners", description: "Get contact details and reach out with ready-to-use messages." },
  { target: "revenue", route: "/revenue", title: "Track your results", description: "See your leads, responses and income all in one place." },
  { target: "", route: "/dashboard", title: "You're all set!", description: "You've seen the basics. Start exploring and when you're ready, choose a plan to unlock everything." },
];

function savedState(): TourState | null {
  try { return localStorage.getItem(STORAGE_KEY) as TourState | null; } catch { return null; }
}

function savedStep() {
  try {
    const value = Number(localStorage.getItem(STEP_STORAGE_KEY));
    return Number.isInteger(value) && value >= 0 && value < steps.length ? value : 0;
  } catch { return 0; }
}

function storeStep(value: number | null) {
  try { if (value === null) localStorage.removeItem(STEP_STORAGE_KEY); else localStorage.setItem(STEP_STORAGE_KEY, String(value)); } catch { /* best effort */ }
}

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const persist = useServerFn(saveProductTourState);
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [optimisticTourState, setOptimisticTourState] = useState<TourState | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const store = useCallback((state: TourState) => {
    setOptimisticTourState(state);
    try { localStorage.setItem(STORAGE_KEY, state); } catch { /* fallback only */ }
    if (user) void persist({ data: { state } });
  }, [persist, user]);

  useEffect(() => {
    if (!profile || step !== null) return;
    const local = savedState();
    const remote = profile.product_tour_state as TourState | undefined;
    const state = optimisticTourState ??
      (local === "completed" || local === "skipped"
        ? local : (remote ?? local ?? "not_started"));
    if (state === "in_progress") {
      const resumedStep = savedStep();
      setStep(resumedStep);
      if (location.pathname !== steps[resumedStep].route) navigate({ to: steps[resumedStep].route });
      return;
    }
    if (state === "not_started" && location.pathname === "/dashboard") {
      storeStep(0); setStep(0); store("in_progress"); trackEvent("product_tour_started");
    }
  }, [profile, location.pathname, navigate, optimisticTourState, step, store]);

  const updateRect = useCallback(() => {
    if (step === null) return;
    const target = steps[step]?.target;
    const el = target
      ? ([...document.querySelectorAll(`[data-tour="${target}"]`)] as HTMLElement[]).find((item) => item.getBoundingClientRect().width > 0 && item.getBoundingClientRect().height > 0) ?? null
      : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);
  useLayoutEffect(() => { updateRect(); }, [updateRect, location.pathname]);
  useEffect(() => {
    window.addEventListener("resize", updateRect); window.addEventListener("scroll", updateRect, true);
    return () => { window.removeEventListener("resize", updateRect); window.removeEventListener("scroll", updateRect, true); };
  }, [updateRect]);
  useEffect(() => { if (step !== null) trackEvent("product_tour_step_viewed", { step: step + 1 }); }, [step]);
  useEffect(() => {
    if (step === null) return;
    window.setTimeout(() => cardRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
  }, [step]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && step !== null) finish("skipped"); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  const finish = (state: "completed" | "skipped") => {
    store(state); storeStep(null); setStep(null); trackEvent(state === "completed" ? "product_tour_completed" : "product_tour_skipped");
    if (state === "completed" && location.pathname !== "/dashboard") navigate({ to: "/dashboard" });
  };
  const go = (next: number) => {
    if (next < 0) return;
    if (next >= steps.length) { finish("completed"); return; }
    storeStep(next); setStep(next); navigate({ to: steps[next].route });
  };
  const restart = () => { storeStep(0); setStep(0); store("in_progress"); navigate({ to: "/dashboard" }); trackEvent("product_tour_started", { restarted: true }); };

  return <>
    {children}
    <button type="button" className="sr-only" id="restart-product-tour" onClick={restart}>Take product tour again</button>
    {step !== null && <TourOverlay step={step} rect={rect} onBack={() => go(step - 1)} onNext={() => go(step + 1)} onSkip={() => finish("skipped")} cardRef={cardRef} />}
  </>;
}

function TourOverlay({ step, rect, onBack, onNext, onSkip, cardRef }: { step: number; rect: DOMRect | null; onBack: () => void; onNext: () => void; onSkip: () => void; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const current = steps[step];
  const isWelcome = step === 0;
  const mobile = typeof window !== "undefined" && window.innerWidth < 640;
  const style = rect && !mobile ? { top: Math.max(16, Math.min(rect.bottom + 14, window.innerHeight - 220)), left: Math.max(16, Math.min(rect.left, window.innerWidth - 360)) } : undefined;
  return <div className="fixed inset-0 z-[100]" aria-live="polite">
    <div className="absolute inset-0 bg-black/55" />
    {rect && <div aria-hidden="true" className="pointer-events-none fixed rounded-xl border-2 border-primary bg-white/10 shadow-[0_0_0_4px_rgba(255,255,255,.7)]" style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }} />}
    <section ref={cardRef} role="dialog" aria-modal="true" aria-label={current.title} className={`fixed z-[101] w-[calc(100%-2rem)] max-w-[350px] rounded-2xl border border-border bg-card p-5 shadow-xl ${mobile ? "inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))]" : ""}`} style={style}>
      {step === steps.length - 1 ? <CheckCircle2 className="mb-3 size-8 text-primary" /> : null}
      <p className="text-xs font-medium text-primary">{isWelcome ? "1 of 6" : `${step + 1} of 6`}</p>
      <h2 className="mt-1 text-lg font-semibold">{current.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p>
      <div className="mt-5 flex items-center justify-between gap-2"><div>{step > 0 && <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>}</div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={onSkip}>Skip tour</Button><Button size="sm" onClick={onNext}>{isWelcome ? "Let's go" : step === steps.length - 1 ? "Go to Dashboard" : "Next"}</Button></div></div>
    </section>
  </div>;
}
