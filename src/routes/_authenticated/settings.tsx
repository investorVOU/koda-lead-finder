import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Bell,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { deleteAccount, updateProfileName, changePassword } from "@/lib/account.functions";
import {
  getMarketingEmailPreference,
  updateMarketingEmailPreference,
} from "@/lib/marketing.functions";
import {
  getFollowUpPushConfig,
  getFollowUpPushStatus,
  saveFollowUpPushSubscription,
} from "@/lib/follow-up-notifications.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Kodarai" }] }),
  component: SettingsPage,
});

const settingsNavItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Mail },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "danger-zone", label: "Danger zone", icon: Trash2, danger: true },
];

function SettingsNavigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav aria-label="Settings sections" className={mobile ? "flex w-max gap-2" : "space-y-1"}>
      {settingsNavItems.map(({ id, label, icon: Icon, danger }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            danger
              ? "text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          } ${mobile ? "border border-border bg-card" : "w-full"}`}
        >
          <Icon className="size-4" />
          {label}
        </a>
      ))}
    </nav>
  );
}

function Section({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent">
          <Icon className="size-4 text-primary" />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const runUpdateName = useServerFn(updateProfileName);
  const runChangePassword = useServerFn(changePassword);
  const runDeleteAccount = useServerFn(deleteAccount);
  const runGetMarketingPreference = useServerFn(getMarketingEmailPreference);
  const runUpdateMarketingPreference = useServerFn(updateMarketingEmailPreference);
  const runGetFollowUpPushConfig = useServerFn(getFollowUpPushConfig);
  const runGetFollowUpPushStatus = useServerFn(getFollowUpPushStatus);
  const runSaveFollowUpPushSubscription = useServerFn(saveFollowUpPushSubscription);

  // Profile
  const [name, setName] = useState(profile?.full_name ?? user?.user_metadata?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);

  // Password
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Delete account dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [savingMarketingOptIn, setSavingMarketingOptIn] = useState(false);
  const [followUpAlertsEnabled, setFollowUpAlertsEnabled] = useState(false);
  const [enablingFollowUpAlerts, setEnablingFollowUpAlerts] = useState(false);

  useEffect(() => {
    if (!user) return;
    runGetMarketingPreference().then((result) => {
      if (!("error" in result)) setMarketingOptIn(result.marketingOptIn);
    });
    runGetFollowUpPushStatus().then((result) => {
      if (!("error" in result)) setFollowUpAlertsEnabled(result.enabled);
    });
  }, [user?.id]);

  const toggleMarketingOptIn = async () => {
    if (savingMarketingOptIn) return;
    const nextValue = !marketingOptIn;
    setSavingMarketingOptIn(true);
    const result = await runUpdateMarketingPreference({ data: { marketingOptIn: nextValue } });
    setSavingMarketingOptIn(false);
    if ("error" in result) {
      toast.error("Could not update email preferences.");
      return;
    }
    setMarketingOptIn(nextValue);
    toast.success(nextValue ? "Weekly lead emails enabled." : "Marketing emails disabled.");
  };

  const enableFollowUpAlerts = async () => {
    if (!window.isSecureContext) {
      toast.error("Browser notifications require the secure https:// version of this site.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      toast.error("Open KodarAI in a regular Chrome browser tab to enable notifications.");
      return;
    }

    setEnablingFollowUpAlerts(true);
    try {
      const config = await runGetFollowUpPushConfig();
      if ("error" in config) throw new Error(config.error);
      await navigator.serviceWorker.register("/support-push-sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager)
        throw new Error("This browser is blocking push notifications.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));
      const payload = subscription.toJSON();
      const result = await runSaveFollowUpPushSubscription({
        data: {
          endpoint: subscription.endpoint,
          p256dh: payload.keys?.p256dh ?? "",
          auth: payload.keys?.auth ?? "",
        },
      });
      if ("error" in result) throw new Error(result.error);
      setFollowUpAlertsEnabled(true);
      toast.success("Follow-up reminders enabled on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable follow-up reminders.");
    } finally {
      setEnablingFollowUpAlerts(false);
    }
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    const res = await runUpdateName({ data: { full_name: name.trim() } });
    setSavingName(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    await refreshProfile();
    toast.success("Name updated!");
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPass(true);
    const res = await runChangePassword({ data: { password: newPass } });
    setSavingPass(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setNewPass("");
    setConfirmPass("");
    toast.success("Password changed successfully!");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const res = await runDeleteAccount({ data: undefined });
    if ("error" in res) {
      setDeleting(false);
      toast.error(res.message);
      return;
    }
    await signOut();
    navigate({ to: "/" });
    toast.success("Account deleted.");
  };

  const email = user?.email ?? "";

  return (
    <DashboardShell>
      <div className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, notifications, and account.
        </p>
      </div>

      <div className="mx-auto mb-5 max-w-6xl overflow-x-auto pb-1 lg:hidden">
        <SettingsNavigation mobile />
      </div>

      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-3">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
            <SettingsNavigation />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {/* ── Profile ── */}
          <Section id="profile" icon={User} title="Profile" description="How you appear in the app">
            <div className="flex items-center gap-5 mb-5">
              <AvatarUpload
                avatarUrl={profile?.avatar_url ?? null}
                name={name || email}
                onUpload={refreshProfile}
                size={64}
              />
              <div>
                <p className="font-medium">{name || "No name set"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Click avatar to change photo</p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Designer"
                  required
                />
              </div>
              <Button type="submit" variant="hero" size="sm" disabled={savingName || !name.trim()}>
                {savingName ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save name
              </Button>
            </form>
          </Section>

          {/* ── Account ── */}
          <Section id="account" icon={Mail} title="Account" description="Your login credentials">
            <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="mt-0.5 font-medium">{email}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Email changes are not supported yet. Contact us if needed.
              </p>
            </div>
          </Section>

          {/* ── Password ── */}
          <Section
            id="security"
            icon={Lock}
            title="Password"
            description="Change your login password"
          >
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new_pass">New password</Label>
                <div className="relative">
                  <Input
                    id="new_pass"
                    type={showPass ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min 6 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_pass">Confirm new password</Label>
                <Input
                  id="confirm_pass"
                  type={showPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
              {newPass && confirmPass && newPass !== confirmPass && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
              <Button
                type="submit"
                variant="hero"
                size="sm"
                disabled={savingPass || newPass.length < 6 || newPass !== confirmPass}
              >
                {savingPass ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                Update password
              </Button>
            </form>
          </Section>

          {/* ── Notifications ── */}
          <Section
            id="notifications"
            icon={Bell}
            title="Email preferences"
            description="Choose optional product and marketing emails"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Weekly lead ideas and offers</p>
                <p className="text-xs text-muted-foreground">
                  Receive an occasional KodarAI lead-finding tip or offer. Transactional account
                  emails are always sent.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketingOptIn}
                aria-label="Toggle weekly lead emails"
                disabled={savingMarketingOptIn}
                onClick={toggleMarketingOptIn}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${marketingOptIn ? "bg-primary" : "bg-input"}`}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${marketingOptIn ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          </Section>

          <Section
            id="follow-up-reminders"
            icon={Bell}
            title="Follow-up reminders"
            description="Get a browser alert when a lead is due tomorrow, today, or overdue."
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Browser reminders</p>
                <p className="text-xs text-muted-foreground">
                  Reminders are sent once a day to this device for leads with a follow-up date.
                </p>
              </div>
              <Button
                type="button"
                variant={followUpAlertsEnabled ? "soft" : "outline"}
                size="sm"
                className="shrink-0"
                disabled={enablingFollowUpAlerts || followUpAlertsEnabled}
                onClick={enableFollowUpAlerts}
              >
                {enablingFollowUpAlerts ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Bell className="size-3.5" />
                )}
                {followUpAlertsEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>
          </Section>

          {/* ── Danger zone ── */}
          <Section
            id="billing"
            icon={CreditCard}
            title="Billing"
            description="Manage your plan, credits, invoices, and payment method."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-sm text-muted-foreground">
                Open Billing to review your subscription, buy credits, or download invoices.
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => navigate({ to: "/billing" })}
              >
                <CreditCard className="size-3.5" /> Manage billing
              </Button>
            </div>
          </Section>

          <Section
            id="danger-zone"
            icon={Trash2}
            title="Danger zone"
            description="Irreversible account actions"
          >
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Delete account</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently deletes your account, all saved leads, and cancels any active
                    subscription. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirm("");
          setDeleteOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete your account?
            </DialogTitle>
            <DialogDescription>
              This will permanently erase your profile, all saved leads, and your subscription.
              There is no recovery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <strong>This deletes:</strong>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                <li>Your profile and all account data</li>
                <li>All saved leads and pipeline history</li>
                <li>Any remaining search credits</li>
                <li>Your active subscription (no refund)</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delete_confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="delete_confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-destructive/40 font-mono focus-visible:ring-destructive"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirm !== "DELETE" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {deleting ? "Deleting…" : "Yes, delete forever"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
