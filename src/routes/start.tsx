import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Eye,
  Link2,
  PhoneCall,
  GraduationCap,
  ImageIcon,
  Laptop,
  MessageCircle,
  Search,
  Star,
  User,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Autoplay from "embla-carousel-autoplay";

import { PACKS, PLANS, formatNgn, getPlanPrice } from "@/lib/billing";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import {
  getStartHeroImage,
  type StartHeroImage,
} from "@/lib/start-images.functions";

import {
  getPublishedSocialProof,
  type PublicMarketingProof,
  type PublicMarketingReview,
} from "@/lib/social-proof.functions";

import {
  saveFunnelAttribution,
  trackFunnelCompleted,
  trackFunnelExperienceSelected,
  trackFunnelGoalSelected,
  trackFunnelSituationSelected,
  trackFunnelStarted,
  trackEvent,
  trackFunnelViewed,
  trackViewContent,
  trackStartCallScriptDemoViewed,
  trackStartDemoLinkFeatureViewed,
  trackStartFinderDemoViewed,
  trackStartLiveDemoClicked,
  trackStartProductWorkflowViewed,
  trackStartStudioDemoViewed,
  trackStartWorkflowCtaClicked,
  trackSignupStarted,
  trackStartProofChanged,
  trackStartProofCtaClicked,
  trackStartProofViewed,
  trackStartReviewChanged,
  trackStartReviewsViewed,
} from "@/lib/analytics";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      {
        title: "Find Businesses. Make Websites. Get Paid — Kodarai",
      },
      {
        name: "description",
        content:
          "KodarAI helps you find businesses that need websites, make something to show them and turn that opportunity into paid work.",
      },
      {
        name: "robots",
        content: "noindex,follow",
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
  | "50000"
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
    value: "beginner" as const,
    title: "I'm a complete beginner",
    description:
      "I've never built a website. I want a simple way to start.",
    icon: GraduationCap,
  },
  {
    value: "learning" as const,
    title: "I'm still learning",
    description:
      "I know a little, but I haven't really made money from it.",
    icon: User,
  },
  {
    value: "builder" as const,
    title: "I already build websites",
    description:
      "I know how to build. I need businesses to sell to.",
    icon: Laptop,
  },
  {
    value: "agency" as const,
    title: "I run a web design business",
    description:
      "I want more businesses to contact and more chances to close deals.",
    icon: Users,
  },
];

const GOAL_OPTIONS = [
  {
    value: "50000" as const,
    title: "₦50,000",
  },
  {
    value: "100000" as const,
    title: "₦100,000",
  },
  {
    value: "250000" as const,
    title: "₦250,000",
  },
  {
    value: "500000" as const,
    title: "₦500,000",
  },
  {
    value: "1000000" as const,
    title: "₦1,000,000+",
  },
];

const SITUATION_OPTIONS = [
  {
    value: "no_idea" as const,
    title: "I don't know where to start",
    description:
      "I need the steps broken down for me.",
    icon: Search,
  },
  {
    value: "finding_people" as const,
    title: "I don't know who to sell to",
    description:
      "Finding businesses that might need a website is the hard part.",
    icon: Users,
  },
  {
    value: "no_sales" as const,
    title: "Businesses don't reply to me",
    description:
      "I need a better way to show businesses what I can do.",
    icon: MessageCircle,
  },
  {
    value: "need_more" as const,
    title: "I just want more clients",
    description:
      "I understand the business already. I need more opportunities.",
    icon: BarChart3,
  },
];

const FIRST_PACK_PRICE = formatNgn(PACKS[0].ngn);
const FIRST_PLAN_PRICE = formatNgn(getPlanPrice(PLANS[0], "monthly"));

type HeroHook = {
  before: string;
  highlight: string;
  after: string;
};

// Hero headlines. With no ?h= parameter they rotate with a fade/slide, like the
// landing page hero. Point a Meta ad at /start?h=<key> (earn | client | find) to pin ONE headline so you
// can A/B test hooks (a pinned headline does not rotate).
const HERO_HOOKS: Record<string, HeroHook> = {
  earn: {
    before: "Earn money building websites for businesses that don't have one,",
    highlight: "local or abroad.",
    after: "",
  },
  client: {
    before: "Get paid to build websites",
    highlight: "for local businesses",
    after: "that don't have one.",
  },
  find: {
    before: "Find",
    highlight: "businesses near you or abroad",
    after: "that need a website, and sell them one.",
  },
};

const HERO_ROTATE_MS = 5000;

function HeroHeadline({ pinned }: { pinned: string | null }) {
  const hooks = useMemo(
    () => (pinned && pinned in HERO_HOOKS ? [HERO_HOOKS[pinned]] : Object.values(HERO_HOOKS)),
    [pinned],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (hooks.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % hooks.length);
    }, HERO_ROTATE_MS);
    return () => window.clearInterval(interval);
  }, [hooks]);

  // All headlines share one grid cell, so the block is as tall as the longest one
  // and nothing below it jumps when the text changes.
  return (
    <h1 className="mt-4 grid max-w-[680px] text-[34px] font-bold leading-[1] tracking-[-0.05em] text-[#111611] sm:text-[46px] lg:text-[56px]">
      {hooks.map((hook, index) => {
        const isActive = index === active;
        return (
          <span
            key={hook.highlight}
            aria-hidden={!isActive}
            className="col-start-1 row-start-1"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateY(0)" : "translateY(10px)",
              transition: isActive
                ? "opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s"
                : "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            {hook.before} <span className="text-[#079653]">{hook.highlight}</span>
            {hook.after ? ` ${hook.after}` : ""}
          </span>
        );
      })}
    </h1>
  );
}

