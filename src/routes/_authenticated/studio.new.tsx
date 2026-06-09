import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Globe, Utensils, Scissors, Wrench,
  ShoppingBag, Briefcase, Terminal,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { createStudioProject } from "@/lib/studio.functions";
import { supabase } from "@/integrations/supabase/client";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";

export const Route = createFileRoute("/_authenticated/studio/new")({
  head: () => ({ meta: [{ title: "New Studio Project — Kodarai" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    leadId: (s.leadId as string | undefined) ?? undefined,
  }),
  component: NewStudioProjectPage,
});

const TEMPLATES = [
  { id: "blank",        name: "Blank",          desc: "Start from scratch.",                             icon: Terminal },
  { id: "restaurant",   name: "Restaurant",     desc: "Menu, hours, location, reservation CTA.",         icon: Utensils },
  { id: "salon",        name: "Salon / Spa",    desc: "Services, gallery, booking link.",                icon: Scissors },
  { id: "contractor",   name: "Contractor",     desc: "Services, portfolio, free-quote form.",           icon: Wrench },
  { id: "retail",       name: "Retail Shop",    desc: "Product highlights, hours, Google Maps embed.",   icon: ShoppingBag },
  { id: "professional", name: "Professional",   desc: "About, services, testimonials, contact.",         icon: Briefcase },
  { id: "landing",      name: "Landing Page",   desc: "Hero, benefits, CTA, contact form.",              icon: Globe },
];

function NewStudioProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leadId = "" } = useSearch({ from: "/_authenticated/studio/new" });
  const runCreate = useServerFn(createStudioProject);

  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [leadContext, setLeadContext] = useState<SavedLead | null>(null);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [autoCreate, setAutoCreate] = useState(false);

  useEffect(() => {
    if (prefillLoaded) return;
    const savedPrompt = sessionStorage.getItem("studio_autofill_prompt");
    if (savedPrompt) {
      setPrompt(savedPrompt);
      setAutoCreate(true);
      sessionStorage.removeItem("studio_autofill_prompt");
      const savedBusinessName = sessionStorage.getItem("studio_autofill_businessName");
      if (savedBusinessName) {
        setName((current) =>
          current.trim() ? current : `${savedBusinessName} — Website`
        );
        sessionStorage.removeItem("studio_autofill_businessName");
      }
    }
    setPrefillLoaded(true);
  }, [prefillLoaded]);

  // Load lead if ?leadId= is present
  const { data: leadData } = useQuery({
    queryKey: ["lead-for-studio", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data } = await supabase
        .from("saved_leads")
        .select("*")
        .eq("id", leadId)
        .single();
      return data as SavedLead | null;
    },
    enabled: !!leadId && !!user,
  });

  useEffect(() => {
    if (leadData) {
      setLeadContext(leadData);
      const biz = leadData.business_name;
      const cat = leadData.category ?? "local business";
      const loc = leadData.location ?? leadData.address ?? "";
      setName(`${biz} — Website`);
      setPrompt(
        `Build a professional website for ${biz}, a ${cat} business${loc ? ` located in ${loc}` : ""}.${
          leadData.phone ? ` Their phone number is ${leadData.phone}.` : ""
        } They currently have no website. Make it look credible and professional.`
      );
      // Auto-select best template
      const catLower = cat.toLowerCase();
      if (catLower.includes("restaurant") || catLower.includes("food") || catLower.includes("bakery") || catLower.includes("café")) {
        setTemplate("restaurant");
      } else if (catLower.includes("salon") || catLower.includes("spa") || catLower.includes("beauty") || catLower.includes("barbershop")) {
        setTemplate("salon");
      } else if (catLower.includes("contractor") || catLower.includes("plumb") || catLower.includes("hvac") || catLower.includes("roof")) {
        setTemplate("contractor");
      } else if (catLower.includes("retail") || catLower.includes("shop") || catLower.includes("store")) {
        setTemplate("retail");
      }
      setAutoCreate(true);
    }
  }, [leadData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const projectName = name.trim() || (prompt.slice(0, 60) + (prompt.length > 60 ? "…" : "")) || "Untitled Project";
      const res = await runCreate({
        data: {
          name: projectName,
          description: prompt.slice(0, 500) || undefined,
          template,
          initial_prompt: prompt || undefined,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      if ("error" in res) { toast.error(res.error); return; }
      const projectId = res.project.id;
      if (prompt.trim()) {
        sessionStorage.setItem(`studio_initial_prompt_${projectId}`, prompt.trim());
      }
      if (leadContext) {
        sessionStorage.setItem(`studio_lead_context_${projectId}`, JSON.stringify({
          businessName: leadContext.business_name,
          category: leadContext.category ?? "",
          city: leadContext.location ?? leadContext.address ?? "",
          phone: leadContext.phone ?? undefined,
        }));
      }
      navigate({ to: "/studio/$projectId", params: { projectId } });
    },
    onError: (err) => {
      toast.error("Failed to create project — " + String(err));
    },
  });

  useEffect(() => {
    if (!autoCreate || !prompt.trim() || createMutation.isPending || createMutation.isSuccess) return;
    createMutation.mutate();
  }, [autoCreate, prompt, createMutation.isPending, createMutation.isSuccess, createMutation]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate({ to: "/studio" })}
          className="mb-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Studio
        </button>

        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">New project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the site you're building and the AI writes all the code.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Lead context chip */}
          {leadContext && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <div className="size-2 shrink-0 rounded-full bg-primary" />
              <span className="text-sm font-medium">{leadContext.business_name}</span>
              {leadContext.category && (
                <span className="text-sm text-muted-foreground">· {leadContext.category}</span>
              )}
              {(leadContext.location ?? leadContext.address) && (
                <span className="text-sm text-muted-foreground">· {leadContext.location ?? leadContext.address}</span>
              )}
            </div>
          )}

          {/* Project name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagos Café — Website"
              className="h-10"
            />
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt">Describe the website</Label>
            <div className="rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Build a modern website for a plumbing company in Abuja. Include a services section, emergency contact CTA, and a request-a-quote form..."
                className="min-h-[140px] resize-none border-0 bg-transparent focus-visible:ring-0 p-4 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Be specific — mention sections, colors, tone, and any business details.
            </p>
          </div>

          {/* Templates */}
          <div className="space-y-2">
            <Label>Start from template</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <div className={`mb-2 flex size-7 items-center justify-center rounded-lg ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <p className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground line-clamp-2">
                      {t.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Creating project…</>
            ) : (
              "Start building"
            )}
          </Button>
        </form>
      </div>
    </DashboardShell>
  );
}
