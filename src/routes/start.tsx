import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  UserRound,
} from "lucide-react";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      {
        title: "Find your next website client — Kodarai",
      },
      {
        name: "description",
        content:
          "Answer three quick questions and get a simple client acquisition plan with Kodarai.",
      },
      {
        name: "robots",
        content: "noindex,follow",
      },
    ],
  }),
  component: StartPage,
});

type Role =
  | "web_designer"
  | "new_freelancer"
  | "agency"
  | "start_selling";

type Challenge =
  | "finding_businesses"
  | "building_samples"
  | "knowing_what_to_say"
  | "finding_contacts"
  | "all";

type Acquisition =
  | "referrals"
  | "cold_calls"
  | "dms"
  | "email"
  | "none";

type FunnelAnswers = {
  role?: Role;
  challenge?: Challenge;
  acquisition?: Acquisition;
};

export type KodaraiAdFunnel = FunnelAnswers & {
  source: "ads";
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  created_at: string;
};

const STORAGE_KEY = "kodarai_ad_funnel";

const ROLE_OPTIONS = [
  {
    value: "web_designer" as const,
    title: "Web designer / developer",
    description: "I already build websites for clients.",
    icon: Code2,
  },
  {
    value: "new_freelancer" as const,
    title: "New freelancer",
    description: "I have the skill. I need more clients.",
    icon: UserRound,
  },
  {
    value: "agency" as const,
    title: "Agency",
    description: "I want a more consistent lead pipeline.",
    icon: Building2,
  },
  {
    value: "start_selling" as const,
    title: "I want to start selling websites",
    description: "I want a practical way to get started.",
    icon: BriefcaseBusiness,
  },
];

const CHALLENGE_OPTIONS = [
  {
    value: "finding_businesses" as const,
    title: "Finding businesses to contact",
    description: "I need better prospects, not random lists.",
    icon: Search,
  },
  {
    value: "building_samples" as const,
    title: "Building something to show them",
    description: "I want a faster way to make a strong first impression.",
    icon: Code2,
  },
  {
    value: "knowing_what_to_say" as const,
    title: "Knowing what to say",
    description: "I need a better way to start the conversation.",
    icon: MessageCircle,
  },
  {
    value: "finding_contacts" as const,
    title: "Finding contact details",
    description: "I need a faster way to reach decision makers.",
    icon: Phone,
  },
  {
    value: "all" as const,
    title: "Honestly, all of it",
    description: "I want one workflow from prospect to pitch.",
    icon: Check,
  },
];

const ACQUISITION_OPTIONS = [
  {
    value: "referrals" as const,
    title: "Referrals",
    description: "Most work comes from people I already know.",
    icon: UserRound,
  },
  {
    value: "cold_calls" as const,
    title: "Cold calls",
    description: "I call businesses directly.",
    icon: Phone,
  },
  {
    value: "dms" as const,
    title: "DMs / social media",
    description: "I reach out through Instagram, TikTok or other socials.",
    icon: Send,
  },
  {
    value: "email" as const,
    title: "Email outreach",
    description: "I contact prospects through email.",
    icon: Mail,
  },
  {
    value: "none" as const,
    title: "I haven't gotten my first client yet",
    description: "I want a clear first step.",
    icon: BriefcaseBusiness,
  },
];

function StartPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FunnelAnswers>({});
  const [attribution, setAttribution] = useState<
    Partial<KodaraiAdFunnel>
  >({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setAttribution({
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
    });
  }, []);

  const resultCopy = useMemo(() => {
    if (answers.role === "agency") {
      return {
        eyebrow: "Your pipeline plan",
        title:
          "Find better prospects, show the work, then start the conversation.",
        description:
          "KodarAI gives your team a repeatable way to find businesses that need websites and turn them into sales opportunities.",
      };
    }

    if (answers.acquisition === "none") {
      return {
        eyebrow: "Your first-client plan",
        title: "You don't need to wait for someone to discover you.",
        description:
          "KodarAI helps you find a real business, build something worth showing, and gives you a reason to start the conversation.",
      };
    }

    return {
      eyebrow: "Your client plan",
      title: "Turn prospecting into a simple repeatable workflow.",
      description:
        "KodarAI brings the important parts together so you can spend less time figuring out what to do next and more time talking to potential clients.",
    };
  }, [answers]);

  const saveFunnel = (nextAnswers: FunnelAnswers) => {
    const payload: KodaraiAdFunnel = {
      ...nextAnswers,
      source: "ads",
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const chooseRole = (value: Role) => {
    const next = {
      ...answers,
      role: value,
    };

    setAnswers(next);

    window.setTimeout(() => {
      setStep(2);
    }, 120);
  };

  const chooseChallenge = (value: Challenge) => {
    const next = {
      ...answers,
      challenge: value,
    };

    setAnswers(next);

    window.setTimeout(() => {
      setStep(3);
    }, 120);
  };

  const chooseAcquisition = (value: Acquisition) => {
    const next = {
      ...answers,
      acquisition: value,
    };

    setAnswers(next);
    saveFunnel(next);

    window.setTimeout(() => {
      setStep(4);
    }, 120);
  };

  const goToSignup = () => {
    saveFunnel(answers);
    window.location.assign("/signup?source=ads");
  };

  return (
    <div className="min-h-screen bg-[#080b09] text-white selection:bg-emerald-400/30">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Kodar<span className="text-emerald-400">AI</span>
        </Link>

        {step >= 1 && step <= 3 ? (
          <span className="text-xs font-medium text-white/45">
            {step} of 3
          </span>
        ) : (
          <span className="text-xs text-white/35">
            For freelancers & agencies
          </span>
        )}
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-3xl flex-col px-5 pb-10 sm:px-8">
        {step >= 1 && step <= 3 && (
          <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
              style={{
                width: `${(step / 3) * 100}%`,
              }}
            />
          </div>
        )}

        {step === 0 && (
          <section className="flex flex-1 flex-col justify-center py-10 sm:py-16">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                A 30-second client plan
              </div>

              <h1 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl">
                Want more website clients?
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                Tell us where you're at. We'll show you how KodarAI can
                help you find businesses, build something worth showing,
                and start more client conversations.
              </p>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#07110b] transition hover:bg-emerald-300 sm:w-auto"
              >
                Show me how
                <ArrowRight className="size-4" />
              </button>

              <p className="mt-4 text-xs text-white/35">
                No forms. Three quick questions.
              </p>
            </div>
          </section>
        )}

        {step === 1 && (
          <QuestionScreen
            title="What best describes you?"
            subtitle="We'll tailor the next step around how you work."
            onBack={() => setStep(0)}
          >
            {ROLE_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={answers.role === option.value}
                onClick={() => chooseRole(option.value)}
              />
            ))}
          </QuestionScreen>
        )}

        {step === 2 && (
          <QuestionScreen
            title="What's stopping you from getting more clients?"
            subtitle="Pick the one that feels most true right now."
            onBack={() => setStep(1)}
          >
            {CHALLENGE_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={answers.challenge === option.value}
                onClick={() => chooseChallenge(option.value)}
              />
            ))}
          </QuestionScreen>
        )}

        {step === 3 && (
          <QuestionScreen
            title="How are you getting clients today?"
            subtitle="There isn't a wrong answer."
            onBack={() => setStep(2)}
          >
            {ACQUISITION_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={answers.acquisition === option.value}
                onClick={() => chooseAcquisition(option.value)}
              />
            ))}
          </QuestionScreen>
        )}

        {step === 4 && (
          <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-emerald-400">
                {resultCopy.eyebrow}
              </p>

              <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
                {resultCopy.title}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-white/60">
                {resultCopy.description}
              </p>

              <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <PlanRow
                  number="01"
                  title="Find"
                  description="Search for real businesses that need a better web presence."
                />

                <PlanRow
                  number="02"
                  title="Build"
                  description="Create a website sample you can actually show the business."
                />

                <PlanRow
                  number="03"
                  title="Reach"
                  description="Use contact details and outreach tools to start the conversation."
                />

                <PlanRow
                  number="04"
                  title="Close"
                  description="Pitch the work with something tangible already in front of them."
                />
              </div>

              <button
                type="button"
                onClick={goToSignup}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#07110b] transition hover:bg-emerald-300 sm:w-auto"
              >
                Start finding clients
                <ArrowRight className="size-4" />
              </button>

              <p className="mt-3 text-xs text-white/35">
                Create your KodarAI account and start with Finder.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function QuestionScreen({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="pb-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-white/45 transition hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
        {title}
      </h1>

      <p className="mt-2 text-sm text-white/45 sm:text-base">
        {subtitle}
      </p>

      <div className="mt-7 space-y-3">
        {children}
      </div>
    </section>
  );
}

function ChoiceButton({
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof Search;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition sm:px-5 ${
        selected
          ? "border-emerald-400/60 bg-emerald-400/[0.07]"
          : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/70">
        <Icon className="size-[18px]" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white sm:text-[15px]">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-white/45 sm:text-sm">
          {description}
        </span>
      </span>

      <ArrowRight className="size-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
    </button>
  );
}

function PlanRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] gap-3 px-4 py-4 sm:grid-cols-[44px_90px_1fr] sm:items-center sm:px-5">
      <span className="text-xs font-semibold tabular-nums text-emerald-400/75">
        {number}
      </span>

      <span className="text-sm font-semibold text-white">
        {title}
      </span>

      <span className="col-start-2 text-xs leading-5 text-white/45 sm:col-start-3 sm:text-sm">
        {description}
      </span>
    </div>
  );
}