function StartPage() {
  const runGetHeroImage =
    useServerFn(getStartHeroImage);

  const runGetSocialProof =
    useServerFn(getPublishedSocialProof);

  const [step, setStep] =
    useState(0);

  const [
    answers,
    setAnswers,
  ] =
    useState<FunnelAnswers>({});

  const [
    attribution,
    setAttribution,
  ] =
    useState<
      Record<string, string>
    >({});

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

  const [
    reviews,
    setReviews,
  ] =
    useState<
      PublicMarketingReview[]
    >([]);

  const [
    proofs,
    setProofs,
  ] =
    useState<
      PublicMarketingProof[]
    >([]);

  const [hook, setHook] = useState<string | null>(null);

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

    setAttribution(values);

    const hookParam = params.get("h");
    if (hookParam && hookParam in HERO_HOOKS) {
      setHook(hookParam);
      trackEvent("start_hook_viewed", { hook: hookParam });
    }
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

  useEffect(() => {
    let cancelled =
      false;

    runGetSocialProof()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setReviews(
          result.reviews,
        );

        setProofs(
          result.proofs,
        );
      })
      .catch((error) => {
        console.error(
          "[KodarAI start] Could not load social proof:",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [runGetSocialProof]);

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

    saveFunnelAttribution(
      payload,
    );
  };

  const beginQuestions =
    () => {
      trackFunnelStarted();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      setStep(1);
    };

  const chooseExperience = (
    value: Experience,
  ) => {
    const next = {
      ...answers,
      experience: value,
    };

    setAnswers(next);
    saveAnswers(next);

    trackFunnelExperienceSelected(
      value,
    );

    window.setTimeout(
      () => {
        setStep(2);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
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

    trackFunnelGoalSelected(
      value,
    );

    window.setTimeout(
      () => {
        setStep(3);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      },
      140,
    );
  };

  const chooseSituation = (
    value: Situation,
  ) => {
    const next = {
      ...answers,
      situation: value,
    };

    setAnswers(next);
    saveAnswers(next);

    trackFunnelSituationSelected(
      value,
    );

    trackFunnelCompleted({
      ...next,
      source: "ads",
      ...attribution,
    });

    window.setTimeout(
      () => {
        setStep(4);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
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
      {step === 0 && (
        <IntroPage
          hook={hook}
          heroImage={
            heroImage
          }
          heroLoading={
            heroLoading
          }
          reviews={
            reviews
          }
          proofs={
            proofs
          }
          onStart={
            beginQuestions
          }
        />
      )}

      {step === 1 && (
        <QuestionShell
          step={1}
          title="Which one sounds like you?"
          subtitle="Pick the closest one. No experience needed. Kodarai builds the first draft of the website for you."
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
        </QuestionShell>
      )}

      {step === 2 && (
        <QuestionShell
          step={2}
          title="What would you like to earn each month?"
          subtitle="Just a target to aim for. Not a promise or guarantee."
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
              <CircleDollarSign className="size-5" />
            </div>

            <p className="text-[13px] leading-5 text-[#385344]">
              You don't
              need hundreds
              of customers.
              A few website
              jobs can add
              up depending
              on what you
              charge and
              the deals you
              close.
            </p>
          </div>
        </QuestionShell>
      )}

      {step === 3 && (
        <QuestionShell
          step={3}
          title="What's the hardest part for you right now?"
          subtitle="This shows you where Kodarai helps most."
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
            Skip this question
          </button>
        </QuestionShell>
      )}

      {step === 4 && (
        <Result
          answers={
            answers
          }
          reviews={
            reviews
          }
          proofs={
            proofs
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
  );
}

function IntroPage({
  hook,
  heroImage,
  heroLoading,
  reviews,
  proofs,
  onStart,
}: {
  hook: string | null;

  heroImage:
    StartHeroImage | null;

  heroLoading:
    boolean;

  reviews:
    PublicMarketingReview[];

  proofs:
    PublicMarketingProof[];

  onStart:
    () => void;
}) {
  const howRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  // Engaged-visitor signal for Meta: fires once after 10s on the intro page.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      trackViewContent("start_intro");
    }, 10000);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollToHow =
    () => {
      howRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

  return (
    <main className="overflow-hidden">
      <section className="mx-auto w-full max-w-[1180px] px-5 pb-12 pt-6 sm:px-8 lg:px-10 lg:pb-20 lg:pt-8">
        <Brand />

        <div className="mt-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
          <div>
            <Pill>
              Lead finder +
              website builder
              for freelancers
            </Pill>

            <HeroHeadline pinned={hook} />

            <p className="mt-5 max-w-[560px] text-[15px] leading-6 text-[#536059] sm:text-[17px] sm:leading-7">
              No coding needed. Kodarai finds businesses with great Google reviews and no website, builds a sample website for each one, and helps you sell it to the owner.
            </p>

            <button
              type="button"
              onClick={
                onStart
              }
              className="mt-6 flex min-h-[58px] w-full max-w-[420px] items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(7,150,83,0.17)] transition hover:bg-[#078549] active:scale-[0.99]"
            >
              Find my first business

              <ArrowRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={
                scrollToHow
              }
              className="mt-3 text-[13px] font-semibold text-[#25342b] underline underline-offset-4"
            >
              See how it works
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#727d75]">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-[#0a9451]" />
                Plans from {FIRST_PACK_PRICE} · Pay with Paystack
              </span>

              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-[#0a9451]" />
                Takes about 30 seconds
              </span>
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <HeroPhoto
              image={
                heroImage
              }
              loading={
                heroLoading
              }
            />
          </div>
        </div>
      </section>

      <PlainEnglish />

      <div
        ref={
          howRef
        }
      >
        <HowItWorks />
      </div>

      <ExampleCard />

      <ProductWorkflowSection onStart={onStart} />

      <ReviewsSection
        reviews={
          reviews
        }
      />

      <ProofGallerySection
        proofs={
          proofs
        }
        onStart={
          onStart
        }
      />

      <StartFaq />

      <FinalIntroCta
        reviews={
          reviews
        }
        onStart={
          onStart
        }
      />
    </main>
  );
}

function PlainEnglish() {
  const items = [
    {
      label: "The problem",
      text: "Lots of local businesses have no website. Customers search online, can't find them, and go to a competitor.",
    },
    {
      label: "What Kodarai does",
      text: "It finds those businesses for you and builds a sample website for each one, so you don't start from nothing.",
    },
    {
      label: "What you do",
      text: "Send the sample to the owner. If they like it, you agree a price and finish the website for them.",
    },
  ];

  return (
    <section className="bg-[#f5f6f0]">
      <div className="mx-auto w-full max-w-[960px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="text-center">
          <Pill>In plain English</Pill>
          <h2 className="mx-auto mt-4 max-w-[600px] text-[28px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
            What is Kodarai, and why would a business pay you?
          </h2>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#e0e5df] bg-white p-5"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#15854d]">
                {item.label}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#34413a]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExampleCard() {
  const steps = [
    "Kodarai lists it as a business with great reviews and no website.",
    "You click Build Website. Kodarai makes a sample site for the salon.",
    "You send the owner the link and a short message.",
    "The owner likes it and agrees a price with you.",
  ];

  return (
    <section className="bg-[#f5f6f0]">
      <div className="mx-auto w-full max-w-[650px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="text-center">
          <Pill>Example</Pill>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
            How one sale could go
          </h2>
        </div>
        <div className="mt-7 rounded-[22px] border border-[#e0e5df] bg-white p-5 shadow-[0_7px_22px_rgba(24,37,28,0.055)]">
          <p className="text-[15px] font-bold text-[#172019]">Glow Beauty Salon, Lekki</p>
          <p className="mt-1 text-[13px] text-[#687169]">
            4.8 stars · 142 reviews · No website
          </p>
          <ol className="mt-4 space-y-3">
            {steps.map((text, index) => (
              <li key={text} className="flex gap-3 text-[14px] leading-6 text-[#34413a]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e4f4e6] text-[12px] font-bold text-[#15854d]">
                  {index + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-center text-[11px] leading-5 text-[#69746c]">
          Illustrative example, not a real customer. Results are not guaranteed.
        </p>
      </div>
    </section>
  );
}

function StartFaq() {
  const items = [
    {
      q: "Do I need to know how to code?",
      a: "No. Kodarai builds the sample website for you and you can change it with simple instructions. If you can already build websites, you can customise it further.",
    },
    {
      q: "How do I contact the business owner?",
      a: "Kodarai shows each business's details where available, such as phone and address, and writes a message and a call script for you. The free Sales Academy also has short lessons on your first call.",
    },
    {
      q: "How much does it cost and what do I get?",
      a: `Lead packs start at ${FIRST_PACK_PRICE} for ${PACKS[0].credits} lead searches. Monthly plans start at ${FIRST_PLAN_PRICE} and include the website builder. You pay securely with Paystack and can see all plans before you pay.`,
    },
    {
      q: "What if a business says no?",
      a: "Some will, and that's normal. Contact more businesses and adjust your message. Kodarai helps you find more businesses to try.",
    },
    {
      q: "Will I definitely make money?",
      a: "No. Kodarai gives you the tools to find businesses and build samples. What you earn depends on your price, your effort and the deals you close.",
    },
  ];

  return (
    <section className="border-y border-[#e5e6df] bg-white">
      <div className="mx-auto w-full max-w-[650px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="text-center">
          <Pill>Questions</Pill>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
            Before you start
          </h2>
        </div>
        <div className="mt-7 divide-y divide-[#e5e6df] overflow-hidden rounded-2xl border border-[#e0e5df]">
          {items.map((item) => (
            <details key={item.q} className="group px-4 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-[#172019]">
                {item.q}
                <ChevronRight className="size-4 shrink-0 text-[#687169] transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-[14px] leading-6 text-[#536059]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Brand() {
  return (
    <a
      href="/"
      className="inline-flex items-center text-[24px] font-bold tracking-[-0.055em] text-[#111611]"
    >
      Kodar

      <span className="text-[#0aa45a]">
        AI
      </span>
    </a>
  );
}

function Pill({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <span className="inline-flex rounded-full bg-[#e4f4e6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#15854d]">
      {children}
    </span>
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
  if (loading) {
    return (
      <div className="relative h-[360px] overflow-hidden rounded-[28px] bg-[#dce8dc] sm:h-[430px] lg:h-[560px]">
        <div className="absolute inset-0 animate-pulse bg-[#dce8dc]" />
      </div>
    );
  }

  if (!image) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-[28px] bg-[#dce8dc] sm:h-[430px] lg:h-[560px]">
        <div className="text-center text-[#486050]">
          <ImageIcon className="mx-auto size-8" />

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
      <div className="group relative h-[360px] overflow-hidden rounded-[28px] bg-[#dce8dc] shadow-[0_18px_45px_rgba(20,46,29,0.12)] sm:h-[430px] lg:h-[560px]">
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
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
          />
        </picture>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-5 pb-5 pt-28">
          <div className="ml-auto max-w-[220px] rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-sm">
            <p className="text-[18px] font-bold leading-[1.15] tracking-[-0.035em] text-[#172019]">
              More businesses.
              <br />
              More chances.
              <br />
              More income.
            </p>
          </div>
        </div>
      </div>

      <figcaption className="mt-2 px-1 text-[10px] text-black/35">
        Photo by{" "}

        <a
          href={
            image.photographerUrl
          }
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {image.photographer}
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

function HowItWorks() {
  const steps = [
    {
      number: 1,
      icon: Search,
      title:
        "Find a business (a couple of minutes)",
      text:
        "Pick your city and a type of business, like salons or restaurants. Kodarai lists ones with good reviews and no website.",
    },
    {
      number: 2,
      icon: Laptop,
      title:
        "Get a sample website made (a few minutes)",
      text:
        "Click one button and Kodarai builds a sample website for that business. You can change it before you show anyone.",
    },
    {
      number: 3,
      icon: MessageCircle,
      title:
        "Send it to the owner",
      text:
        "Send the link with a ready-made message, or call using the script Kodarai writes for you.",
    },
    {
      number: 4,
      icon: CircleDollarSign,
      title:
        "Agree a price and get paid",
      text:
        "If they like it, agree on a price with the owner and finish the website for them.",
    },
  ];

  return (
    <section className="border-y border-[#e5e6df] bg-white">
      <div className="mx-auto w-full max-w-[960px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="text-center">
          <Pill>
            It's simple
          </Pill>

          <h2 className="mx-auto mt-4 max-w-[600px] text-[34px] font-bold leading-[1] tracking-[-0.05em] sm:text-[46px]">
            Here's how it works.
          </h2>

          <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-6 text-[#687169]">
            You don't need
            to be a
            professional
            web designer.
            Just follow the
            steps.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-[650px]">
          {steps.map(
            (
              item,
              index,
            ) => {
              const Icon =
                item.icon;

              return (
                <div
                  key={
                    item.number
                  }
                  className="relative flex gap-4 pb-8 last:pb-0"
                >
                  {index <
                    steps.length -
                      1 && (
                    <div className="absolute bottom-0 left-[19px] top-[40px] w-px bg-[#dbe5dc]" />
                  )}

                  <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#079653] text-[14px] font-bold text-white">
                    {
                      item.number
                    }
                  </span>

                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4 rounded-2xl border border-[#e7e9e5] bg-[#fcfcf9] p-4 shadow-[0_4px_15px_rgba(26,39,30,0.035)]">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#172019]">
                        {
                          item.title
                        }
                      </h3>

                      <p className="mt-1.5 max-w-[430px] text-[12px] leading-[19px] text-[#657067]">
                        {
                          item.text
                        }
                      </p>
                    </div>

                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf6ec] text-[#087a45]">
                      <Icon className="size-5" />
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>

        <div className="mx-auto mt-10 max-w-[650px] rounded-2xl bg-[#e6f5e8] p-4">
          <p className="text-center text-[13px] font-semibold leading-5 text-[#31523c]">
            You don't need
            to wait for
            somebody to
            come looking
            for you.
            Kodarai helps
            you find the
            businesses
            yourself.
          </p>
        </div>
      </div>
    </section>
  );
}

const START_FINDER_IMAGE = "/start/Lead%20Finder%20%E2%80%94%20Kodarai.png";
const START_STUDIO_IMAGE = "/start/Studio%20Builder%20%E2%80%94%20Kodarai.png";
const KODARAI_EXAMPLE_DEMO = "https://kodarai.xyz/demo/pDSidqTXdikM-Br_hJerfkOLveCibHtNEVt-HiI4XNY";

function ProductWorkflowSection({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <section className="border-y border-[#e5e6df] bg-[#f8f7f1]">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <WorkflowViewTracker onViewed={trackStartProductWorkflowViewed}>
          <div className="max-w-[680px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#16894e]">See what Kodarai does</p>
            <h2 className="mt-3 text-[30px] font-bold leading-[1.04] tracking-[-0.05em] text-[#172019] sm:text-[44px]">
              See how Kodarai helps you turn businesses into website opportunities.
            </h2>
            <p className="mt-3 max-w-[580px] text-[14px] leading-6 text-[#687169]">
              Find a business that needs a website, make something to show them, contact the owner and try to sell the website.
            </p>
          </div>
        </WorkflowViewTracker>

        <WorkflowViewTracker onViewed={trackStartFinderDemoViewed}>
          <div className="mt-10 grid items-center gap-6 border-t border-[#dfe5df] pt-8 lg:mt-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:pt-12">
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-[#159051]">01 · FIND</p>
              <h3 className="mt-3 text-[25px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[32px]">Find businesses you can sell websites to</h3>
              <p className="mt-3 text-[14px] leading-6 text-[#5f6b63]">KodarAI helps you find real businesses with no website or a poor one. You can see their phone number, address, reviews and opportunity score before you decide who to contact.</p>
              <div className="mt-5 border-l-2 border-[#079653] pl-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#16894e]">Possible website price</p><p className="mt-1 text-[23px] font-bold tracking-[-0.04em] text-[#172019]">₦70,000 – ₦150,000</p><p className="mt-1 text-[11px] leading-5 text-[#687169]">Example only. What you charge and earn depends on the work and the deal you agree with the business.</p></div>
            </div>
            <a href={START_FINDER_IMAGE} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-[20px] border border-[#dce2db] bg-white p-2" aria-label="Open the Kodarai Finder example image"><div className="overflow-hidden rounded-[14px] bg-[#edf0ea]"><img src={START_FINDER_IMAGE} alt="KodarAI Finder showing businesses without websites and website-building actions" width={1920} height={878} loading="lazy" className="h-auto w-full object-contain transition duration-300 group-hover:scale-[1.01]" /></div><p className="px-1 pt-2 text-[10px] text-[#687169]">Real Kodarai Finder interface</p></a>
          </div>
        </WorkflowViewTracker>

        <WorkflowViewTracker onViewed={trackStartStudioDemoViewed}>
          <div className="mt-12 grid items-center gap-6 border-t border-[#dfe5df] pt-8 lg:mt-16 lg:grid-cols-[1.18fr_0.82fr] lg:gap-12 lg:pt-12">
            <a href={START_STUDIO_IMAGE} target="_blank" rel="noopener noreferrer" className="group order-2 block overflow-hidden rounded-[20px] border border-[#dce2db] bg-white p-2 lg:order-1" aria-label="Open the Kodarai Studio example image"><div className="overflow-hidden rounded-[14px] bg-[#edf0ea]"><img src={START_STUDIO_IMAGE} alt="KodarAI Studio showing website code, live preview and shareable demo link" width={1920} height={1516} loading="lazy" className="h-auto w-full object-contain transition duration-300 group-hover:scale-[1.01]" /></div><p className="px-1 pt-2 text-[10px] text-[#687169]">Real Kodarai Studio interface</p></a>
            <div className="order-1 lg:order-2"><p className="text-[11px] font-bold tracking-[0.15em] text-[#159051]">03 · BUILD</p><h3 className="mt-3 text-[25px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[32px]">Make them a website — even if you don&apos;t code</h3><p className="mt-3 text-[14px] leading-6 text-[#5f6b63]">Click Build Website and Kodarai Studio can create a website you can show the owner. Preview it, make changes, save it and send them a demo link.</p><a href={KODARAI_EXAMPLE_DEMO} target="_blank" rel="noopener noreferrer" onClick={trackStartLiveDemoClicked} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[14px] font-semibold text-white transition hover:bg-[#078549] sm:w-auto">See what Kodarai can build <ArrowRight className="size-4" /></a><p className="mt-2 text-[11px] text-[#69746c]">Example website built with Kodarai Studio.</p></div>
          </div>
        </WorkflowViewTracker>

        <div className="mt-12 border-t border-[#dfe5df] pt-8 lg:mt-16 lg:pt-12">
          <div className="max-w-[560px]"><p className="text-[11px] font-bold tracking-[0.15em] text-[#159051]">04 · CONTACT AND FOLLOW UP</p><h3 className="mt-3 text-[25px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[32px]">KodarAI helps you know what to say and what to do next</h3></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <WorkflowViewTracker onViewed={trackStartCallScriptDemoViewed}><div className="rounded-2xl border border-[#dfe5df] bg-white p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-[#2c3c31]"><PhoneCall className="size-4 text-[#0a9451]" /> Call script</div><p className="mt-3 text-[12px] leading-5 text-[#5f6b63]">Hi, good afternoon. I noticed your business doesn&apos;t have a website yet. I made a quick sample. Can I send it to you on WhatsApp?</p><span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16894e]"><Copy className="size-3.5" /> Copy message</span></div></WorkflowViewTracker>
            <WorkflowViewTracker onViewed={trackStartDemoLinkFeatureViewed}><div className="rounded-2xl border border-[#dfe5df] bg-white p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-[#2c3c31]"><Link2 className="size-4 text-[#0a9451]" /> Send a demo link</div><p className="mt-3 text-[12px] leading-5 text-[#5f6b63]">Send a website the owner can actually open on WhatsApp, email or wherever you&apos;re talking.</p><div className="mt-3 flex items-center gap-2 rounded-lg bg-[#f4f7f3] px-2.5 py-2"><span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#59655d]">kodarai.xyz/demo/abc...</span><Copy className="size-3.5 shrink-0 text-[#16894e]" /></div></div></WorkflowViewTracker>
            <div className="rounded-2xl border border-[#dfe5df] bg-white p-4"><div className="flex items-center gap-2 text-[11px] font-bold text-[#2c3c31]"><Eye className="size-4 text-[#0a9451]" /> Know when it was opened</div><span className="mt-3 inline-flex rounded-full bg-[#e7f5e9] px-2 py-1 text-[10px] font-bold text-[#17834d]">Example</span><p className="mt-2 text-[12px] font-semibold text-[#334339]">Viewed 1 time · 17 minutes ago</p><p className="mt-2 text-[12px] leading-5 text-[#5f6b63]">KodarAI can show you when it may be a good time to follow up.</p><span className="mt-3 inline-flex text-[11px] font-semibold text-[#16894e]">Follow up now →</span></div>
          </div>
        </div>

        <div className="mt-12 border-t border-[#dfe5df] pt-8 lg:mt-16 lg:pt-12"><p className="text-[11px] font-bold tracking-[0.15em] text-[#159051]">07 · SELL</p><h3 className="mt-3 max-w-[650px] text-[28px] font-bold leading-[1.06] tracking-[-0.045em] sm:text-[38px]">Follow up, agree on a price and get paid</h3><p className="mt-3 max-w-[610px] text-[14px] leading-6 text-[#5f6b63]">If the owner likes what you made, agree on the price, finish the website and get paid for the job.</p><div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#24352a] sm:text-[14px]"><span>Find</span><ChevronRight className="size-4 text-[#159051]" /><span>Build</span><ChevronRight className="size-4 text-[#159051]" /><span>Contact</span><ChevronRight className="size-4 text-[#159051]" /><span>Show</span><ChevronRight className="size-4 text-[#159051]" /><span>Follow up</span><ChevronRight className="size-4 text-[#159051]" /><span>Sell</span></div><p className="mt-4 text-[13px] font-semibold text-[#334339]">KodarAI helps you with the parts before the sale.</p><p className="mt-5 max-w-[620px] text-[13px] font-semibold text-[#172019]">One good client can be worth more than the cost of a Kodarai plan.</p><p className="mt-1 text-[11px] leading-5 text-[#687169]">Earnings are not guaranteed. Your results depend on your pricing, effort and the deals you close.</p></div>

        <div className="mt-10 border-t border-[#dfe5df] pt-8"><p className="text-[22px] font-bold tracking-[-0.04em] text-[#172019]">Ready to try it yourself?</p><button type="button" onClick={() => { trackStartWorkflowCtaClicked(); onStart(); }} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[14px] font-semibold text-white transition hover:bg-[#078549] sm:w-auto">Show me my plan <ArrowRight className="size-4" /></button></div>
      </div>
    </section>
  );
}
function WorkflowViewTracker({
  onViewed,
  children,
}: {
  onViewed: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || tracked.current) return;
    const track = () => {
      if (tracked.current) return;
      tracked.current = true;
      onViewed();
    };
    if (!("IntersectionObserver" in window)) {
      track();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track();
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onViewed]);

  return <div ref={ref}>{children}</div>;
}
function ReviewsSection({
  reviews,
}: {
  reviews:
    PublicMarketingReview[];
}) {
  const [
    api,
    setApi,
  ] =
    useState<CarouselApi>();

  const [
    current,
    setCurrent,
  ] =
    useState(0);

  const rating =
    reviews.length > 0
      ? reviews.reduce(
          (
            total,
            review,
          ) =>
            total +
            review.rating,
          0,
        ) /
        reviews.length
      : null;

  useEffect(() => {
    if (
      reviews.length
    ) {
      trackStartReviewsViewed();
    }
  }, [reviews.length]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const update =
      () => {
        const index =
          api.selectedScrollSnap();

        setCurrent(
          index,
        );

        trackStartReviewChanged(
          index + 1,
        );
      };

    update();

    api.on(
      "select",
      update,
    );

    return () => {
      api.off(
        "select",
        update,
      );
    };
  }, [api]);

  if (!reviews.length) {
    return null;
  }

  return (
    <section className="bg-[#f8f7f1]">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[650px] text-center">
          <Pill>
            Trusted by
            people like you
          </Pill>

          <h2 className="mt-4 text-[34px] font-bold leading-[1] tracking-[-0.05em] sm:text-[46px]">
            People are
            already using
            Kodarai to get
            clients.
          </h2>

          <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-6 text-[#687169]">
            Here's what
            people using
            Kodarai have
            to say.
          </p>
        </div>

        <Carousel
          setApi={
            setApi
          }
          opts={{
            align: "start",
            loop:
              reviews.length >
              1,
          }}
          plugins={
            reviews.length >
            1
              ? [
                  Autoplay({
                    delay:
                      5000,
                    stopOnInteraction:
                      true,
                    stopOnMouseEnter:
                      true,
                  }),
                ]
              : []
          }
          className="mx-auto mt-9 max-w-[1000px]"
        >
          <CarouselContent className="-ml-3">
            {reviews.map(
              (review) => (
                <CarouselItem
                  key={
                    review.id
                  }
                  className="basis-[88%] pl-3 sm:basis-[56%] lg:basis-1/3"
                >
                  <TestimonialCard
                    review={
                      review
                    }
                  />
                </CarouselItem>
              ),
            )}
          </CarouselContent>

          {reviews.length >
            1 && (
            <div className="mt-5 hidden justify-end gap-2 sm:flex">
              <CarouselPrevious className="static translate-y-0 border-[#d9dfd8] bg-white" />

              <CarouselNext className="static translate-y-0 border-[#d9dfd8] bg-white" />
            </div>
          )}
        </Carousel>

        {reviews.length >
          1 && (
          <CarouselDots
            count={
              reviews.length
            }
            current={
              current
            }
            onClick={(
              index,
            ) =>
              api?.scrollTo(
                index,
              )
            }
          />
        )}

        {rating !==
          null && (
          <div className="mx-auto mt-9 flex max-w-[420px] flex-col items-center rounded-2xl border border-[#e2e5df] bg-white p-5 text-center shadow-[0_5px_18px_rgba(24,37,28,0.04)]">
            <StarRow
              rating={
                5
              }
              size="large"
            />

            <p className="mt-2 text-[27px] font-bold tracking-[-0.045em]">
              {rating.toFixed(
                1,
              )}{" "}
              out of 5
            </p>

            <p className="mt-1 text-[11px] text-[#7b837d]">
              Based on{" "}
              {
                reviews.length
              }{" "}
              published{" "}
              {reviews.length ===
              1
                ? "review"
                : "reviews"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({
  review,
  compact = false,
}: {
  review:
    PublicMarketingReview;

  compact?: boolean;
}) {
  const subtitle = [
    review.role,
    review.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <figure
      className={
        compact
          ? "rounded-2xl border border-[#e0e5df] bg-white p-4"
          : "flex h-full min-h-[245px] flex-col rounded-[22px] border border-[#e0e5df] bg-white p-5 shadow-[0_7px_22px_rgba(24,37,28,0.055)]"
      }
    >
      <StarRow
        rating={
          review.rating
        }
      />

      <blockquote
        className={`mt-4 flex-1 text-[#27312b] ${
          compact
            ? "text-[12px] leading-[19px]"
            : "text-[14px] leading-6"
        }`}
      >
        “
        {
          review.reviewText
        }
        ”
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3">
        {review.photoUrl ? (
          <img
            src={
              review.photoUrl
            }
            alt={
              review.name
            }
            loading="lazy"
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e5f3e7] text-[13px] font-bold text-[#087542]">
            {review.name.charAt(
              0,
            )}
          </span>
        )}

        <span className="min-w-0">
          <span className="block text-[13px] font-bold text-[#172019]">
            {
              review.name
            }
          </span>

          {subtitle && (
            <span className="mt-0.5 block text-[10px] leading-4 text-[#7a827c]">
              {
                subtitle
              }
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

function StarRow({
  rating,
  size = "small",
}: {
  rating: number;
  size?:
    | "small"
    | "large";
}) {
  return (
    <div className="flex items-center gap-0.5 text-[#efa91b]">
      {Array.from({
        length: 5,
      }).map(
        (
          _,
          index,
        ) => (
          <Star
            key={
              index
            }
            className={
              size ===
              "large"
                ? `size-5 ${
                    index <
                    rating
                      ? "fill-current"
                      : ""
                  }`
                : `size-4 ${
                    index <
                    rating
                      ? "fill-current"
                      : ""
                  }`
            }
          />
        ),
      )}
    </div>
  );
}

function ProofGallerySection({
  proofs,
  onStart,
}: {
  proofs:
    PublicMarketingProof[];

  onStart:
    () => void;
}) {
  const [
    api,
    setApi,
  ] =
    useState<CarouselApi>();

  const [
    current,
    setCurrent,
  ] =
    useState(0);

  useEffect(() => {
    if (
      proofs.length
    ) {
      trackStartProofViewed();
    }
  }, [proofs.length]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const update =
      () => {
        const index =
          api.selectedScrollSnap();

        setCurrent(
          index,
        );

        trackStartProofChanged(
          index + 1,
          proofs[index]
            ?.resultType,
        );
      };

    update();

    api.on(
      "select",
      update,
    );

    return () => {
      api.off(
        "select",
        update,
      );
    };
  }, [api, proofs]);

  if (!proofs.length) {
    return null;
  }

  return (
    <section className="bg-[#e8f3e8]">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[670px] text-center">
          <Pill>
            Real results
          </Pill>

          <h2 className="mt-4 text-[34px] font-bold leading-[1] tracking-[-0.05em] sm:text-[46px]">
            See people
            getting results
            with Kodarai.
          </h2>

          <p className="mx-auto mt-4 max-w-[550px] text-[14px] leading-6 text-[#59675d]">
            See what
            happened when
            people found a
            business, made
            something to
            show the owner
            and went after
            the deal.
          </p>
        </div>

        <Carousel
          setApi={
            setApi
          }
          opts={{
            align: "start",
            loop:
              proofs.length >
              1,
          }}
          plugins={
            proofs.length >
            1
              ? [
                  Autoplay({
                    delay:
                      5600,
                    stopOnInteraction:
                      true,
                    stopOnMouseEnter:
                      true,
                  }),
                ]
              : []
          }
          className="mx-auto mt-9 max-w-[1000px]"
        >
          <CarouselContent className="-ml-3">
            {proofs.map(
              (proof) => (
                <CarouselItem
                  key={
                    proof.id
                  }
                  className="basis-[92%] pl-3 sm:basis-[62%] lg:basis-1/3"
                >
                  <ProofCard
                    proof={
                      proof
                    }
                  />
                </CarouselItem>
              ),
            )}
          </CarouselContent>

          {proofs.length >
            1 && (
            <div className="mt-5 hidden justify-end gap-2 sm:flex">
              <CarouselPrevious className="static translate-y-0 border-[#ccdbcd] bg-white" />

              <CarouselNext className="static translate-y-0 border-[#ccdbcd] bg-white" />
            </div>
          )}
        </Carousel>

        {proofs.length >
          1 && (
          <CarouselDots
            count={
              proofs.length
            }
            current={
              current
            }
            onClick={(
              index,
            ) =>
              api?.scrollTo(
                index,
              )
            }
          />
        )}

        <div className="mx-auto mt-9 max-w-[500px]">
          <button
            type="button"
            onClick={() => {
              trackStartProofCtaClicked();
              onStart();
            }}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(6,83,48,0.16)] transition hover:bg-[#078549] active:scale-[0.99]"
          >
            I want to try this

            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ProofCard({
  proof,
}: {
  proof:
    PublicMarketingProof;
}) {
  const label =
    getResultLabel(
      proof.resultType,
    );

  return (
    <article className="h-full overflow-hidden rounded-[22px] border border-[#d5dfd4] bg-white shadow-[0_8px_25px_rgba(24,37,28,0.07)]">
      {proof.proofImageUrl && (
        <div className="relative aspect-[4/4.25] overflow-hidden bg-[#eef1ec]">
          <img
            src={
              proof.proofImageUrl
            }
            alt={
              proof.proofAlt ||
              `${proof.name}'s result`
            }
            loading="lazy"
            className="h-full w-full object-contain"
          />

          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#087542] shadow-sm">
            {label}
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {proof.avatarUrl ? (
              <img
                src={
                  proof.avatarUrl
                }
                alt={
                  proof.name
                }
                loading="lazy"
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e5f3e7] text-[12px] font-bold text-[#087542]">
                {proof.name.charAt(
                  0,
                )}
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-[#172019]">
                {
                  proof.name
                }
              </p>

              {proof.location && (
                <p className="text-[10px] text-[#778079]">
                  {
                    proof.location
                  }
                </p>
              )}
            </div>
          </div>

          {proof.resultAmount !=
            null && (
            <span className="shrink-0 rounded-full bg-[#e6f5e8] px-2.5 py-1.5 text-[11px] font-bold text-[#087542]">
              {formatProofAmount(
                proof.resultAmount,
                proof.currency,
              )}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-[18px] font-bold leading-[1.15] tracking-[-0.035em] text-[#172019]">
          {
            proof.headline
          }
        </h3>

        {proof.description && (
          <p className="mt-2 text-[12px] leading-5 text-[#657067]">
            {
              proof.description
            }
          </p>
        )}

        {proof.quote && (
          <div className="mt-4 rounded-xl bg-[#edf7ee] p-3">
            <p className="text-[11px] leading-[18px] text-[#3d5444]">
              “
              {
                proof.quote
              }
              ”
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#57705f]">
          <span>
            Found business
          </span>

          <ArrowRight className="size-3" />

          <span>
            Made website
          </span>

          <ArrowRight className="size-3" />

          <span>
            Got result
          </span>
        </div>
      </div>
    </article>
  );
}

function getResultLabel(
  type:
    PublicMarketingProof["resultType"],
) {
  switch (type) {
    case "client_won":
      return "Client won";

    case "payment_received":
      return "Payment received";

    case "website_sold":
      return "Website sold";

    case "positive_reply":
      return "Owner replied";

    case "recurring_client":
      return "Recurring client";

    default:
      return "Real result";
  }
}

function formatProofAmount(
  amount: number,
  currency:
    string | null,
) {
  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency:
          currency ||
          "NGN",
        maximumFractionDigits:
          0,
      },
    ).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString()}`.trim();
  }
}

function CarouselDots({
  count,
  current,
  onClick,
}: {
  count: number;
  current: number;
  onClick:
    (index: number) => void;
}) {
  const visibleCount =
    Math.min(
      count,
      8,
    );

  return (
    <div className="mt-5 flex justify-center gap-2">
      {Array.from({
        length:
          visibleCount,
      }).map(
        (
          _,
          index,
        ) => (
          <button
            key={
              index
            }
            type="button"
            onClick={() =>
              onClick(
                index,
              )
            }
            aria-label={`Go to slide ${
              index + 1
            }`}
            className={`h-2 rounded-full transition-all ${
              index ===
              current
                ? "w-5 bg-[#087542]"
                : "w-2 bg-[#abb7ae]"
            }`}
          />
        ),
      )}
    </div>
  );
}

function FinalIntroCta({
  reviews,
  onStart,
}: {
  reviews:
    PublicMarketingReview[];

  onStart:
    () => void;
}) {
  return (
    <section className="bg-[#f8f7f1]">
      <div className="mx-auto w-full max-w-[760px] px-5 py-14 text-center sm:px-8 sm:py-20">
        <Pill>
          Ready to try?
        </Pill>

        <h2 className="mt-4 text-[35px] font-bold leading-[1] tracking-[-0.05em] sm:text-[48px]">
          Your next client
          could start with
          one search.
        </h2>

        <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-6 text-[#657067]">
          Join Kodarai,
          find businesses
          that need
          websites and
          start showing
          owners what you
          can build.
        </p>

        <div className="mx-auto mt-8 grid max-w-[520px] grid-cols-3 gap-3">
          <MiniStep
            icon={
              Search
            }
            label="Find businesses"
          />

          <MiniStep
            icon={
              Laptop
            }
            label="Make websites"
          />

          <MiniStep
            icon={
              CircleDollarSign
            }
            label="Get paid"
          />
        </div>

        <button
          type="button"
          onClick={
            onStart
          }
          className="mx-auto mt-8 flex min-h-[58px] w-full max-w-[500px] items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(7,150,83,0.17)] transition hover:bg-[#078549] active:scale-[0.99]"
        >
          Show me my plan

          <ArrowRight className="size-4" />
        </button>

        <p className="mt-3 text-[11px] text-[#7a847c]">
          Plans from {FIRST_PACK_PRICE} · Pay securely with Paystack
        </p>

        {reviews.length >
          0 && (
          <p className="mt-6 text-[11px] font-medium text-[#506057]">
            {
              reviews.length
            }{" "}
            published{" "}
            {reviews.length ===
            1
              ? "review"
              : "reviews"}{" "}
            from people
            using Kodarai
          </p>
        )}
      </div>
    </section>
  );
}

function MiniStep({
  icon: Icon,
  label,
}: {
  icon:
    typeof Search;

  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e1e5df] bg-white px-2 py-4">
      <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-[#e8f5ea] text-[#07804a]">
        <Icon className="size-4.5" />
      </span>

      <p className="mt-2 text-[10px] font-semibold leading-4 text-[#36473d]">
        {label}
      </p>
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
    <main className="mx-auto min-h-[100dvh] w-full max-w-[560px] px-5 pb-10 pt-5 sm:px-7">
      <Brand />

      <div className="mt-6 flex items-center gap-4">
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
            className="h-full rounded-full bg-[#0da357] transition-all duration-300"
            style={{
              width: `${
                (step /
                  3) *
                100
              }%`,
            }}
          />
        </div>

        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5a665e]">
          {step} of 3
        </span>
      </div>

      <h1 className="mt-8 text-[34px] font-bold leading-[1] tracking-[-0.05em] sm:text-[40px]">
        {title}
      </h1>

      <p className="mt-3 text-[14px] leading-5 text-[#626c66]">
        {subtitle}
      </p>

      <div className="mt-8">
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
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-[0_3px_14px_rgba(25,35,28,0.045)] transition active:scale-[0.99] ${
        selected
          ? "border-[#139b56] bg-[#edf9ef]"
          : "border-[#e3e6e1] bg-white hover:border-[#a9d4b4]"
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-[#d8f2df] text-[#087542]"
            : "bg-[#f1f6f1] text-[#075936]"
        }`}
      >
        <Icon className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-5 text-[#111611]">
          {title}
        </span>

        <span className="mt-1 block text-[12px] leading-[18px] text-[#606a64]">
          {description}
        </span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-[#385044]" />
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
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-[0_3px_14px_rgba(25,35,28,0.045)] transition active:scale-[0.99] ${
        selected
          ? "border-[#139b56] bg-[#edf9ef]"
          : "border-[#e3e6e1] bg-white hover:border-[#a9d4b4]"
      }`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7ef] text-[#0a7f47]">
        <CircleDollarSign className="size-5" />
      </span>

      <span className="flex-1">
        <span className="block text-[20px] font-bold tracking-[-0.03em]">
          {amount}
        </span>

        <span className="text-xs text-[#727b75]">
          per month
        </span>
      </span>

      <ChevronRight className="size-5 text-[#385044]" />
    </button>
  );
}

function Result({
  answers,
  reviews,
  proofs,
  onBack,
  onStart,
}: {
  answers:
    FunnelAnswers;
  reviews:
    PublicMarketingReview[];
  proofs:
    PublicMarketingProof[];
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
    goal >=
    1_000_000
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
    <main className="mx-auto min-h-[100dvh] w-full max-w-[620px] px-5 pb-10 pt-5 sm:px-7">
      <Brand />

      <button
        type="button"
        onClick={
          onBack
        }
        aria-label="Go back"
        className="mt-5 flex size-9 items-center justify-center rounded-full text-[#1c251f] transition hover:bg-black/5"
      >
        <ArrowLeft className="size-5" />
      </button>

      <div className="mt-5">
        <Pill>
          Your plan
        </Pill>
      </div>

      <h1 className="mt-3 text-[35px] font-bold leading-[1] tracking-[-0.055em]">
        Let's work
        towards{" "}

        <span className="text-[#079653]">
          {goalLabel}
        </span>{" "}

        a month.
      </h1>

      <p className="mt-3 text-[14px] leading-5 text-[#626c66]">
        Here's one simple
        way to think about
        your target.
      </p>

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#e2e6e1] bg-white shadow-[0_5px_18px_rgba(25,35,28,0.04)]">
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

      <h2 className="mt-8 text-[20px] font-bold tracking-[-0.025em]">
        Kodarai helps you
        do the work.
      </h2>

      <div className="mt-5 space-y-5">
        <PlanStep
          number={1}
          title="Find a business"
          text="Find real businesses that need a website or need a better one."
        />

        <PlanStep
          number={2}
          title="Make something to show them"
          text="Use Kodarai to make a website sample for the business."
        />

        <PlanStep
          number={3}
          title="Show the owner"
          text="Get their contact details and show them what you made."
        />

        <PlanStep
          number={4}
          title="Agree on a price"
          text="If they want it, agree on the work and how much they will pay."
        />
      </div>

      <ResultProof
        reviews={
          reviews
        }
        proofs={
          proofs
        }
      />

      <div className="mt-8 rounded-xl border border-[#dfe5df] bg-[#fcfcf9] p-4">
        <p className="text-[12px] font-semibold text-[#24352a]">And when you choose your first KodarAI plan:</p>
        <p className="mt-1 text-[15px] font-bold text-[#079653]">Get 1 U.S. temporary number included.</p>
        <p className="mt-2 text-[11px] leading-5 text-[#687169]">Useful when you want a U.S. number as part of your outreach setup. Available once for eligible new paying users. Temporary number only. Availability and supported services may vary.</p>
      </div>

      <button
        type="button"
        onClick={
          onStart
        }
        className="mt-5 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-[#079653] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(6,83,48,0.16)] transition hover:bg-[#078549] active:scale-[0.99]"
      >
        Start finding businesses

        <ArrowRight className="size-4" />
      </button>

      <p className="mt-3 text-center text-[11px] text-[#7b827d]">
        Create your account and see plans from {FIRST_PACK_PRICE}
      </p>

      <p className="mt-5 text-[10px] leading-4 text-[#818982]">
        Earnings are not
        guaranteed. The
        numbers above are
        examples only.
        What you earn
        depends on your
        effort, pricing,
        the businesses you
        contact and the
        deals you close.
      </p>
    </main>
  );
}

function ResultProof({
  reviews,
  proofs,
}: {
  reviews:
    PublicMarketingReview[];
  proofs:
    PublicMarketingProof[];
}) {
  const review =
    reviews[0];

  const proof =
    proofs[0];

  if (
    !review &&
    !proof
  ) {
    return null;
  }

  return (
    <section className="mt-9 border-t border-[#dfe4dd] pt-8">
      <Pill>
        Real proof
      </Pill>

      <h2 className="mt-3 text-[22px] font-bold leading-[1.05] tracking-[-0.035em]">
        People are already
        doing this.
      </h2>

      <p className="mt-2 text-[12px] leading-5 text-[#68716b]">
        Find a business.
        Make something
        useful. Show the
        owner.
      </p>

      <div className="mt-5 space-y-3">
        {proof && (
          <div className="overflow-hidden rounded-2xl border border-[#dfe5df] bg-white shadow-sm">
            {proof.proofImageUrl && (
              <div className="aspect-[16/10] bg-[#f3f5f1]">
                <img
                  src={
                    proof.proofImageUrl
                  }
                  alt={
                    proof.proofAlt ||
                    `${proof.name}'s result`
                  }
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-[#172019]">
                    {
                      proof.headline
                    }
                  </p>

                  <p className="mt-1 text-[11px] text-[#68716b]">
                    {
                      proof.name
                    }
                    {proof.location
                      ? ` · ${proof.location}`
                      : ""}
                  </p>
                </div>

                {proof.resultAmount !=
                  null && (
                  <span className="shrink-0 rounded-full bg-[#e6f5e8] px-2.5 py-1 text-[11px] font-bold text-[#087542]">
                    {formatProofAmount(
                      proof.resultAmount,
                      proof.currency,
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {review && (
          <TestimonialCard
            review={
              review
            }
            compact
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#dfe5df] bg-white">
        <ProofStep
          number="01"
          label="Find"
        />

        <ProofStep
          number="02"
          label="Build"
        />

        <ProofStep
          number="03"
          label="Sell"
        />
      </div>
    </section>
  );
}

function ProofStep({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="border-r border-[#e5e9e4] px-2 py-4 text-center last:border-r-0">
      <p className="text-[9px] font-bold tracking-[0.14em] text-[#179250]">
        {number}
      </p>

      <p className="mt-1 text-[12px] font-semibold text-[#202923]">
        {label}
      </p>
    </div>
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
          Sell{" "}
          {clients}{" "}
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
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#079653] text-[12px] font-bold text-white">
        {number}
      </span>

      <div>
        <p className="text-[14px] font-bold">
          {title}
        </p>

        <p className="mt-1 text-[12px] leading-[18px] text-[#626c66]">
          {text}
        </p>
      </div>
    </div>
  );
}
