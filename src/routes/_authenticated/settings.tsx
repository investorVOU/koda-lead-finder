import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
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

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Kodarai" }] }),
  component: SettingsPage,
});

function Section({ title, description, icon: Icon, children }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
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
    </div>
  );
}

function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const runUpdateName = useServerFn(updateProfileName);
  const runChangePassword = useServerFn(changePassword);
  const runDeleteAccount = useServerFn(deleteAccount);

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

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    const res = await runUpdateName({ data: { full_name: name.trim() } });
    setSavingName(false);
    if ("error" in res) { toast.error(res.message); return; }
    await refreshProfile();
    toast.success("Name updated!");
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPass !== confirmPass) { toast.error("Passwords don't match"); return; }
    setSavingPass(true);
    const res = await runChangePassword({ data: { password: newPass } });
    setSavingPass(false);
    if ("error" in res) { toast.error(res.message); return; }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, password, and account.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">

        {/* ── Profile ── */}
        <Section icon={User} title="Profile" description="How you appear in the app">
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
              {savingName ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save name
            </Button>
          </form>
        </Section>

        {/* ── Account ── */}
        <Section icon={Mail} title="Account" description="Your login credentials">
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Email address</p>
            <p className="mt-0.5 font-medium">{email}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Email changes are not supported yet. Contact us if needed.</p>
          </div>
        </Section>

        {/* ── Password ── */}
        <Section icon={Lock} title="Password" description="Change your login password">
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
              {savingPass ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              Update password
            </Button>
          </form>
        </Section>

        {/* ── Notifications ── */}
        <Section icon={Bell} title="Notifications" description="Control what Kodarai sends you">
          <div className="space-y-3">
            {[
              { label: "Follow-up reminders", sub: "Get reminded when a lead follow-up is due", defaultOn: true },
              { label: "New feature announcements", sub: "Hear about new Kodarai features and improvements", defaultOn: true },
              { label: "Weekly summary", sub: "A digest of your pipeline activity every Monday", defaultOn: false },
            ].map(({ label, sub, defaultOn }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={defaultOn}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${defaultOn ? "bg-primary" : "bg-input"}`}
                >
                  <span className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${defaultOn ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <Section icon={Trash2} title="Danger zone" description="Irreversible account actions">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Delete account</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permanently deletes your account, all saved leads, and cancels any active subscription. This cannot be undone.
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteConfirm(""); setDeleteOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete your account?
            </DialogTitle>
            <DialogDescription>
              This will permanently erase your profile, all saved leads, and your subscription. There is no recovery.
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
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirm !== "DELETE" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {deleting ? "Deleting…" : "Yes, delete forever"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
