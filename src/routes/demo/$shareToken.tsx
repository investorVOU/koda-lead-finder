import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { buildStudioPreviewDoc } from "@/components/studio/StudioLivePreview";
import { getPublicStudioDemo, recordPublicStudioDemoView } from "@/lib/conversion.functions";

import { trackEvent } from "@/lib/analytics";
export const Route = createFileRoute("/demo/$shareToken")({
  head: () => ({ meta: [{ title: "Website sample" }, { name: "robots", content: "noindex" }] }),
  component: PublicStudioDemoPage,
});

function PublicStudioDemoPage() {
  const { shareToken } = Route.useParams();
  const getDemo = useServerFn(getPublicStudioDemo);
  const recordView = useServerFn(recordPublicStudioDemoView);
  const [demo, setDemo] = useState<{ name: string; files: Record<string, string> } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDemo({ data: { token: shareToken } }).then((result) => {
      if (cancelled) return;
      if ("error" in result) { setNotFound(true); return; }
      setDemo(result.demo);
      // This route is separate from Studio's owner preview, so editor previews do not inflate views.
      trackEvent("demo_link_viewed");
      void recordView({ data: { token: shareToken } });
    }).catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [getDemo, recordView, shareToken]);

  const document = useMemo(() => demo ? buildStudioPreviewDoc(demo.files) : null, [demo]);
  if (notFound || (demo && !document)) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center"><div><h1 className="text-xl font-semibold">This website sample is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">The link may have been disabled or the sample is no longer available.</p></div></div>;
  if (!document) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading website sample" /></div>;
  return <main className="min-h-screen bg-white"><iframe title={`${demo?.name ?? "Website"} website sample`} srcDoc={document} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" className="block min-h-screen w-full border-0" /></main>;
}
