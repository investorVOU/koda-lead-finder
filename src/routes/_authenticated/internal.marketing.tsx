import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ImagePlus, Loader2, Mail, MousePointerClick, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialProofManager } from "@/components/marketing/SocialProofManager";
import {
  generateMarketingPost,
  getPlanActivationDashboard,
  pushToBuffer,
  runPlanActivationEmails,
  uploadMarketingAsset,
  verifyMarketingAccess,
} from "@/lib/internal-marketing.functions";

export const Route = createFileRoute("/_authenticated/internal/marketing")({
  head: () => ({ meta: [{ title: "Internal Marketing - Kodarai" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: InternalMarketingPage,
});

type Platform = "linkedin" | "x" | "facebook" | "threads" | "pinterest" | "instagram";
type Draft = { id: string; text: string };
type QueuedPost = { id: string; platform: Platform; text: string; imageUrl?: string; dueAt: string | null; status: string; createdAt: string };
type UploadedImage = { name: string; previewUrl: string; publicUrl: string };
type ActivationMetrics = {
  enrolled: number;
  unpaid: number;
  metrics: { campaignKey: string; sent: number; clicked: number; converted: number; clickRate: number; conversionRate: number }[];
  recent: { id: string; campaign_key: string; sent_at: string; clicked_at: string | null; name: string | null; email: string | null; converted: boolean }[];
};

const platforms: { value: Platform; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "facebook", label: "Facebook" },
  { value: "threads", label: "Threads" },
  { value: "pinterest", label: "Pinterest" },
  { value: "instagram", label: "Instagram" },
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

const activationLabels: Record<string, string> = {
  "plan-activation-6h": "6 hours",
  "plan-activation-24h": "24 hours",
  "plan-activation-3d": "3 days",
  "plan-activation-7d": "7 days",
};

function PlanActivationTab({ passcode }: { passcode: string }) {
  const getDashboard = useServerFn(getPlanActivationDashboard);
  const runEmails = useServerFn(runPlanActivationEmails);
  const [data, setData] = useState<ActivationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setData(await getDashboard({ data: { passcode } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load plan activation metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runDueEmails = async () => {
    setRunning(true);
    try {
      const result = await runEmails({ data: { passcode } });
      const sent = Object.values(result).reduce((total, stage) => total + stage.sent, 0);
      toast.success(sent ? `${sent} due activation email${sent === 1 ? "" : "s"} sent.` : "No due activation emails to send.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not run plan activation emails.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">Plan activation emails</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ad-acquired users are enrolled when they reach plan selection. The hourly schedule sends each stage once, stops after a paid conversion, and records CTA clicks.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || running}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
          <Button size="sm" onClick={() => void runDueEmails()} disabled={loading || running}><Mail className="size-4" /> {running ? "Sending…" : "Run due emails"}</Button>
        </div>
      </div>

      {loading && !data ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Ad leads enrolled</p><p className="mt-1 text-2xl font-bold">{data?.enrolled ?? 0}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-sm text-muted-foreground">Unpaid and still eligible</p><p className="mt-1 text-2xl font-bold">{data?.unpaid ?? 0}</p></div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          {data?.metrics.map((metric) => <article key={metric.campaignKey} className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">{activationLabels[metric.campaignKey] ?? metric.campaignKey}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><Mail className="mx-auto size-4 text-muted-foreground" /><p className="mt-1 font-semibold text-foreground">{metric.sent}</p><p className="text-muted-foreground">Sent</p></div><div><MousePointerClick className="mx-auto size-4 text-muted-foreground" /><p className="mt-1 font-semibold text-foreground">{metric.clicked}</p><p className="text-muted-foreground">{metric.clickRate}% clicked</p></div><div><CheckCircle2 className="mx-auto size-4 text-muted-foreground" /><p className="mt-1 font-semibold text-foreground">{metric.converted}</p><p className="text-muted-foreground">{metric.conversionRate}% paid</p></div></div>
          </article>)}
        </div>

        <div className="mt-7">
          <h3 className="text-sm font-semibold">Recent delivery activity</h3>
          {data?.recent.length ? <div className="mt-3 divide-y rounded-xl border border-border">{data.recent.map((send) => <div key={send.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><div><p className="font-medium">{send.name || send.email || "Unknown user"}</p><p className="text-xs text-muted-foreground">{activationLabels[send.campaign_key] ?? send.campaign_key} · {new Date(send.sent_at).toLocaleString()}</p></div><div className="flex gap-2 text-xs"><span className={send.clicked_at ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{send.clicked_at ? "Clicked" : "Not clicked"}</span><span className={send.converted ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>{send.converted ? "Paid" : "Unpaid"}</span></div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No plan activation emails have been sent yet.</p>}
        </div>
      </>}
    </section>
  );
}

function InternalMarketingPage() {
  const navigate = useNavigate();
  const checkAccess = useServerFn(verifyMarketingAccess);
  const generate = useServerFn(generateMarketingPost);
  const upload = useServerFn(uploadMarketingAsset);
  const queue = useServerFn(pushToBuffer);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("confident, direct, benefit-led, no corporate fluff");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [queuedPosts, setQueuedPosts] = useState<QueuedPost[]>([]);

  useEffect(() => () => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
  }, [image]);

  const rejectAsNotFound = () => navigate({ to: "/this-page-does-not-exist", replace: true } as never);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passcode || checkingAccess) return;
    setCheckingAccess(true);
    try {
      const result = await checkAccess({ data: { passcode } });
      if (!result.authorized) return rejectAsNotFound();
      setAuthorized(true);
    } catch {
      rejectAsNotFound();
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      toast.error("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      const result = await upload({ data: { passcode, filename: file.name, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", contentBase64 } });
      if ("error" in result) throw new Error(result.message);
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
      setImage({ name: file.name, previewUrl: URL.createObjectURL(file), publicUrl: result.publicUrl });
      toast.success("Image uploaded and ready for Buffer.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generate({ data: { passcode, platform, topic, tone } });
      if ("error" in result) throw new Error(result.message);
      setDrafts(result.drafts.map((text, index) => ({ id: `${Date.now()}-${index}`, text })));
      toast.success(`${result.drafts.length} drafts generated with ${result.provider}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate drafts.");
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (id: string, text: string) => setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, text } : draft));

  const handlePush = async (draft: Draft) => {
    if ((platform === "pinterest" || platform === "instagram") && !image) {
      toast.error(`${platform === "instagram" ? "Instagram" : "Pinterest"} posts need an image before they can be queued.`);
      return;
    }
    setPushingId(draft.id);
    try {
      const result = await queue({ data: { passcode, platform, text: draft.text, assetUrl: image?.publicUrl, mode: "addToQueue" } });
      if ("error" in result) throw new Error(result.message);
      setQueuedPosts((current) => [{ id: result.post.id, platform, text: result.post.text, imageUrl: image?.publicUrl, dueAt: result.post.dueAt, status: result.status, createdAt: new Date().toISOString() }, ...current]);
      toast.success("Post added to your Buffer queue.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not queue this post.");
    } finally {
      setPushingId(null);
    }
  };

  if (!authorized) {
    return (
      <DashboardShell>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-sm items-center px-4">
          <form onSubmit={unlock} className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Restricted area</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the internal access code to continue.</p>
            <Label className="mt-5 block" htmlFor="marketing-passcode">Access code</Label>
            <Input id="marketing-passcode" className="mt-2" type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="current-password" required />
            <Button className="mt-5 w-full" type="submit" disabled={checkingAccess}>
              {checkingAccess && <Loader2 className="size-4 animate-spin" />} Continue
            </Button>
          </form>
        </main>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-5xl py-2">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Founder tool</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Marketing queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate, refine, and queue KodarAI posts without leaving the dashboard.</p>
        </div>

        <Tabs defaultValue="social">
          <TabsList>
            <TabsTrigger value="social">Social queue</TabsTrigger>
            <TabsTrigger value="activation">Plan activation</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="mt-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marketing-platform">Platform</Label>
              <select id="marketing-platform" value={platform} onChange={(event) => setPlatform(event.target.value as Platform)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                {platforms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              {platform === "facebook" && <p className="text-xs text-muted-foreground">Facebook Group posts require manual confirmation in Buffer.</p>}
              {platform === "pinterest" && <p className="text-xs text-amber-700 dark:text-amber-400">Pinterest needs an image before it can be queued.</p>}
              {platform === "instagram" && <p className="text-xs text-amber-700 dark:text-amber-400">Instagram needs an image before it can be queued.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-image">Image <span className="font-normal text-muted-foreground">optional except Pinterest and Instagram</span></Label>
              <input ref={fileInputRef} id="marketing-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleUpload(file); event.target.value = ""; }} />
              {image ? (
                <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-2">
                  <img src={image.previewUrl} alt="Selected marketing asset" className="size-7 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs">{image.name}</span>
                  <button type="button" aria-label="Remove image" onClick={() => setImage(null)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
                </div>
              ) : <Button type="button" variant="outline" className="w-full justify-start" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {uploading ? "Uploading image…" : "Upload image"}</Button>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="marketing-topic">Topic or angle <span className="font-normal text-muted-foreground">optional</span></Label>
              <Textarea id="marketing-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={800} rows={3} placeholder="e.g. Lead Finder feature highlight, or the time freelancers lose researching prospects" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="marketing-tone">Tone</Label>
              <Input id="marketing-tone" value={tone} onChange={(event) => setTone(event.target.value)} maxLength={120} />
            </div>
          </div>
          <Button className="mt-6" onClick={handleGenerate} disabled={generating || uploading}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {generating ? "Generating drafts…" : "Generate drafts"}
          </Button>
        </section>

        {drafts.length > 0 && <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Drafts</h2><p className="text-sm text-muted-foreground">Edit any draft before adding it to Buffer.</p></div>{image && <img src={image.previewUrl} alt="Attached marketing asset" className="size-12 rounded-lg border object-cover" />}</div>
          <div className="grid gap-4">
            {drafts.map((draft, index) => <article key={draft.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Draft {index + 1}</span><span className={`text-xs tabular-nums ${platform === "x" && draft.text.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>{draft.text.length}{platform === "x" ? "/280" : " characters"}</span></div>
              <Textarea value={draft.text} onChange={(event) => updateDraft(draft.id, event.target.value)} rows={7} maxLength={3_000} />
              <div className="mt-3 flex justify-end"><Button onClick={() => handlePush(draft)} disabled={pushingId === draft.id || !draft.text.trim()}>{pushingId === draft.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {pushingId === draft.id ? "Queuing…" : "Push to Buffer"}</Button></div>
            </article>)}
          </div>
        </section>}

        {queuedPosts.length > 0 && <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Recently queued</h2>
          <div className="mt-4 space-y-3">
            {queuedPosts.map((post) => <div key={post.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              {post.imageUrl ? <img src={post.imageUrl} alt="Queued post asset" className="size-10 rounded object-cover" /> : <div className="flex size-10 items-center justify-center rounded bg-muted"><Send className="size-4 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm">{post.text}</p><p className="mt-0.5 text-xs text-muted-foreground">{platforms.find((item) => item.value === post.platform)?.label} · {post.dueAt ? `Scheduled ${new Date(post.dueAt).toLocaleString()}` : `Queued ${new Date(post.createdAt).toLocaleString()}`}</p></div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" />{post.status}</span>
            </div>)}
          </div>
        </section>}
          </TabsContent>

          <TabsContent value="activation" className="mt-6">
            <PlanActivationTab passcode={passcode} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <SocialProofManager passcode={passcode} />
          </TabsContent>
        </Tabs>
      </main>
    </DashboardShell>
  );
}
