import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  ImageIcon,
  Laptop,
  Lightbulb,
  MessageCircle,
  Search,
  User,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getStartHeroImage,
  type StartHeroImage,
} from "@/lib/start-images.functions";

import {
  saveFunnelAttribution,
  trackFunnelCompleted,
  trackFunnelExperienceSelected,
  trackFunnelGoalSelected,
  trackFunnelSituationSelected,
  trackFunnelStarted,
  trackFunnelViewed,
  trackSignupStarted,
} from "@/lib/analytics";

export const Route =
  createFileRoute(
    "/start",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Make Money Helping Businesses Get Online — Kodarai",
        },

        {
          name: "description",

          content:
            "Find businesses that need websites, create something to show them, sell it and get paid with Kodarai.",
        },

        {
          name: "robots",
          content:
            "noindex,follow",
        },
      ],
    }),

    component: StartPage,
  });

type Experience =
  | "builder"
  | "learning"
  | "beginner"
  | "agency";

type Goal =
  | "100000"
  | "250000"
  | "500000"
  | "1000000";

type Situation =
  | "no_idea"
  | "finding_people"
  | "no_sales"
  | "need_more";

type FunnelAnswers = {
  experience?: Experience;
  goal?: Goal;
  situation?: Situation;
};

type FunnelData =
  FunnelAnswers & {
    source: "ads";

    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;

    created_at: string;
  };

const EXPERIENCE_OPTIONS = [
  {
    value:
      "beginner" as const,

    title:
      "I don't know how to build websites",

    description:
      "I just want a simple way to start making money online.",

    icon:
      GraduationCap,
  },

  {
    value:
      "learning" as const,

    title:
      "I'm still learning",

    description:
      "I know a little, but I haven't really made money from it.",

    icon:
      User,
  },

  {
    value:
      "builder" as const,

    title:
      "I already build websites",

    description:
      "I know how to build. I need businesses to sell to.",

    icon:
      Laptop,
  },

  {
    value:
      "agency" as const,

    title:
      "I run a web design business",

    description:
      "I want more customers.",

    icon:
      Users,
  },
];

const GOAL_OPTIONS = [
  {
    value:
      "100000" as const,

    title:
      "₦100,000",
  },

  {
    value:
      "250000" as const,

    title:
      "₦250,000",
  },

  {
    value:
      "500000" as const,

    title:
      "₦500,000",
  },

  {
    value:
      "1000000" as const,

    title:
      "₦1,000,000+",
  },
];

const SITUATION_OPTIONS = [
  {
    value:
      "no_idea" as const,

    title:
      "I don't know where to start",

    description:
      "I need someone to show me the steps.",

    icon:
      Search,
  },

  {
    value:
      "finding_people" as const,

    title:
      "I don't know who to sell to",

    description:
      "Finding businesses that might pay me is the problem.",

    icon:
      Users,
  },

  {
    value:
      "no_sales" as const,

    title:
      "People don't reply to me",

    description:
      "I need a better way to show them what I can do.",

    icon:
      MessageCircle,
  },

  {
    value:
      "need_more" as const,

    title:
      "I just need more customers",

    description:
      "I already understand the business. I need more opportunities.",

    icon:
      BarChart3,
  },
];

