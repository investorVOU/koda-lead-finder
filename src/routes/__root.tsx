import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

import { reportLovableError } from "../lib/lovable-error-reporting";

import { AuthProvider } from "@/lib/auth";

import { supabase } from "@/integrations/supabase/client";

import { Toaster } from "@/components/ui/sonner";

import { InstallPwaPrompt } from "@/components/InstallPwaPrompt";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

import { AttributionSync } from "@/components/analytics/AttributionSync";

import { VisitorTracker } from "@/components/analytics/VisitorTracker";

const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID?.trim();
const verifiedAdSenseClientId = /^ca-pub-[0-9]{10,20}$/.test(adsenseClientId ?? "")
  ? adsenseClientId
  : undefined;
const searchConsoleVerificationToken =
  import.meta.env.VITE_GOOGLE_SITE_VERIFICATION?.trim() ||
  "1JltOKd_x2oUG8jv1tJyOx0XOzM47Znd8jNsMIoCtrE";
const verifiedSearchConsoleToken = /^[A-Za-z0-9_-]{8,512}$/.test(
  searchConsoleVerificationToken ?? "",
)
  ? searchConsoleVerificationToken
  : undefined;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();

              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },

      {
        name: "viewport",

        content: "width=device-width, initial-scale=1",
      },

      {
        name: "theme-color",

        content: "#2a9d6f",
      },

      {
        title: "Kodarai — Find Businesses Without Websites",
      },

      {
        name: "description",

        content:
          "Kodarai helps web designers find high-rated local businesses with no website and close them fast.",
      },

      {
        name: "author",

        content: "Kodarai",
      },

      ...(verifiedSearchConsoleToken
        ? [
            {
              name: "google-site-verification",
              content: verifiedSearchConsoleToken,
            },
          ]
        : []),

      {
        property: "og:title",

        content: "Kodarai — Lead Gen for Web Designers",
      },

      {
        property: "og:description",

        content:
          "Kodarai helps web designers find high-rated local businesses with no website and close them fast.",
      },

      {
        property: "og:type",

        content: "website",
      },

      {
        property: "og:site_name",

        content: "Kodarai",
      },

      {
        property: "og:image",

        content: "https://kodarai.xyz/kodarai-social-preview.png",
      },

      {
        property: "og:image:width",

        content: "1731",
      },

      {
        property: "og:image:height",

        content: "909",
      },

      {
        property: "og:image:type",

        content: "image/png",
      },

      {
        name: "twitter:card",

        content: "summary_large_image",
      },

      {
        name: "twitter:image",

        content: "https://kodarai.xyz/kodarai-social-preview.png",
      },

      {
        name: "twitter:title",

        content: "Kodarai — Find Businesses Without Websites",
      },

      {
        name: "twitter:description",

        content: "Find local businesses without websites, build their site, and send a live link.",
      },

      {
        name: "twitter:site",

        content: "@kodarai",
      },
    ],

    scripts: verifiedAdSenseClientId
      ? [
          {
            id: "kodarai-adsense-script",
            async: true,
            crossOrigin: "anonymous",
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${verifiedAdSenseClientId}`,
          },
        ]
      : [],

    links: [
      {
        rel: "icon",

        type: "image/svg+xml",

        href: "/favicon.svg?v=2",
      },

      {
        rel: "shortcut icon",

        type: "image/svg+xml",

        href: "/favicon.svg?v=2",
      },

      {
        rel: "manifest",

        href: "/manifest.webmanifest?v=3",
      },

      {
        rel: "apple-touch-icon",

        sizes: "180x180",

        href: "/apple-touch-icon.png?v=3",
      },

      {
        rel: "preconnect",

        href: "https://fonts.googleapis.com",
      },

      {
        rel: "preconnect",

        href: "https://fonts.gstatic.com",

        crossOrigin: "anonymous",
      },

      {
        rel: "stylesheet",

        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },

      {
        rel: "stylesheet",

        href: appCss,
      },
    ],
  }),

  shellComponent: RootShell,

  component: RootComponent,

  notFoundComponent: NotFoundComponent,

  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <HeadContent />
  <script
    dangerouslySetInnerHTML={{
      __html: `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1612279367110939');
        fbq('track', 'PageView');
      `,
    }}
  />
  <script
    dangerouslySetInnerHTML={{
      __html: `
        !function (w, d, t) {
          w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
          ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
          ttq.setAndDefer = function(t, e) { t[e] = function() { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
          ttq.instance = function(t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
          ttq.load = function(e, n) { var r = 'https://analytics.tiktok.com/i18n/pixel/events.js', o = n && n.partner; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; n = document.createElement('script'); n.type = 'text/javascript'; n.async = !0; n.src = r + '?sdkid=' + e + '&lib=' + t; e = document.getElementsByTagName('script')[0]; e.parentNode.insertBefore(n, e); };
          ttq.load('DB1KSURC77U5HCCK5B7G');
          ttq.page();
        }(window, document, 'ttq');
      `,
    }}
  />
      </head>

      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function AuthInvalidator() {
  const router = useRouter();

  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();

      queryClient.invalidateQueries();
    });

    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthInvalidator />

        <AnalyticsProvider />

        <AttributionSync />

        <VisitorTracker />

        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />

        <InstallPwaPrompt />

        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
