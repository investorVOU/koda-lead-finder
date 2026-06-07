import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Mail, MessageSquare, User, Send, CheckCircle2 } from "lucide-react";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Kodarai" },
      { name: "description", content: "Get in touch with the Kodarai team. We're here to help." },
    ],
  }),
  component: ContactPage,
});

const TOPICS = [
  "General inquiry",
  "Billing & subscription",
  "Technical support",
  "Feature request",
  "Partnership",
  "Other",
];

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const body = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Topic: ${topic}`,
        `\nMessage:\n${message}`,
      ].join("\n");

      const res = await fetch("https://formsubmit.co/ajax/hello@kodarai.xyz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject: `[Kodarai Contact] ${topic}`,
          message: body,
          _captcha: "false",
          _template: "table",
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSent(true);
    } catch {
      setError("Something went wrong. Please try emailing us directly at hello@kodarai.xyz");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Get in touch</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            We'd love to hear from you
          </h1>
          <p className="mt-4 text-muted-foreground">
            Have a question, feedback, or just want to say hi? Fill in the form below and we'll get
            back to you within one business day.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          {/* Left: contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold">Contact info</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach us directly or use the form.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <Mail className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a
                    href="mailto:hello@kodarai.xyz"
                    className="mt-0.5 block text-sm text-muted-foreground hover:text-primary"
                  >
                    hello@kodarai.xyz
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <MessageSquare className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-medium">Response time</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Within 1 business day
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">Looking for help fast?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check our FAQ on the homepage for answers to the most common questions about pricing,
                credits, and how the lead finder works.
              </p>
              <a
                href="/#faq"
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                Browse the FAQ →
              </a>
            </div>
          </div>

          {/* Right: form */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-md)]">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="size-8 text-primary" />
                </span>
                <h3 className="text-xl font-semibold">Message sent!</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Thanks for reaching out. We'll get back to you at{" "}
                  <strong className="text-foreground">{email}</strong> within one business day.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setSent(false);
                    setName("");
                    setEmail("");
                    setTopic(TOPICS[0]);
                    setMessage("");
                  }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">
                      <User className="inline size-3.5 mr-1 -mt-0.5" />
                      Full name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      <Mail className="inline size-3.5 mr-1 -mt-0.5" />
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="topic">Topic</Label>
                  <select
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">
                    <MessageSquare className="inline size-3.5 mr-1 -mt-0.5" />
                    Message
                  </Label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    required
                    rows={6}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" /> Send message
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By submitting this form you agree to our{" "}
                  <a href="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
