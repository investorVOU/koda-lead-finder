import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const DISMISSED_KEY = "kodarai-pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPwaPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);

    if (dismissed) return;

    const ios = isIos();

    if (ios) {
      const timer = window.setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

      return () => window.clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      setInstallPrompt(event as BeforeInstallPromptEvent);

      window.setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleInstalled = () => {
      setShowPrompt(false);
      setInstallPrompt(null);
      localStorage.removeItem(DISMISSED_KEY);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowPrompt(false);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }

    if (!installPrompt) return;

    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setShowPrompt(false);
      setInstallPrompt(null);
    }
  };

  if (!showPrompt || isStandalone()) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-4 z-[100] mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl sm:bottom-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
            <img
              src="/pwa-192x192.png"
              alt="KodarAI"
              className="size-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              Install KodarAI
            </p>

            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Add KodarAI to your home screen for faster access.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Not now
          </button>

          <button
            type="button"
            onClick={install}
            disabled={!isIos() && !installPrompt}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isIos() ? (
              <>
                <Share className="size-4" />
                Add to Home Screen
              </>
            ) : (
              <>
                <Download className="size-4" />
                Install
              </>
            )}
          </button>
        </div>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[110] flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">
                  Add KodarAI to your Home Screen
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  On iPhone or iPad, follow these steps:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                  1
                </div>

                <p className="pt-1 text-foreground">
                  Open your browser's <strong>Share</strong> menu.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                  2
                </div>

                <p className="pt-1 text-foreground">
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                  3
                </div>

                <p className="pt-1 text-foreground">
                  Tap <strong>Add</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}