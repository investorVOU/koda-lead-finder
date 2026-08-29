import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Check,
  Clock,
  FileSearch,
  Lightbulb,
  Loader2,
  PenLine,
  Plus,
  Radio,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createStudioAutomation,
  deleteStudioAutomation,
  listStudioAutomations,
  toggleStudioAutomation,
  type AutomationFrequency,
  type AutomationType,
  type StudioAutomation,
} from "@/lib/automations.functions";

export const Route = createFileRoute(
  "/_authenticated/studio/automations",
)({
  head: () => ({
    meta: [{ title: "Automations — Kodarai" }],
  }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const listAutomations = useServerFn(listStudioAutomations);
  const createAutomation = useServerFn(createStudioAutomation);
  const deleteAutomation = useServerFn(deleteStudioAutomation);
  const toggleAutomation = useServerFn(toggleStudioAutomation);

  const [automations, setAutomations] = useState<
    StudioAutomation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] =
    useState<AutomationType>("channel_monitor");
  const [description, setDescription] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [frequency, setFrequency] =
    useState<AutomationFrequency>("weekly");

  const [saving, setSaving] = useState(false);

  async function loadAutomations() {
    setLoading(true);

    try {
      const result = await listAutomations();

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setAutomations(result.automations);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load automations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAutomations();
  }, []);

  async function handleCreate(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Give your automation a name.");
      return;
    }

    if (
      type === "channel_monitor" &&
      !channelUrl.trim()
    ) {
      toast.error("Enter a YouTube channel URL.");
      return;
    }

    if (
      (type === "video_ideas" || type === "research") &&
      !topic.trim() &&
      !channelUrl.trim()
    ) {
      toast.error("Enter a topic or YouTube channel.");
      return;
    }

    setSaving(true);

    try {
      const result = await createAutomation({
        data: {
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          channel_url: channelUrl.trim() || undefined,
          topic: topic.trim() || undefined,
          frequency,
          enabled: true,
        },
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setAutomations((current) => [
        result.automation,
        ...current,
      ]);

      resetForm();
      toast.success("Automation created.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create automation.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setType("channel_monitor");
    setDescription("");
    setChannelUrl("");
    setTopic("");
    setFrequency("weekly");
    setShowCreate(false);
  }

  async function handleToggle(
    automation: StudioAutomation,
  ) {
    try {
      const result = await toggleAutomation({
        data: {
          id: automation.id,
          enabled: !automation.enabled,
        },
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setAutomations((current) =>
        current.map((item) =>
          item.id === automation.id
            ? result.automation
            : item,
        ),
      );

      toast.success(
        result.automation.enabled
          ? "Automation enabled."
          : "Automation paused.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update automation.",
      );
    }
  }

  async function handleDelete(
    automation: StudioAutomation,
  ) {
    const confirmed = window.confirm(
      `Delete "${automation.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      const result = await deleteAutomation({
        data: {
          id: automation.id,
        },
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setAutomations((current) =>
        current.filter(
          (item) => item.id !== automation.id,
        ),
      );

      toast.success("Automation deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete automation.",
      );
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-5"
        >
          <Link to="/studio">
            <ArrowLeft className="size-4" />
            Studio
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="size-5 text-primary" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Automations
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Put your creator workflows on autopilot with
                recurring research, channel monitoring and AI
                content workflows.
              </p>
            </div>
          </div>

          <Button
            variant="hero"
            onClick={() => setShowCreate((value) => !value)}
          >
            <Plus className="size-4" />
            New automation
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />

              <h2 className="text-sm font-semibold">
                Create automation
              </h2>
            </div>

            <div className="mt-5 grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="automation-name">
                  Name
                </Label>

                <Input
                  id="automation-name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Weekly channel review"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Workflow</Label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <TypeButton
                    active={type === "channel_monitor"}
                    icon={Radio}
                    title="Channel monitor"
                    description="Watch a YouTube channel for new videos."
                    onClick={() =>
                      setType("channel_monitor")
                    }
                  />

                  <TypeButton
                    active={type === "video_ideas"}
                    icon={Lightbulb}
                    title="Video ideas"
                    description="Generate new ideas from your niche."
                    onClick={() =>
                      setType("video_ideas")
                    }
                  />

                  <TypeButton
                    active={type === "research"}
                    icon={FileSearch}
                    title="Research"
                    description="Run recurring content research."
                    onClick={() =>
                      setType("research")
                    }
                  />

                  <TypeButton
                    active={type === "content"}
                    icon={PenLine}
                    title="Content"
                    description="Turn ideas and research into content."
                    onClick={() =>
                      setType("content")
                    }
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="automation-channel">
                    YouTube channel
                    <span className="ml-1 font-normal text-muted-foreground">
                      optional
                    </span>
                  </Label>

                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="automation-channel"
                      value={channelUrl}
                      onChange={(e) =>
                        setChannelUrl(e.target.value)
                      }
                      placeholder="@creator"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="automation-topic">
                    Topic / niche
                  </Label>

                  <Input
                    id="automation-topic"
                    value={topic}
                    onChange={(e) =>
                      setTopic(e.target.value)
                    }
                    placeholder="AI tools for businesses"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation-description">
                  Instructions
                  <span className="ml-1 font-normal text-muted-foreground">
                    optional
                  </span>
                </Label>

                <textarea
                  id="automation-description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="What should Kodarai look for?"
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>

                <div className="grid grid-cols-3 gap-2">
                  <FrequencyButton
                    active={frequency === "daily"}
                    onClick={() =>
                      setFrequency("daily")
                    }
                  >
                    Daily
                  </FrequencyButton>

                  <FrequencyButton
                    active={frequency === "weekly"}
                    onClick={() =>
                      setFrequency("weekly")
                    }
                  >
                    Weekly
                  </FrequencyButton>

                  <FrequencyButton
                    active={frequency === "monthly"}
                    onClick={() =>
                      setFrequency("monthly")
                    }
                  >
                    Monthly
                  </FrequencyButton>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="hero"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Create automation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />

            <p className="mt-3 text-sm text-muted-foreground">
              Loading automations…
            </p>
          </div>
        ) : automations.length === 0 ? (
          <EmptyState
            onCreate={() => setShowCreate(true)}
          />
        ) : (
          <div className="mt-8 space-y-3">
            {automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onToggle={() =>
                  void handleToggle(automation)
                }
                onDelete={() =>
                  void handleDelete(automation)
                }
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function TypeButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof Radio;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div>
        <p className="text-xs font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

function FrequencyButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function AutomationCard({
  automation,
  onToggle,
  onDelete,
}: {
  automation: StudioAutomation;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const Icon =
    automation.type === "channel_monitor"
      ? Radio
      : automation.type === "video_ideas"
        ? Lightbulb
        : automation.type === "research"
          ? FileSearch
          : PenLine;

  const typeLabel =
    automation.type === "channel_monitor"
      ? "Channel monitor"
      : automation.type === "video_ideas"
        ? "Video ideas"
        : automation.type === "research"
          ? "Research"
          : "Content";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-4.5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">
              {automation.name}
            </h2>

            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {typeLabel}
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                automation.enabled
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {automation.enabled
                ? "Active"
                : "Paused"}
            </span>
          </div>

          {automation.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {automation.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {capitalize(automation.frequency)}
            </span>

            {automation.next_run_at && (
              <span>
                Next:{" "}
                {formatDate(
                  automation.next_run_at,
                )}
              </span>
            )}

            {automation.last_run_at && (
              <span>
                Last run:{" "}
                {formatDate(
                  automation.last_run_at,
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              automation.enabled
                ? "Pause automation"
                : "Enable automation"
            }
            className={`relative h-6 w-10 rounded-full transition ${
              automation.enabled
                ? "bg-primary"
                : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-1 size-4 rounded-full bg-background shadow-sm transition ${
                automation.enabled
                  ? "left-5"
                  : "left-1"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="ml-1 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete automation"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <CalendarClock className="size-6 text-primary" />
      </div>

      <h2 className="mt-4 text-base font-semibold">
        Put your Studio on autopilot
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Create recurring workflows that monitor channels,
        discover ideas and run research without having to start
        every workflow manually.
      </p>

      <Button
        className="mt-5"
        variant="hero"
        onClick={onCreate}
      >
        <Plus className="size-4" />
        Create your first automation
      </Button>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
