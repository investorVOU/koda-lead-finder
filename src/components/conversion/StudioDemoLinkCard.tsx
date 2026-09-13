import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Eye, Link2, Loader2, MessageCircle, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createStudioDemoLink, getStudioDemoLink, revokeStudioDemoLink } from "@/lib/conversion.functions";
import { trackEvent } from "@/lib/analytics";

type LinkData = { share_token: string; is_active: boolean; created_at: string; views: string[] } | null;

export function StudioDemoLinkCard({ projectId, hasWebsite }: { projectId: string; hasWebsite: boolean }) {
  const navigate = useNavigate();
  const load = useServerFn(getStudioDemoLink);
  const create = useServerFn(createStudioDemoLink);
  const revoke = useServerFn(revokeStudioDemoLink);
  const [link, setLink] = useState<LinkData>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasWebsite) return;
    load({ data: { projectId } }).then((result) => { if ("link" in result) setLink(result.link as LinkData); });
  }, [hasWebsite, load, projectId]);

  const url = useMemo(() => link && typeof window !== "undefined" ? `${window.location.origin}/demo/${link.share_token}` : "", [link]);
  const createLink = async () => {
    setLoading(true);
    try {
      const result = await create({ data: { projectId } });
      if ("error" in result) { toast.error(result.message); return; }
      setLink({ ...result.link, views: [] });
      trackEvent("demo_link_created");
      toast.success("Share link created");
    } finally { setLoading(false); }
  };
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true); trackEvent("demo_link_copied"); toast.success("Website link copied");
    window.setTimeout(() => setCopied(false), 1600);
  };
  const toggle = async () => {
    if (!link) return;
    setLoading(true);
    try {
      const result = await revoke({ data: { projectId, active: !link.is_active } });
      if ("error" in result) { toast.error("Could not update the link."); return; }
      setLink({ ...link, is_active: !link.is_active });
      toast.success(link.is_active ? "Share link disabled" : "Share link enabled");
    } finally { setLoading(false); }
  };

  if (!hasWebsite) return null;
  const lastViewed = link?.views?.[0] ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round((new Date(link.views[0]).getTime() - Date.now()) / 60_000), "minute") : null;
  return <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-zinc-100">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Your website link</p><p className="mt-1 text-xs leading-5 text-zinc-400">Send this sample to a business owner. They can only view the website.</p></div><Link2 className="size-4 text-emerald-400" /></div>
    {!link ? <Button size="sm" className="mt-3 bg-emerald-500 text-[#04120c] hover:bg-emerald-400" onClick={createLink} disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />}Create share link</Button> : <>
      <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 p-2"><span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">{url}</span><Button size="icon" variant="ghost" className="size-7 shrink-0 text-zinc-200" onClick={copy} aria-label="Copy website link">{copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}</Button></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-xs text-zinc-400"><Eye className="size-3.5" />Viewed {link.views.length} time{link.views.length === 1 ? "" : "s"}{lastViewed ? ` ? ${lastViewed}` : ""}</span><Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-300" onClick={toggle} disabled={loading}><Power className="size-3.5" />{link.is_active ? "Disable" : "Enable"}</Button>{link.views.length > 0 && <Button size="sm" className="h-8 bg-emerald-500 text-xs text-[#04120c] hover:bg-emerald-400" onClick={() => { trackEvent("demo_followup_clicked"); navigate({ to: "/leads" }); }}><MessageCircle className="size-3.5" />Follow up now</Button>}</div>
      {link.views.slice(0, 3).map((viewedAt) => <p key={viewedAt} className="mt-2 text-xs text-zinc-500">{new Date(viewedAt).toLocaleString()} ? Website viewed</p>)}
    </>}
  </section>;
}
