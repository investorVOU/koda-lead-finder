import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { createStudioDemoLink } from "@/lib/conversion.functions";
import { createWebsiteProjectFromLead } from "@/lib/studio.functions";
import {
  createClientPackProposalLink,
  ensureClientPack,
  getClientPack,
  recordClientPackActivity,
  updateClientPack,
} from "@/lib/client-pack.functions";
import { generateProposalPdf } from "@/lib/proposal";
import { usePlanPreviewGate } from "@/components/billing/PlanPreviewGate";
import { useSubscription } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { isPreviewMode } from "@/lib/plan-access";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/client-pack/$leadId")({
  head: () => ({ meta: [{ title: "Client Pack - Kodarai" }] }),
  component: ClientPackPage,
});

type HeaderLead = {
  business_name: string;
  location: string | null;
  has_website: boolean;
  phone: string | null;
};

const ITEM_LABELS: Record<string, string> = {
  mobile_friendly: "Professional mobile-friendly website",
  contact_button: "Contact button",
  location_map: "Business location / map",
};

function ClientPackPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: subscription } = useSubscription(user?.id);
  const { guardAction } = usePlanPreviewGate();
  const isPreview = isPreviewMode(subscription?.status);
  const load = useServerFn(getClientPack);
  const ensure = useServerFn(ensureClientPack);
  const savePack = useServerFn(updateClientPack);
  const track = useServerFn(recordClientPackActivity);
  const createDemo = useServerFn(createStudioDemoLink);
  const createProject = useServerFn(createWebsiteProjectFromLead);
  const shareProposal = useServerFn(createClientPackProposalLink);
  const query = useQuery({
    queryKey: ["client-pack", leadId],
    queryFn: () => load({ data: { leadId } }),
  });
  const data = query.data && "lead" in query.data ? query.data : null;
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tone, setTone] = useState<"casual" | "short" | "professional">("casual");
  const [edits, setEdits] = useState<Record<string, string | number | null | string[]>>({});

  const pack = data?.pack;
  const lead = data?.lead;
  const values = useMemo(
    () => ({
      preparedBy: String(edits.preparedBy ?? pack?.prepared_by ?? ""),
      price: String(edits.price ?? pack?.proposal_price ?? ""),
      currency: String(edits.currency ?? pack?.proposal_currency ?? ""),
      deliveryDays: (edits.deliveryDays ?? pack?.delivery_days ?? 7) as number | null,
      note: String(edits.note ?? pack?.proposal_note ?? ""),
      message: String(edits.message ?? pack?.whatsapp_message ?? ""),
      script: String(edits.script ?? pack?.call_script ?? ""),
      included: (edits.included ?? pack?.included_items ?? []) as string[],
    }),
    [edits, pack],
  );
  const demoUrl =
    data?.demo?.is_active && typeof window !== "undefined"
      ? `${window.location.origin}/demo/${data.demo.share_token}`
      : "";
  const phoneAvailable = Boolean(lead?.phone && lead.phone.replace(/\D/g, "").length >= 7);
  const set = (key: string, value: string | number | null | string[]) =>
    setEdits((current) => ({ ...current, [key]: value }));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["client-pack", leadId] });
  const makeMessageTone = (nextTone: "casual" | "short" | "professional") => {
    if (!lead) return;
    setTone(nextTone);
    const opportunity = data?.demo?.is_active
      ? "I made a quick sample website to show what your business could look like online."
      : lead.has_website
        ? "I had an idea for how your website could be clearer online."
        : "I noticed you do not have a website yet.";
    const name = lead.business_name;
    const nextMessage =
      nextTone === "short"
        ? `Hi ${name}, I came across your business while researching businesses online. ${opportunity} Can I send it to you?`
        : nextTone === "professional"
          ? `Hello ${name},\n\nI came across your business while researching businesses online. ${opportunity}\n\nWould you be open to seeing it?`
          : `Hi ${name},\n\nI came across your business while researching businesses online. ${opportunity}\n\nCan I send it to you?`;
    set("message", nextMessage);
  };

  const prepare = async () => {
    if (guardAction("lead_paid_action")) return;
    setCreating(true);
    const result = await ensure({ data: { leadId } });
    setCreating(false);
    if ("error" in result) return toast.error(result.message);
    trackEvent(result.created ? "client_pack_created" : "client_pack_opened", { source: "lead" });
    await refresh();
  };
  const save = async () => {
    if (!pack || guardAction("lead_paid_action")) return;
    setSaving(true);
    const result = await savePack({
      data: {
        leadId,
        preparedBy: values.preparedBy,
        proposalPrice: values.price,
        proposalCurrency: values.currency,
        deliveryDays: values.deliveryDays,
        proposalNote: values.note,
        whatsappMessage: values.message,
        callScript: values.script,
        includedItems: values.included as ("mobile_friendly" | "contact_button" | "location_map")[],
      },
    });
    setSaving(false);
    if ("error" in result) return toast.error(result.message);
    setEdits({});
    toast.success("Client Pack saved");
    await refresh();
  };
  const activity = async (
    action:
      | "message_copied"
      | "whatsapp_opened"
      | "call_script_copied"
      | "demo_copied"
      | "proposal_downloaded"
      | "proposal_shared"
      | "follow_up_started",
    event: string,
  ) => {
    if (!pack || guardAction("lead_paid_action")) return false;
    const result = await track({ data: { leadId, action } });
    if ("error" in result) {
      toast.error(result.message);
      return false;
    }
    trackEvent(event, { action });
    await queryClient.invalidateQueries({ queryKey: ["today-plan"] });
    return true;
  };
  const copy = async (
    text: string,
    action: Parameters<typeof activity>[0],
    event: string,
    label: string,
  ) => {
    if (!(await activity(action, event))) return;
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };
  const build = async () => {
    if (!lead || guardAction("studio_generate")) return;
    setCreating(true);
    const result = await createProject({
      data: {
        placeId: lead.place_id,
        name: lead.business_name,
        category: lead.category,
        location: lead.location,
        address: lead.address,
        phone: lead.phone,
        rating: lead.rating,
        reviewCount: lead.review_count,
        hasWebsite: lead.has_website,
        mapsUrl: lead.maps_url,
      },
    });
    setCreating(false);
    if ("error" in result) return toast.error(result.message);
    navigate({
      to: "/studio/$projectId",
      params: { projectId: result.project.id },
      search: { generate: "1" },
    });
  };
  const makeDemo = async () => {
    if (!data?.project || guardAction("lead_paid_action")) return;
    setCreating(true);
    const result = await createDemo({ data: { projectId: data.project.id } });
    setCreating(false);
    if ("error" in result) return toast.error(result.message);
    toast.success("Website demo is ready");
    await refresh();
  };
  const downloadProposal = async () => {
    if (!lead || !pack) return;
    if (!(await activity("proposal_downloaded", "client_pack_proposal_downloaded"))) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateProposalPdf(lead as any, {
      fromName: values.preparedBy,
      fromCompany: values.preparedBy || "Website Proposal",
      fromContact: "",
      packageName: "Website",
      price: [values.currency, values.price].filter(Boolean).join(" "),
      timeline: values.deliveryDays ? `${values.deliveryDays} days` : "To be agreed",
      scope:
        values.included.map((item) => ITEM_LABELS[item]).join("\n") ||
        "Website details to be agreed",
    });
  };
  const copyProposalLink = async () => {
    if (guardAction("lead_paid_action")) return;
    const result = await shareProposal({ data: { leadId } });
    if ("error" in result) return toast.error(result.message);
    await navigator.clipboard.writeText(`${window.location.origin}/proposal/${result.shareToken}`);
    await activity("proposal_shared", "client_pack_proposal_shared");
    toast.success("Proposal link copied");
  };
  const openWhatsApp = async () => {
    if (
      !lead ||
      !phoneAvailable ||
      !(await activity("whatsapp_opened", "client_pack_whatsapp_clicked"))
    )
      return;
    window.open(
      `https://wa.me/${lead.phone!.replace(/\D/g, "")}?text=${encodeURIComponent(values.message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.success("WhatsApp opened - send the message when you are ready.");
  };
  const contact = async () => {
    if (phoneAvailable) return openWhatsApp();
    document
      .getElementById("client-pack-message")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (query.isLoading)
    return (
      <DashboardShell>
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  if (!data || !lead)
    return (
      <DashboardShell>
        <div className="rounded-xl border p-5">This Client Pack is not available.</div>
      </DashboardShell>
    );
  if (!pack)
    return (
      <DashboardShell>
        <div className="mx-auto max-w-2xl">
          <PageHeader lead={lead} />
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Prepare Client Pack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              KodarAI will put your message, call script, price suggestion and simple proposal in
              one place. Nothing will be sent automatically.
            </p>
            {isPreview && <PreviewCopy />}
            <Button className="mt-5" onClick={prepare} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}Prepare Client Pack{" "}
              <ChevronRight className="size-4" />
            </Button>
          </section>
        </div>
      </DashboardShell>
    );

  const websiteReady = Boolean(data.project?.ready && data.demo?.is_active);
  const proposalReady = Boolean(values.price);
  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-2xl pb-8">
        <PageHeader lead={lead} />
        {isPreview && <PreviewCopy />}
        <section className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Client Pack</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything you need to approach this business.
              </p>
            </div>
            <Sparkles className="size-5 text-primary" />
          </div>
          <div className="mt-4 divide-y rounded-xl border">
            <PackRow
              label="Website demo"
              ready={websiteReady}
              onClick={() =>
                document.getElementById("client-pack-demo")?.scrollIntoView({ behavior: "smooth" })
              }
            />
            <PackRow
              label="WhatsApp message"
              ready={Boolean(values.message)}
              onClick={() =>
                document
                  .getElementById("client-pack-message")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            />
            <PackRow
              label="Call script"
              ready={Boolean(values.script)}
              onClick={() =>
                document.getElementById("client-pack-call")?.scrollIntoView({ behavior: "smooth" })
              }
            />
            <PackRow
              label="Price suggestion"
              ready={proposalReady}
              missing="Add price"
              onClick={() =>
                document.getElementById("client-pack-price")?.scrollIntoView({ behavior: "smooth" })
              }
            />
            <PackRow
              label="Simple proposal"
              ready={proposalReady}
              missing="Add price"
              onClick={() =>
                document
                  .getElementById("client-pack-proposal")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            />
          </div>
        </section>

        <Section
          id="client-pack-demo"
          title="Website demo"
          description="A sample website you can show the business owner."
        >
          {!data.project?.ready ? (
            <>
              <p className="text-sm text-muted-foreground">
                You have not made a sample website for this business yet.
              </p>
              {!lead.has_website && (
                <Button className="mt-4" onClick={build} disabled={creating}>
                  {creating && <Loader2 className="size-4 animate-spin" />}Build Website
                </Button>
              )}
            </>
          ) : !data.demo?.is_active ? (
            <Button onClick={makeDemo} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}Create shareable demo
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={demoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open Demo
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(demoUrl, "demo_copied", "client_pack_demo_copied", "Demo link")}
              >
                <Copy className="size-4" />
                Copy Link
              </Button>
            </div>
          )}
        </Section>

        <Section
          id="client-pack-message"
          title="WhatsApp message"
          description="Use this as a starting point, then make it sound like you."
        >
          <Textarea
            value={values.message}
            onChange={(event) => set("message", event.target.value)}
            className="min-h-36"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copy(values.message, "message_copied", "client_pack_message_copied", "Message")
              }
            >
              <Copy className="size-4" />
              Copy Message
            </Button>
            {phoneAvailable && (
              <Button size="sm" onClick={openWhatsApp}>
                <MessageCircle className="size-4" />
                Send on WhatsApp
              </Button>
            )}
            <button
              type="button"
              className="px-1 text-xs font-medium text-primary"
              onClick={() => makeMessageTone("short")}
            >
              Make it shorter
            </button>
            <button
              type="button"
              className="px-1 text-xs font-medium text-primary"
              onClick={() => makeMessageTone("casual")}
            >
              Make it casual
            </button>
            <button
              type="button"
              className="px-1 text-xs font-medium text-primary"
              onClick={() => makeMessageTone("professional")}
            >
              Make it professional
            </button>
          </div>
          {tone !== "casual" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Edit the message above to use a {tone} tone. Kodarai only uses the business details it
              knows.
            </p>
          )}
        </Section>

        <Section
          id="client-pack-call"
          title="Call Script"
          description="Don't know what to say on the phone? Use and edit this simple script."
        >
          <Textarea
            value={values.script}
            onChange={(event) => set("script", event.target.value)}
            className="min-h-64"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copy(
                  values.script,
                  "call_script_copied",
                  "client_pack_call_script_viewed",
                  "Call script",
                )
              }
            >
              <Copy className="size-4" />
              Copy script
            </Button>
            {demoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(demoUrl, "demo_copied", "client_pack_demo_copied", "Demo link")}
              >
                Copy Demo Link
              </Button>
            )}
            {phoneAvailable && (
              <Button size="sm" variant="outline" onClick={openWhatsApp}>
                Open WhatsApp
              </Button>
            )}
          </div>
        </Section>

        <Section
          id="client-pack-price"
          title="Price suggestion"
          description="This is a suggestion, not a required price. You decide what to charge."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Price">
              <Input
                value={values.price}
                onChange={(event) => set("price", event.target.value)}
                inputMode="decimal"
                placeholder="Choose a price"
              />
            </Field>
            <Field label="Currency">
              <Input
                value={values.currency}
                onChange={(event) => set("currency", event.target.value.toUpperCase())}
                placeholder="NGN, USD, GBP"
                maxLength={12}
              />
            </Field>
            <Field label="Delivery days">
              <Input
                type="number"
                min={1}
                max={365}
                value={values.deliveryDays ?? ""}
                onChange={(event) =>
                  set("deliveryDays", event.target.value ? Number(event.target.value) : null)
                }
              />
            </Field>
          </div>
          {pack.proposal_currency === "NGN" && pack.proposal_price && (
            <p className="mt-3 text-xs text-muted-foreground">
              This is the current Kodarai estimator result. It is not a currency conversion or a
              guaranteed market price.
            </p>
          )}
          {!pack.proposal_price && (
            <p className="mt-3 text-xs text-muted-foreground">
              Set the price and currency you want to quote. Kodarai does not invent a currency
              conversion for this business.
            </p>
          )}
        </Section>

        <Section
          id="client-pack-proposal"
          title="Simple proposal"
          description="A short, beginner-friendly proposal based only on the items you choose."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name or business">
              <Input
                value={values.preparedBy}
                onChange={(event) => set("preparedBy", event.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="A short note">
              <Input
                value={values.note}
                onChange={(event) => set("note", event.target.value)}
                maxLength={1000}
                placeholder="Optional"
              />
            </Field>
          </div>
          <div className="mt-3 space-y-2">
            {Object.entries(ITEM_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.included.includes(key)}
                  onChange={(event) =>
                    set(
                      "included",
                      event.target.checked
                        ? [...values.included, key]
                        : values.included.filter((item) => item !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("proposal-preview")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Preview Proposal
            </Button>
            <Button variant="outline" disabled={!proposalReady} onClick={downloadProposal}>
              <FileText className="size-4" />
              Download Proposal
            </Button>
            <Button variant="outline" disabled={!proposalReady} onClick={copyProposalLink}>
              <Copy className="size-4" />
              Copy Proposal Link
            </Button>
          </div>
        </Section>
        <section id="proposal-preview" className="mb-4 rounded-2xl border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Website Proposal
          </p>
          <h2 className="mt-2 text-xl font-semibold">Prepared for: {lead.business_name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepared by: {values.preparedBy || "Your name"}
          </p>
          <h3 className="mt-5 font-semibold">What Ill build</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {values.included.length ? (
              values.included.map((item) => <li key={item}>{ITEM_LABELS[item]}</li>)
            ) : (
              <li>Website details to be agreed</li>
            )}
          </ul>
          <h3 className="mt-5 font-semibold">Price</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {[values.currency, values.price].filter(Boolean).join(" ") || "To be agreed"}
          </p>
          <h3 className="mt-5 font-semibold">Delivery</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {values.deliveryDays ? `${values.deliveryDays} days` : "To be agreed"}
          </p>
          <h3 className="mt-5 font-semibold">Next step</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            If you are happy with the sample, we can agree the final details and I can complete the
            website for you.
          </p>
          {values.note && <p className="mt-4 text-sm text-muted-foreground">{values.note}</p>}
        </section>
        <div className="sticky bottom-3 z-10 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button className="w-full" onClick={contact}>
            Start contacting this business <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}Save changes
          </Button>
        </div>
      </main>
    </DashboardShell>
  );
}
function PageHeader({ lead }: { lead: HeaderLead }) {
  return (
    <header className="mb-4">
      <Link to="/leads" className="text-xs font-medium text-primary">
        ? Saved leads
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Client Pack</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you need to approach this business.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{lead.business_name}</span>
        {lead.location && <span>{lead.location}</span>}
        <span>{lead.has_website ? "Has a website" : "No website found"}</span>
        {lead.phone && <span>Contact available</span>}
      </div>
    </header>
  );
}
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-4 scroll-mt-4 rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function PackRow({
  label,
  ready,
  missing = "Not created",
  onClick,
}: {
  label: string;
  ready: boolean;
  missing?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent("client_pack_item_opened", { item: label.toLowerCase().replace(/\s+/g, "_") });
        onClick();
      }}
      className="flex w-full items-center justify-between px-3 py-3 text-left text-sm"
    >
      <span>{label}</span>
      <span
        className={ready ? "inline-flex items-center gap-1 text-primary" : "text-muted-foreground"}
      >
        {ready ? (
          <>
            <Check className="size-4" />
            Ready
          </>
        ) : (
          missing
        )}
      </span>
    </button>
  );
}
function PreviewCopy() {
  return (
    <div className="my-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
      <p className="font-medium">Client Pack preview</p>
      <p className="mt-1 text-muted-foreground">
        Explore the message, call script and proposal preview. Choose a plan before preparing or
        sending materials for a real business.
      </p>
    </div>
  );
}
