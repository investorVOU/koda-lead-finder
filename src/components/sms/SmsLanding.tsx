import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  Globe2,
  MessageSquareText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { saveFunnelAttribution } from "@/lib/analytics";
import { MarketingVisitorTracker } from "@/components/analytics/MarketingVisitorTracker";

const signupUrl = "/signup?next=numbers";
const loginUrl = "/login?next=numbers";

export function SmsLanding() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    saveFunnelAttribution({
      source: "sms",
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      utm_content: params.get("utm_content") ?? undefined,
      utm_term: params.get("utm_term") ?? undefined,
      created_at: new Date().toISOString(),
    });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071c1a] text-white">
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[43rem] bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.22),transparent_31%),linear-gradient(180deg,#082d29_0%,#071c1a_77%)]" />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
          <a href="/" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="KodarAI SMS home">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 text-[#05211e] shadow-lg shadow-emerald-400/20">
              <MessageSquareText className="size-5" />
            </span>
            <span className="text-lg">KodarAI SMS</span>
          </a>
          <a href={loginUrl} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10">
            Sign in
          </a>
        </header>

        <main>
          <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Virtual numbers, managed in one place
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.06] tracking-[-0.045em] sm:text-6xl">
                Get a virtual number. Receive SMS. Stay in control.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-emerald-50/75 sm:text-lg">
                Choose an available number, pay securely, and manage messages from your KodarAI account. Rates and availability are shown before you buy.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={signupUrl} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-bold text-[#06231f] shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-200">
                  Browse available numbers <ArrowRight className="size-4" />
                </a>
                <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10">
                  How it works
                </a>
              </div>
              <p className="mt-4 text-xs leading-5 text-emerald-50/55">
                Use numbers only for lawful, permitted purposes. Service compatibility and availability can vary.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-400/15 blur-3xl" />
              <div className="rounded-[2rem] border border-white/15 bg-white/[0.09] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#092a27] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/65">Your number</p>
                      <p className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">+1 (202) 555-0148</p>
                    </div>
                    <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-bold text-emerald-200">Active</span>
                  </div>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200"><MessageSquareText className="size-4" /></span>
                      <div>
                        <p className="text-sm font-semibold">SMS inbox</p>
                        <p className="mt-0.5 text-xs text-emerald-50/55">Messages appear in your account</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-[#063a34] px-3.5 py-3 text-sm text-emerald-50/85">New message received</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/45">Country</p>
                      <p className="mt-1 text-sm font-semibold">United States</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-50/45">Status</p>
                      <p className="mt-1 text-sm font-semibold">Managed</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-emerald-50/45">Illustrative account view</p>
            </div>
          </section>

          <section id="how-it-works" className="border-y border-white/10 bg-[#061714] py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Simple purchase flow</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From selection to inbox in three clear steps.</h2>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  ["01", "Create your account", "Use one KodarAI account to buy and manage your numbers."],
                  ["02", "Choose a number", "Browse currently available options and see the price before checkout."],
                  ["03", "Manage your messages", "View your number status and incoming SMS from the Numbers workspace."],
                ].map(([number, title, copy]) => (
                  <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                    <p className="text-sm font-bold text-emerald-300">{number}</p>
                    <h3 className="mt-8 text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/60">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Built for clarity</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">No vague pricing. No hidden next step.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: Globe2, title: "Country options", copy: "Choose from available country inventory." },
                  { Icon: Phone, title: "One workspace", copy: "Keep your purchased numbers organised." },
                  { Icon: ShieldCheck, title: "Clear limits", copy: "Availability and support depend on providers." },
                ].map(({ Icon: FeatureIcon, title, copy }) => {
                  return (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <FeatureIcon className="size-5 text-emerald-300" />
                      <p className="mt-5 font-semibold">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-50/60">{copy}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 bg-[#0a2c28] px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to find an available number?</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-emerald-50/70">Create your account, then browse live availability and prices before making a purchase.</p>
              <a href={signupUrl} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 text-sm font-bold text-[#06231f] transition hover:bg-emerald-200">
                Get started <ArrowRight className="size-4" />
              </a>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-50/55">
                <Check className="size-3.5 text-emerald-300" /> Account creation is free. Purchase only after reviewing a number and its price.
              </div>
            </div>
          </section>
        </main>

        <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-emerald-50/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} KodarAI SMS</span>
          <div className="flex gap-4"><a className="hover:text-white" href="/terms">Terms</a><a className="hover:text-white" href="/privacy">Privacy</a></div>
        </footer>
      </div>
      <MarketingVisitorTracker />
    </div>
  );
}
