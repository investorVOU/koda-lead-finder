import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/numbers-extra.functions";
import type { SmsTemplate } from "@/lib/numbers";

interface Props {
  /** If provided, show "Use" buttons that populate outbound compose */
  onUse?: (body: string) => void;
}

export function SMSTemplates({ onUse }: Props) {
  const runGet    = useServerFn(getTemplates);
  const runCreate = useServerFn(createTemplate);
  const runDelete = useServerFn(deleteTemplate);

  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [name,      setName]      = useState("");
  const [body,      setBody]      = useState("");
  const [deleting,  setDeleting]  = useState<string | null>(null);

  useEffect(() => {
    runGet().then((res) => {
      if ("templates" in res) setTemplates(res.templates as SmsTemplate[]);
      setLoading(false);
    });
  }, []);

  const create = async () => {
    if (!name.trim() || !body.trim()) { toast.error("Name and message are required"); return; }
    setCreating(true);
    const res = await runCreate({ data: { name: name.trim(), body: body.trim() } });
    setCreating(false);
    if ("error" in res) { toast.error("Something went wrong. Please try again."); return; }
    toast.success("Template saved");
    setTemplates((t) => [res.template as SmsTemplate, ...t]);
    setName(""); setBody(""); setShowForm(false);
  };

  const del = async (id: string) => {
    setDeleting(id);
    await runDelete({ data: { templateId: id } });
    setDeleting(null);
    setTemplates((t) => t.filter((x) => x.id !== id));
    toast.success("Template deleted");
  };

  if (loading) return <div className="py-6 text-center text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> New template
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <input
            type="text"
            placeholder="Template name (e.g. Appointment reminder)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            placeholder="Message body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1600}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="hero" onClick={create} disabled={creating}>
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setName(""); setBody(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="text-xs text-muted-foreground">Create reusable message templates for quick sending.</p>
        </div>
      )}

      {templates.map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{t.name}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.body}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onUse && (
                <button
                  onClick={() => onUse(t.body)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <Send className="size-3" /> Use
                </button>
              )}
              <button
                onClick={() => del(t.id)}
                disabled={deleting === t.id}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
              >
                {deleting === t.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