function StartPage() {
  const runGetHeroImage =
    useServerFn(
      getStartHeroImage,
    );

  const [step, setStep] =
    useState(0);

  const [
    answers,
    setAnswers,
  ] =
    useState<FunnelAnswers>(
      {},
    );

  const [
    attribution,
    setAttribution,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    showWhy,
    setShowWhy,
  ] =
    useState(false);

  const [
    heroImage,
    setHeroImage,
  ] =
    useState<StartHeroImage | null>(
      null,
    );

  const [
    heroLoading,
    setHeroLoading,
  ] =
    useState(true);

  useEffect(() => {
    trackFunnelViewed();

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const values: Record<
      string,
      string
    > = {};

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ].forEach((key) => {
      const value =
        params.get(key);

      if (value) {
        values[key] =
          value;
      }
    });

    setAttribution(
      values,
    );
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function loadHero() {
      try {
        const result =
          await runGetHeroImage();

        if (
          !cancelled &&
          result.image
        ) {
          setHeroImage(
            result.image,
          );
        }
      } catch (error) {
        console.error(
          "[KodarAI start] Could not load hero image:",
          error,
        );
      } finally {
        if (!cancelled) {
          setHeroLoading(
            false,
          );
        }
      }
    }

    loadHero();

    return () => {
      cancelled = true;
    };
  }, [runGetHeroImage]);

  const saveAnswers = (
    nextAnswers:
      FunnelAnswers,
  ) => {
    const payload:
      FunnelData = {
      ...nextAnswers,

      source: "ads",

      ...attribution,

      created_at:
        new Date().toISOString(),
    };

    saveFunnelAttribution(payload);
  };

  const chooseExperience = (
    value: Experience,
  ) => {
    const next = {
      ...answers,

      experience:
        value,
    };

    setAnswers(next);

    saveAnswers(next);

    trackFunnelExperienceSelected(value);

    window.setTimeout(
      () => {
        setStep(2);
      },

      140,
    );
  };

  const chooseGoal = (
    value: Goal,
  ) => {
    const next = {
      ...answers,

      goal: value,
    };

    setAnswers(next);

    saveAnswers(next);

    trackFunnelGoalSelected(value);

    window.setTimeout(
      () => {
        setStep(3);
      },

      140,
    );
  };

  const chooseSituation = (
    value: Situation,
  ) => {
    const next = {
      ...answers,

      situation:
        value,
    };

    setAnswers(next);

    saveAnswers(next);

    trackFunnelSituationSelected(value);

    trackFunnelCompleted({
      ...next,
      source: "ads",
      ...attribution,
    });

    window.setTimeout(
      () => {
        setStep(4);
      },

      140,
    );
  };

  const startSignup = () => {
    saveAnswers(
      answers,
    );

    trackSignupStarted({
      ...answers,
      source: "ads",
      ...attribution,
    });

    window.location.assign(
      "/signup?source=ads",
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f7f1] text-[#10140f]">
      <div className="mx-auto w-full max-w-[520px]">
        {step === 0 && (
          <Intro
            heroImage={
              heroImage
            }
            heroLoading={
              heroLoading
            }
            onStart={() => {
              trackFunnelStarted();
              setStep(1);
            }}
            showWhy={
              showWhy
            }
            setShowWhy={
              setShowWhy
            }
          />
        )}

        {step === 1 && (
          <QuestionShell
            step={1}
            title="Which one sounds like you?"
            subtitle="Pick the closest answer. You don't need any experience to start."
            onBack={() =>
              setStep(0)
            }
          >
            <div className="space-y-3">
              {EXPERIENCE_OPTIONS.map(
                (option) => (
                  <ChoiceCard
                    key={
                      option.value
                    }
                    title={
                      option.title
                    }
                    description={
                      option.description
                    }
                    icon={
                      option.icon
                    }
                    selected={
                      answers.experience ===
                      option.value
                    }
                    onClick={() =>
                      chooseExperience(
                        option.value,
                      )
                    }
                  />
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowWhy(
                  (current) =>
                    !current,
                )
              }
              className="mx-auto mt-8 flex items-center gap-1 text-sm font-medium text-[#26352d] underline decoration-black/25 underline-offset-4"
            >
              Why websites?

              <ChevronDown
                className={`size-4 transition ${
                  showWhy
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {showWhy && (
              <div className="mt-4 rounded-2xl border border-[#dfe6dd] bg-white p-4 text-sm leading-6 text-[#5b655f] shadow-sm">
                Many
                businesses
                still need a
                better
                website. You
                can find one,
                create
                something
                useful for
                them, show
                the owner and
                agree on a
                price if they
                want it.
              </div>
            )}
          </QuestionShell>
        )}

        {step === 2 && (
          <QuestionShell
            step={2}
            title="How much would you like to make each month?"
            subtitle="Not a promise — just the income you're working towards."
            onBack={() =>
              setStep(1)
            }
          >
            <div className="space-y-3">
              {GOAL_OPTIONS.map(
                (option) => (
                  <MoneyCard
                    key={
                      option.value
                    }
                    amount={
                      option.title
                    }
                    selected={
                      answers.goal ===
                      option.value
                    }
                    onClick={() =>
                      chooseGoal(
                        option.value,
                      )
                    }
                  />
                ),
              )}
            </div>

            <div className="mt-6 flex gap-3 rounded-2xl bg-[#e6f5e8] p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#16924f]">
                <Lightbulb className="size-5" />
              </div>

              <p className="text-[13px] leading-5 text-[#385344]">
                You don't
                need many
                customers.
                A few
                website
                sales can
                add up
                quickly
                depending
                on what
                you charge.
              </p>
            </div>
          </QuestionShell>
        )}

        {step === 3 && (
          <QuestionShell
            step={3}
            title="What's the biggest problem right now?"
            subtitle="This helps us show you the easiest place to begin."
            onBack={() =>
              setStep(2)
            }
          >
            <div className="space-y-3">
              {SITUATION_OPTIONS.map(
                (option) => (
                  <ChoiceCard
                    key={
                      option.value
                    }
                    title={
                      option.title
                    }
                    description={
                      option.description
                    }
                    icon={
                      option.icon
                    }
                    selected={
                      answers.situation ===
                      option.value
                    }
                    onClick={() =>
                      chooseSituation(
                        option.value,
                      )
                    }
                  />
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                chooseSituation(
                  answers.situation ??
                    "no_idea",
                )
              }
              className="mx-auto mt-8 block text-sm text-[#334339] underline decoration-black/25 underline-offset-4"
            >
              Skip this
              question
            </button>
          </QuestionShell>
        )}

        {step === 4 && (
          <Result
            answers={
              answers
            }
            onBack={() =>
              setStep(3)
            }
            onStart={
              startSignup
            }
          />
        )}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a
      href="/"
      className="inline-flex items-center text-[23px] font-bold tracking-[-0.05em] text-[#111611]"
    >
      Kodar

      <span className="text-[#11a55b]">
        AI
      </span>
    </a>
  );
}

function Intro({
  heroImage,
  heroLoading,
  onStart,
  showWhy,
  setShowWhy,
}: {
  heroImage:
    StartHeroImage | null;

  heroLoading:
    boolean;

  onStart:
    () => void;

  showWhy:
    boolean;

  setShowWhy:
    (value: boolean) => void;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col px-5 pb-7 pt-6 sm:px-7">
      <Brand />

      <div className="mt-5 h-[3px] w-5 rounded-full bg-[#18a85d]" />

      <h1 className="mt-4 text-[43px] font-bold leading-[0.98] tracking-[-0.055em] sm:text-[50px]">
        Make money helping
        Nigerian businesses
        get online.
      </h1>

      <p className="mt-4 max-w-[440px] text-[15px] leading-6 text-[#4f5953]">
        You don't need to
        be a professional
        web designer.
        Kodarai helps you
        find businesses
        that need a
        website, create
        one for them, and
        contact the owner.
      </p>

      <div className="mt-5 rounded-2xl bg-[#e1f3df] p-4">
        <Benefit text="Find businesses that need websites" />

        <Benefit text="Make a website with Kodarai" />

        <Benefit text="Sell it and get paid" />
      </div>

      <button
        type="button"
        onClick={
          onStart
        }
        className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#076b3a] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(6,83,48,0.16)] transition hover:bg-[#065f34] active:scale-[0.99]"
      >
        Show me how it works

        <ArrowRight className="size-4" />
      </button>

      <p className="mt-3 text-center text-[11px] text-[#7b827d]">
        Free to get
        started · Takes
        30 seconds
      </p>

      <button
        type="button"
        onClick={() =>
          setShowWhy(
            !showWhy,
          )
        }
        className="mt-5 flex items-center justify-center gap-1 text-xs font-medium text-[#4b5c51]"
      >
        Why this works

        <ChevronDown
          className={`size-4 transition ${
            showWhy
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {showWhy && (
        <div className="mt-3 rounded-2xl border border-[#dfe4dd] bg-white p-4 text-sm leading-6 text-[#5a645e] shadow-sm">
          The model is
          simple: find a
          business that
          needs a better
          website, make
          something useful
          to show them,
          contact the owner,
          then agree on a
          price if they want
          to work with you.
        </div>
      )}

      <div className="mt-7">
        <HeroPhoto
          image={
            heroImage
          }
          loading={
            heroLoading
          }
        />
      </div>
    </main>
  );
}

function HeroPhoto({
  image,
  loading,
}: {
  image:
    StartHeroImage | null;

  loading:
    boolean;
}) {
  if (
    loading
  ) {
    return (
      <div className="relative h-[285px] overflow-hidden rounded-[28px] bg-[#dce8dc]">
        <div className="absolute inset-0 animate-pulse bg-[#dce8dc]" />

        <div className="absolute inset-x-5 bottom-5">
          <div className="h-4 w-32 rounded bg-white/40" />

          <div className="mt-2 h-4 w-24 rounded bg-white/30" />
        </div>
      </div>
    );
  }

  if (
    !image
  ) {
    return (
      <div className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-[28px] bg-[#dce8dc]">
        <div className="text-center text-[#486050]">
          <ImageIcon className="mx-auto size-7" />

          <p className="mt-3 text-sm font-semibold">
            Find. Build.
            Sell.
          </p>
        </div>
      </div>
    );
  }

  return (
    <figure>
      <div className="group relative h-[285px] overflow-hidden rounded-[28px] bg-[#dce8dc] shadow-[0_10px_30px_rgba(20,46,29,0.10)] sm:h-[315px]">
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet={
              image.mobileUrl
            }
          />

          <img
            src={
              image.url
            }
            alt={
              image.alt
            }
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
          />
        </picture>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-24">
          <p className="text-[16px] font-semibold leading-[1.35] text-white">
            Real skills.
            <br />
            Real businesses.
            <br />
            Real opportunity.
          </p>

          <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-white/90">
            <CircleDollarSign className="size-4" />

            Start with
            what you know
          </div>
        </div>
      </div>

      <figcaption className="mt-2 px-1 text-[10px] leading-4 text-black/35">
        Photo by{" "}

        <a
          href={
            image.photographerUrl
          }
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {
            image.photographer
          }
        </a>{" "}

        on{" "}

        <a
          href={
            image.sourceUrl
          }
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Pexels
        </a>
      </figcaption>
    </figure>
  );
}

function Benefit({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#13a95c] text-white">
        <Check
          className="size-3"
          strokeWidth={3}
        />
      </span>

      <span className="text-[13px] font-medium text-[#2a4131]">
        {text}
      </span>
    </div>
  );
}

function QuestionShell({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;

  onBack:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] px-5 pb-10 pt-5 sm:px-7">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={
            onBack
          }
          aria-label="Go back"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#1c251f] transition hover:bg-black/5"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#e2e5df]">
          <div
            className="h-full rounded-full bg-[#14aa5d] transition-all duration-300"
            style={{
              width:
                `${(step / 3) * 100}%`,
            }}
          />
        </div>

        <span className="shrink-0 text-xs font-medium text-[#444e48]">
          {step} of 3
        </span>
      </div>

      <h1 className="mt-7 text-[32px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[38px]">
        {title}
      </h1>

      <p className="mt-3 text-[14px] leading-5 text-[#5f6862]">
        {subtitle}
      </p>

      <div className="mt-7">
        {children}
      </div>
    </main>
  );
}

function ChoiceCard({
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;

  icon:
    typeof User;

  selected:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-[0_3px_14px_rgba(25,35,28,0.05)] transition active:scale-[0.99] ${
        selected
          ? "border-[#18a95e] bg-[#edf9ef]"
          : "border-[#e5e7e2] bg-white hover:border-[#b9d9c2]"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-[#d8f2df] text-[#087542]"
            : "bg-[#f4f6f2] text-[#075936]"
        }`}
      >
        <Icon
          className="size-5"
          strokeWidth={2}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-[#111611]">
          {title}
        </span>

        <span className="mt-1 block text-[12px] leading-[18px] text-[#606a64]">
          {description}
        </span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-[#1f2a23]" />
    </button>
  );
}

function MoneyCard({
  amount,
  selected,
  onClick,
}: {
  amount: string;

  selected:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-[0_3px_14px_rgba(25,35,28,0.05)] transition active:scale-[0.99] ${
        selected
          ? "border-[#18a95e] bg-[#edf9ef]"
          : "border-[#e5e7e2] bg-white hover:border-[#b9d9c2]"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f8f0] text-[#0a7f47]">
        <CircleDollarSign className="size-5" />
      </span>

      <span className="flex-1">
        <span className="block text-[18px] font-bold tracking-[-0.02em]">
          {amount}
        </span>

        <span className="text-xs text-[#727b75]">
          per month
        </span>
      </span>

      <ChevronRight className="size-5 text-[#1f2a23]" />
    </button>
  );
}

function Result({
  answers,
  onBack,
  onStart,
}: {
  answers:
    FunnelAnswers;

  onBack:
    () => void;

  onStart:
    () => void;
}) {
  const goal =
    Number(
      answers.goal ??
        "250000",
    );

  const goalLabel =
    goal >= 1_000_000
      ? "₦1,000,000+"
      : `₦${goal.toLocaleString(
          "en-NG",
        )}`;

  const examples =
    useMemo(() => {
      const firstPrice =
        50_000;

      const secondPrice =
        100_000;

      const firstClients =
        Math.ceil(
          goal /
            firstPrice,
        );

      const secondClients =
        Math.ceil(
          goal /
            secondPrice,
        );

      return {
        firstPrice,
        firstClients,

        firstTotal:
          firstPrice *
          firstClients,

        secondPrice,
        secondClients,

        secondTotal:
          secondPrice *
          secondClients,
      };
    }, [goal]);

  return (
    <main className="min-h-[100dvh] px-5 pb-10 pt-5 sm:px-7">
      <button
        type="button"
        onClick={
          onBack
        }
        aria-label="Go back"
        className="flex size-9 items-center justify-center rounded-full text-[#1c251f] transition hover:bg-black/5"
      >
        <ArrowLeft className="size-5" />
      </button>

      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#13864d]">
        Your plan
      </p>

      <h1 className="mt-2 text-[33px] font-bold leading-[1.02] tracking-[-0.05em]">
        Let's work
        towards{" "}

        <span className="text-[#0a9a51]">
          {goalLabel}
        </span>{" "}

        a month.
      </h1>

      <p className="mt-3 text-sm leading-5 text-[#626c66]">
        Here's one
        simple way to
        think about it.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#e2e6e1] bg-white shadow-[0_3px_14px_rgba(25,35,28,0.04)]">
        <IncomeExample
          clients={
            examples.firstClients
          }
          price={
            examples.firstPrice
          }
          total={
            examples.firstTotal
          }
        />

        <div className="mx-4 h-px bg-[#e9ece8]" />

        <IncomeExample
          clients={
            examples.secondClients
          }
          price={
            examples.secondPrice
          }
          total={
            examples.secondTotal
          }
        />
      </div>

      <h2 className="mt-7 text-[17px] font-bold">
        Kodarai helps
        you do the work.
      </h2>

      <div className="mt-4 space-y-5">
        <PlanStep
          number={1}
          title="Find a business"
          text="Find real businesses that don't have a good website yet."
        />

        <PlanStep
          number={2}
          title="Make something to show them"
          text="Use Kodarai to create a website sample for the business."
        />

        <PlanStep
          number={3}
          title="Talk to the owner"
          text="Get their contact details and show them what you made."
        />

        <PlanStep
          number={4}
          title="Agree on a price"
          text="If they want the website, agree on the work and what they'll pay you."
        />
      </div>

      <button
        type="button"
        onClick={
          onStart
        }
        className="mt-8 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#076b3a] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(6,83,48,0.16)] transition hover:bg-[#065f34] active:scale-[0.99]"
      >
        Start finding
        businesses

        <ArrowRight className="size-4" />
      </button>

      <p className="mt-4 text-[10px] leading-4 text-[#818982]">
        Earnings are not
        guaranteed. These
        numbers are
        examples only.
        What you earn
        depends on your
        effort, pricing
        and ability to
        find and close
        customers.
      </p>
    </main>
  );
}

function IncomeExample({
  clients,
  price,
  total,
}: {
  clients:
    number;

  price:
    number;

  total:
    number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[13px] font-semibold">
          Sell {clients}{" "}

          {clients === 1
            ? "website"
            : "websites"}{" "}

          at ₦
          {price.toLocaleString(
            "en-NG",
          )}
        </p>

        <p className="mt-1 text-[11px] text-[#747c77]">
          {clients} × ₦
          {price.toLocaleString(
            "en-NG",
          )}
        </p>
      </div>

      <span className="shrink-0 text-[14px] font-bold text-[#0b9c52]">
        ₦
        {total.toLocaleString(
          "en-NG",
        )}
      </span>
    </div>
  );
}

function PlanStep({
  number,
  title,
  text,
}: {
  number:
    number;

  title:
    string;

  text:
    string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#076b3a] text-[12px] font-bold text-white">
        {number}
      </span>

      <div>
        <p className="text-[14px] font-semibold">
          {title}
        </p>

        <p className="mt-1 text-[12px] leading-[18px] text-[#626c66]">
          {text}
        </p>
      </div>
    </div>
  );
}
