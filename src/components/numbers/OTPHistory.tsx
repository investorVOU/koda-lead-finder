/**
 * Floating OTP history tray — shows the last 5 OTPs copied anywhere in the app.
 * Uses localStorage so it persists across page navigations.
 */
import { useEffect, useState } from "react";
import { Copy, Check, X, History } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "kodarai_otp_history";
const MAX_HISTORY = 5;

export interface OTPEntry {
  otp: string;
  source: string; // phone number or "SMSPool"
  at: number;     // timestamp ms
}

/** Call this whenever an OTP is copied anywhere in the app to push to history */
export function pushOTPHistory(otp: string, source: string) {
  try {
    const existing: OTPEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const next = [{ otp, source, at: Date.now() }, ...existing.filter((e) => e.otp !== otp)]
      .slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("otp-history-updated"));
  } catch { /* ignore */ }
}

export function OTPHistory() {
  const [history, setHistory]   = useState<OTPEntry[]>([]);
  const [open,    setOpen]      = useState(false);
  const [copied,  setCopied]    = useState<string | null>(null);

  const load = () => {
    try {
      const stored: OTPEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setHistory(stored);
    } catch { setHistory([]); }
  };

  useEffect(() => {
    load();
    window.addEventListener("otp-history-updated", load);
    return () => window.removeEventListener("otp-history-updated", load);
  }, []);

  const copy = (otp: string) => {
    navigator.clipboard.writeText(otp);
    toast.success("OTP copied!");
    setCopied(otp);
    setTimeout(() => setCopied(null), 2000);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    toast.success("History cleared");
  };

  if (history.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-72 rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <span className="text-sm font-semibold">OTP History</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                className="rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {history.map((entry) => (
              <div key={entry.at} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-base font-bold tracking-widest">{entry.otp}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {entry.source} · {formatAge(entry.at)}
                  </p>
                </div>
                <button
                  onClick={() => copy(entry.otp)}
                  className="ml-2 shrink-0 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
                >
                  {copied === entry.otp ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg hover:bg-accent"
        >
          <History className="size-4 text-primary" />
          <span className="text-sm font-semibold">OTPs</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {history.length}
          </span>
        </button>
      )}
    </div>
  );
}

function formatAge(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
