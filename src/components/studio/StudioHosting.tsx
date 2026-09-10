import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Rocket,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addStudioCustomDomain,
  getStudioCustomDomainStatus,
  removeStudioCustomDomain,
  type CustomDomainDnsRecord,
  type CustomDomainStatus,
  type StudioCustomDomainDetails,
} from "@/lib/studio.functions";

type HostingProps = {
  projectId: string;
  deploymentUrl: string | null;
  deploymentStatus?: string | null;
  customDomain: string | null | undefined;
  customDomainStatus: CustomDomainStatus | null | undefined;
  customDomainVerified: boolean | null | undefined;
  managementAllowed: boolean;
  fileCount: number;
  onDeploy: () => void;
  onChanged: () => void;
};

type DomainDetails = StudioCustomDomainDetails;

const STATUS_COPY: Record<CustomDomainStatus, string> = {
  pending: "Pending verification",
  configuring: "Configuring",
  connected: "Connected",
  error: "Error",
};

function domainUrl(domain: string) {
  return `https://${domain}`;
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value).then(() => toast.success("Link copied"));
}

export function StudioHosting({
  projectId,
  deploymentUrl,
  deploymentStatus,
  customDomain,
  customDomainStatus,
  customDomainVerified,
  managementAllowed,
  fileCount,
  onDeploy,
  onChanged,
}: HostingProps) {
  const runAddDomain = useServerFn(addStudioCustomDomain);
  const runDomainStatus = useServerFn(getStudioCustomDomainStatus);
  const runRemoveDomain = useServerFn(removeStudioCustomDomain);
  const [details, setDetails] = useState<DomainDetails | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDomain = details?.domain ?? customDomain ?? null;
  const currentStatus: CustomDomainStatus | null =
    details?.status ??
    customDomainStatus ??
    (customDomainVerified ? "connected" : currentDomain ? "pending" : null);
  const connected = currentStatus === "connected" && Boolean(currentDomain);

  const primaryUrl = connected && currentDomain ? domainUrl(currentDomain) : deploymentUrl;
  const deploymentLabel = deploymentUrl
    ? "Live"
    : deploymentStatus === "error"
      ? "Failed"
      : deploymentStatus
        ? deploymentStatus.replace(/_/g, " ")
        : "Not published";

  const refresh = async (verify = false) => {
    if (!managementAllowed || !currentDomain) return;
    setChecking(true);
    setError(null);
    try {
      const result = await runDomainStatus({ data: { project_id: projectId, verify } });
      if ("error" in result) {
        setError(result.message);
        return;
      }
      setDetails(result.domain);
      onChanged();
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!managementAllowed || !currentDomain) {
      return;
    }

    // Always reconcile persisted state once with Vercel. This fixes domains
    // that were marked connected before their DNS record had propagated.
    void refresh();

    if (!["pending", "configuring"].includes(currentStatus ?? "")) {
      return;
    }

    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
    // The polling state deliberately follows server data after every result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managementAllowed, currentDomain, currentStatus, projectId]);

  const records = useMemo(() => details?.dnsRecords ?? [], [details]);

  const connect = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await runAddDomain({ data: { project_id: projectId, domain: domainInput } });
      if ("error" in result) {
        setError(result.message);
        if (result.error === "upgrade_required") window.location.assign("/choose-plan");
        return;
      }
      setDetails(result.domain);
      setConnectOpen(false);
      setDomainInput("");
      onChanged();
      toast.success(
        result.domain.status === "connected"
          ? "Domain connected"
          : "Domain added. Finish DNS setup to connect it.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (
      !currentDomain ||
      !window.confirm(
        `Remove ${currentDomain} from this website? Your registrar and DNS records will not be changed.`,
      )
    )
      return;
    setRemoving(true);
    setError(null);
    try {
      const result = await runRemoveDomain({ data: { project_id: projectId } });
      if ("error" in result) {
        setError(result.message);
        return;
      }
      setDetails(null);
      setManageOpen(false);
      onChanged();
      toast.success("Custom domain removed");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0b0e11] p-4 text-zinc-100 sm:p-5">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
              Deploy
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
              Publish and manage your site
            </h2>
          </div>
          <StatusPill
            tone={deploymentUrl ? "green" : deploymentStatus === "error" ? "red" : "zinc"}
          >
            {deploymentLabel}
          </StatusPill>
        </div>

        {primaryUrl ? (
          <section className="border border-white/[0.08] bg-white/[0.025] p-4">
            {connected && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Live · Custom domain
              </p>
            )}
            <p className="mt-1 break-all font-mono text-sm text-zinc-100">{primaryUrl}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button asChild className="h-10 bg-emerald-500 text-[#04120c] hover:bg-emerald-400">
                <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 size-4" />
                  Open site
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => void copyText(primaryUrl)}
                className="h-10 border-white/[0.1] bg-transparent"
              >
                <Copy className="mr-2 size-4" />
                Copy link
              </Button>
              <Button
                variant="outline"
                onClick={onDeploy}
                className="h-10 border-white/[0.1] bg-transparent"
              >
                <RefreshCw className="mr-2 size-4" />
                Redeploy
              </Button>
              {connected && managementAllowed && (
                <Button
                  variant="outline"
                  onClick={() => setManageOpen(true)}
                  className="h-10 border-white/[0.1] bg-transparent"
                >
                  <Settings2 className="mr-2 size-4" />
                  Manage domain
                </Button>
              )}
            </div>
          </section>
        ) : (
          <section className="border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center border border-white/[0.1]">
                <Rocket className="size-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Ready to publish?</p>
                <p className="text-xs text-zinc-500">{fileCount} files ready for Vercel.</p>
              </div>
            </div>
            <Button
              onClick={onDeploy}
              disabled={fileCount === 0}
              className="mt-4 h-10 bg-emerald-500 text-[#04120c] hover:bg-emerald-400"
            >
              <Rocket className="mr-2 size-4" />
              Publish website
            </Button>
          </section>
        )}

        {deploymentUrl && (
          <section className="border border-white/[0.08] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Vercel URL
            </p>
            <p className="mt-2 break-all font-mono text-xs leading-5 text-zinc-300">
              {deploymentUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-white/[0.1] bg-transparent"
              >
                <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 size-3.5" />
                  Open site
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyText(deploymentUrl)}
                className="border-white/[0.1] bg-transparent"
              >
                <Copy className="mr-2 size-3.5" />
                Copy link
              </Button>
            </div>
          </section>
        )}

        {!managementAllowed ? (
          <LockedDomainCard currentDomain={currentDomain} connected={connected} />
        ) : currentDomain ? (
          <section className="border border-white/[0.08] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Custom domain</h3>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-zinc-400">{currentDomain}</p>
              </div>
              <StatusPill
                tone={
                  currentStatus === "connected"
                    ? "green"
                    : currentStatus === "error"
                      ? "red"
                      : "amber"
                }
              >
                {currentStatus ? STATUS_COPY[currentStatus] : "Pending verification"}
              </StatusPill>
            </div>
            {currentStatus !== "connected" && (
              <>
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Add the below DNS records to your hosting/domain provider. We refresh this
                  status automatically while it is pending.
                </p>
                <DnsRecords records={records} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checking}
                    onClick={() => void refresh(true)}
                    className="border-white/[0.1] bg-transparent"
                  >
                    {checking ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-3.5" />
                    )}
                    Check verification
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManageOpen(true)}
                    className="border-white/[0.1] bg-transparent"
                  >
                    <Settings2 className="mr-2 size-3.5" />
                    Manage domain
                  </Button>
                </div>
              </>
            )}
            {connected && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManageOpen(true)}
                  className="border-white/[0.1] bg-transparent"
                >
                  <Settings2 className="mr-2 size-3.5" />
                  Manage domain
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText(domainUrl(currentDomain))}
                  className="border-white/[0.1] bg-transparent"
                >
                  <Copy className="mr-2 size-3.5" />
                  Copy link
                </Button>
              </div>
            )}
            {error && (
              <p className="mt-4 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section className="border border-white/[0.08] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Custom domain</h3>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Publish this website on your own domain.
                </p>
              </div>
              <span className="border border-emerald-400/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Pro
              </span>
            </div>
            <p className="mt-4 font-mono text-xs text-zinc-600">yourbusiness.com</p>
            <Button
              onClick={() => setConnectOpen(true)}
              disabled={!deploymentUrl}
              className="mt-4 h-10 bg-emerald-500 text-[#04120c] hover:bg-emerald-400"
            >
              <Globe2 className="mr-2 size-4" />
              Connect domain
            </Button>
            {!deploymentUrl && (
              <p className="mt-2 text-xs text-zinc-600">
                Publish your website before connecting a domain.
              </p>
            )}
          </section>
        )}
      </div>

      {connectOpen && (
        <Sheet
          onClose={() => {
            setConnectOpen(false);
            setError(null);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Custom domain
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">Connect domain</h3>
            </div>
            <button onClick={() => setConnectOpen(false)} className="text-zinc-500">
              <X className="size-5" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Enter a domain you own. Kodarai will show the exact DNS records Vercel requires.
          </p>
          <label className="mt-5 block text-xs font-medium text-zinc-300">
            Domain
            <input
              autoFocus
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="example.com or www.example.com"
              className="mt-2 h-11 w-full border border-white/[0.1] bg-black/20 px-3 font-mono text-sm text-white outline-none placeholder:text-zinc-700 focus:border-emerald-400/60"
            />
          </label>
          {error && (
            <p className="mt-3 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConnectOpen(false)}
              className="h-10 flex-1 border-white/[0.1] bg-transparent"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || !domainInput.trim()}
              onClick={() => void connect()}
              className="h-10 flex-1 bg-emerald-500 text-[#04120c] hover:bg-emerald-400"
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}Connect
            </Button>
          </div>
        </Sheet>
      )}

      {manageOpen && currentDomain && (
        <Sheet onClose={() => setManageOpen(false)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                Custom domain
              </p>
              <h3 className="mt-1 break-all text-lg font-semibold text-white">{currentDomain}</h3>
            </div>
            <button onClick={() => setManageOpen(false)} className="text-zinc-500">
              <X className="size-5" />
            </button>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            {connected
              ? "This domain is connected to the current production deployment."
              : "Finish verification before this domain becomes the primary site URL."}
          </p>
          {!connected && <DnsRecords records={records} />}
          {error && (
            <p className="mt-4 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => void refresh(true)}
              className="h-10 flex-1 border-white/[0.1] bg-transparent"
            >
              {checking && <Loader2 className="mr-2 size-4 animate-spin" />}Check verification
            </Button>
            <Button
              variant="outline"
              disabled={removing}
              onClick={() => void remove()}
              className="h-10 flex-1 border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              {removing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Remove domain
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function LockedDomainCard({
  currentDomain,
  connected,
}: {
  currentDomain: string | null;
  connected: boolean;
}) {
  return (
    <section className="border border-white/[0.08] bg-white/[0.015] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-white">Custom domain</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {connected
              ? `${currentDomain} is still live. Upgrade to manage this domain.`
              : "Publish this website on your own domain."}
          </p>
        </div>
        <span className="border border-emerald-400/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          Pro
        </span>
      </div>
      <p className="mt-4 font-mono text-xs text-zinc-600">{currentDomain ?? "yourbusiness.com"}</p>
      <Button
        onClick={() => window.location.assign("/choose-plan")}
        className="mt-4 h-10 bg-emerald-500 text-[#04120c] hover:bg-emerald-400"
      >
        <LockKeyhole className="mr-2 size-4" />
        Upgrade to Pro
      </Button>
    </section>
  );
}

function DnsRecords({ records }: { records: CustomDomainDnsRecord[] }) {
  if (!records.length)
    return (
      <p className="mt-4 border border-white/[0.08] p-3 text-xs leading-5 text-zinc-500">
        Vercel has not returned DNS records yet. Use “Check verification” to refresh the current
        configuration.
      </p>
    );
  return (
    <div className="mt-4 border border-white/[0.08]">
      <div className="hidden grid-cols-[70px_minmax(0,1fr)_minmax(0,1.3fr)] gap-3 border-b border-white/[0.08] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 sm:grid">
        <span>Type</span>
        <span>Name</span>
        <span>Value</span>
      </div>
      {records.map((record) => (
        <div
          key={`${record.type}-${record.name}-${record.value}`}
          className="grid gap-1 border-b border-white/[0.06] p-3 last:border-0 sm:grid-cols-[70px_minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-3"
        >
          <span className="font-mono text-xs text-emerald-300">{record.type}</span>
          <span className="break-all font-mono text-xs text-zinc-300">
            <b className="mr-2 font-sans text-[10px] uppercase tracking-wide text-zinc-600 sm:hidden">
              Name
            </b>
            {record.name}
          </span>
          <span className="break-all font-mono text-xs text-zinc-300">
            <b className="mr-2 font-sans text-[10px] uppercase tracking-wide text-zinc-600 sm:hidden">
              Value
            </b>
            {record.value}
          </span>
          {record.reason && (
            <span className="text-xs text-zinc-500 sm:col-span-3">{record.reason}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "zinc";
  children: ReactNode;
}) {
  const tones = {
    green: "border-emerald-400/25 text-emerald-300",
    amber: "border-amber-400/25 text-amber-300",
    red: "border-red-400/25 text-red-300",
    zinc: "border-white/[0.1] text-zinc-400",
  };
  return (
    <span
      className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-[460px] overflow-y-auto border border-white/[0.1] bg-[#101418] p-5 text-zinc-100 shadow-2xl sm:max-h-[80vh]">
        {children}
      </div>
    </div>,
    document.body,
  );
}
