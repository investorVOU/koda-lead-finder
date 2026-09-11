import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      {
        title: "A Simple Way to Make Money Online — Kodarai",
      },
      {
        name: "description",
        content:
          "Find businesses that need websites, make something to show them, sell it and get paid with Kodarai.",
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

type FunnelData = FunnelAnswers & {
  source: "ads";
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  created_at: string;
};

const STORAGE_KEY = "kodarai_ad_funnel";

const EXPERIENCE_OPTIONS = [
  {
    value: "beginner" as const,
    title: "I don't know how to build websites",
    description: "I just want a simple way to start making money online.",
  },
  {
    value: "learning" as const,
    title: "I'm still learning",
    description: "I know a little, but I haven't really made money from it.",
  },
  {
    value: "builder" as const,
    title: "I already build websites",
    description: "I know how to build. I need businesses to sell to.",
  },
  {
    value: "agency" as const,
    title: "I run a web design business",
    description: "I want to find more businesses that can pay me.",
  },
];

const GOAL_OPTIONS = [
  {
    value: "100000" as const,
    title: "₦100,000",
    description: "per month",
  },
  {
    value: "250000" as const,
    title: "₦250,000",
    description: "per month",
  },
  {
    value: "500000" as const,
    title: "₦500,000",
    description: "per month",
  },
  {
    value: "1000000" as const,
    title: "₦1,000,000+",
    description: "per month",
  },
];

const SITUATION_OPTIONS = [
  {
    value: "no_idea" as const,
    title: "I don't know where to start",
    description: "I need someone to show me the steps.",
  },
  {
    value: "finding_people" as const,
    title: "I don't know who to sell to",
    description: "Finding businesses that might pay me is the problem.",
  },
  {
    value: "no_sales" as const,
    title: "People don't buy from me",
    description: "I need a better way to show businesses what I can do.",
  },
  {
    value: "need_more" as const,
    title: "I just need more customers",
    description: "I already understand the business. I need more opportunities.",
  },
];

function StartPage() {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] =
    useState<FunnelAnswers>({});

  const [attribution, setAttribution] =
    useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    const values: Record<string, string> = {};

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ].forEach((key) => {
      const value = params.get(key);

      if (value) {
        values[key] = value;
      }
    });

    setAttribution(values);
  }, []);

  const saveAnswers = (
    nextAnswers: FunnelAnswers,
  ) => {
    const payload: FunnelData = {
      ...nextAnswers,

      source: "ads",

      ...attribution,

      created_at: new Date().toISOString(),
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(payload),
    );
  };

  const chooseExperience = (
    value: Experience,
  ) => {
    const next = {
      ...answers,
      experience: value,
    };

    setAnswers(next);

    window.setTimeout(() => {
      setStep(2);
    }, 100);
  };

  const chooseGoal = (value: Goal) => {
    const next = {
      ...answers,
      goal: value,
    };

    setAnswers(next);

    window.setTimeout(() => {
      setStep(3);
    }, 100);
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

    window.setTimeout(() => {
      setStep(4);
    }, 100);
  };

  const startSignup = () => {
    saveAnswers(answers);

    window.location.assign(
      "/signup?source=ads",
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f7f2] text-[#10120f]">
      <Header step={step} />

      {step >= 1 && step <= 3 && (
        <Progress step={step} />
      )}

      <main className="mx-auto w-full max-w-[720px] px-5 pb-12 sm:px-8">
        {step === 0 && (
          <Intro
            onStart={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <Question
            number="01"
            title="Which one sounds like you?"
            subtitle="Pick the closest answer. You don't need any experience to start."
            onBack={() => setStep(0)}
          >
            {EXPERIENCE_OPTIONS.map(
              (option) => (
                <Option
                  key={option.value}
                  title={option.title}
                  description={
                    option.description
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
          </Question>
        )}

        {step === 2 && (
          <Question
            number="02"
            title="How much would you like to make?"
            subtitle="Not a promise — just the monthly income you're working towards."
            onBack={() => setStep(1)}
          >
            {GOAL_OPTIONS.map(
              (option) => (
                <MoneyOption
                  key={option.value}
                  amount={option.title}
                  label={option.description}
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
          </Question>
        )}

        {step === 3 && (
          <Question
            number="03"
            title="What's the biggest problem right now?"
            subtitle="This helps us show you the easiest place to begin."
            onBack={() => setStep(2)}
          >
            {SITUATION_OPTIONS.map(
              (option) => (
                <Option
                  key={option.value}
                  title={option.title}
                  description={
                    option.description
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
          </Question>
        )}

        {step === 4 && (
          <Result
            answers={answers}
            onStart={startSignup}
            onBack={() => setStep(3)}
          />
        )}
      </main>
    </div>
  );
}

function Header({
  step,
}: {
  step: number;
}) {
  return (
    <header className="mx-auto flex w-full max-w-[720px] items-center justify-between px-5 py-6 sm:px-8">
      <a
        href="/"
        className="text-[21px] font-bold tracking-[-0.04em]"
      >
        Kodar
        <span className="text-[#087a46]">
          AI
        </span>
      </a>

      {step >= 1 && step <= 3 && (
        <span className="text-xs font-medium text-black/45">
          {step} of 3
        </span>
      )}
    </header>
  );
}

function Progress({
  step,
}: {
  step: number;
}) {
  return (
    <div className="mx-auto mb-4 w-full max-w-[720px] px-5 sm:px-8">
      <div className="h-[3px] overflow-hidden bg-black/10">
        <div
          className="h-full bg-[#087a46] transition-all duration-300"
          style={{
            width: `${(step / 3) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

function Intro({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100dvh-100px)] flex-col justify-center pb-16 pt-8 sm:pb-24">
      <p className="mb-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#087a46]">
        A simple way to earn online
      </p>

      <h1 className="max-w-[650px] text-[44px] font-bold leading-[0.98] tracking-[-0.055em] sm:text-[64px]">
        Make money helping businesses get
        online.
      </h1>

      <div className="mt-7 max-w-[590px]">
        <p className="text-[18px] leading-[1.55] text-black/65 sm:text-[20px]">
          You don't need to be a professional
          web designer.
        </p>

        <p className="mt-4 text-[18px] leading-[1.55] text-black/65 sm:text-[20px]">
          Kodarai helps you{" "}
          <strong className="font-semibold text-black">
            find businesses that need a
            website
          </strong>
          , make something to show them, and
          contact the owner.
        </p>

        <p className="mt-4 text-[18px] font-semibold leading-[1.55] text-black">
          You sell the website. You keep what
          you earn.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-9 flex min-h-[58px] w-full items-center justify-between border-y border-black bg-[#10120f] px-5 text-left text-[16px] font-semibold text-white transition hover:bg-[#087a46] sm:max-w-[420px]"
      >
        <span>Show me how it works</span>

        <ArrowRight className="size-5" />
      </button>

      <p className="mt-4 text-[13px] text-black/45">
        Free to get started · Takes about 30
        seconds
      </p>

      <div className="mt-12 border-t border-black/10 pt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/35">
          The idea is simple
        </p>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
          <SimpleStep
            number="1"
            text="Find a business"
          />

          <SimpleStep
            number="2"
            text="Make a website"
          />

          <SimpleStep
            number="3"
            text="Show the owner"
          />

          <SimpleStep
            number="4"
            text="Sell it"
          />
        </div>
      </div>
    </section>
  );
}

function SimpleStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div>
      <span className="text-[12px] font-bold text-[#087a46]">
        {number.padStart(2, "0")}
      </span>

      <p className="mt-1 text-[14px] font-semibold">
        {text}
      </p>
    </div>
  );
}

function Question({
  number,
  title,
  subtitle,
  onBack,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="pt-8 sm:pt-14">
      <button
        type="button"
        onClick={onBack}
        className="mb-9 flex items-center gap-2 text-[13px] font-medium text-black/45 transition hover:text-black"
      >
        <ArrowLeft className="size-4" />

        Back
      </button>

      <p className="text-[12px] font-bold tracking-[0.12em] text-[#087a46]">
        QUESTION {number}
      </p>

      <h1 className="mt-3 max-w-[620px] text-[36px] font-bold leading-[1.04] tracking-[-0.045em] sm:text-[48px]">
        {title}
      </h1>

      <p className="mt-4 max-w-[520px] text-[16px] leading-7 text-black/50">
        {subtitle}
      </p>

      <div className="mt-9 border-t border-black/15">
        {children}
      </div>
    </section>
  );
}

function Option({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 border-b border-black/15 py-5 text-left transition ${
        selected
          ? "text-[#087a46]"
          : "hover:text-[#087a46]"
      }`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-[#087a46] bg-[#087a46] text-white"
            : "border-black/25"
        }`}
      >
        {selected && (
          <Check className="size-3.5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold sm:text-[17px]">
          {title}
        </span>

        <span className="mt-1 block text-[13px] leading-5 text-black/45 sm:text-[14px]">
          {description}
        </span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-black/20 transition group-hover:translate-x-1 group-hover:text-[#087a46]" />
    </button>
  );
}

function MoneyOption({
  amount,
  label,
  selected,
  onClick,
}: {
  amount: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center border-b border-black/15 py-5 text-left transition ${
        selected
          ? "text-[#087a46]"
          : "hover:text-[#087a46]"
      }`}
    >
      <span className="flex-1">
        <span className="text-[27px] font-bold tracking-[-0.035em] sm:text-[30px]">
          {amount}
        </span>

        <span className="ml-2 text-[13px] font-medium text-black/40">
          {label}
        </span>
      </span>

      <ChevronRight className="size-5 text-black/20 transition group-hover:translate-x-1 group-hover:text-[#087a46]" />
    </button>
  );
}

function Result({
  answers,
  onStart,
  onBack,
}: {
  answers: FunnelAnswers;
  onStart: () => void;
  onBack: () => void;
}) {
  const goal = Number(
    answers.goal ?? "250000",
  );

  const goalLabel =
    goal >= 1_000_000
      ? "₦1,000,000+"
      : `₦${goal.toLocaleString("en-NG")}`;

  const examples = useMemo(() => {
    const lowerPrice = 50_000;
    const higherPrice = 100_000;

    return {
      lowerPrice,
      lowerClients: Math.ceil(
        goal / lowerPrice,
      ),
      higherPrice,
      higherClients: Math.ceil(
        goal / higherPrice,
      ),
    };
  }, [goal]);

  const beginner =
    answers.experience === "beginner";

  return (
    <section className="pb-12 pt-8 sm:pt-14">
      <button
        type="button"
        onClick={onBack}
        className="mb-9 flex items-center gap-2 text-[13px] font-medium text-black/45 transition hover:text-black"
      >
        <ArrowLeft className="size-4" />

        Back
      </button>

      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#087a46]">
        Your plan
      </p>

      <h1 className="mt-3 max-w-[640px] text-[38px] font-bold leading-[1.02] tracking-[-0.05em] sm:text-[54px]">
        Let's work towards{" "}
        <span className="text-[#087a46]">
          {goalLabel}
        </span>{" "}
        a month.
      </h1>

      <p className="mt-5 max-w-[560px] text-[17px] leading-7 text-black/55">
        {beginner
          ? "You don't need to know how to code before you understand the business. Start simple: find a business that needs a website, make something to show them, and offer to build it for them."
          : "You already have a head start. The goal is to find businesses that need what you can offer and give them something real to look at before asking them to pay."}
      </p>

      <div className="mt-9 border-y border-black/15 py-7">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-black/35">
          Think about it like this
        </p>

        <div className="mt-5">
          <ExampleRow
            price={examples.lowerPrice}
            clients={examples.lowerClients}
            total={
              examples.lowerPrice *
              examples.lowerClients
            }
          />

          <div className="my-4 h-px bg-black/10" />

          <ExampleRow
            price={examples.higherPrice}
            clients={examples.higherClients}
            total={
              examples.higherPrice *
              examples.higherClients
            }
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-[27px] font-bold tracking-[-0.035em]">
          Kodarai helps you do the work.
        </h2>

        <div className="mt-6 border-t border-black/15">
          <ResultStep
            number="01"
            title="Find a business"
          >
            Find real businesses that don't
            have a good website yet.
          </ResultStep>

          <ResultStep
            number="02"
            title="Make something to show them"
          >
            Use Kodarai to create a website
            sample for the business.
          </ResultStep>

          <ResultStep
            number="03"
            title="Talk to the owner"
          >
            Find their contact details and show
            them what you made.
          </ResultStep>

          <ResultStep
            number="04"
            title="Agree on a price"
          >
            If they want the website, agree on
            the work and what they'll pay you.
          </ResultStep>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-9 flex min-h-[60px] w-full items-center justify-between bg-[#10120f] px-5 text-left text-[16px] font-semibold text-white transition hover:bg-[#087a46]"
      >
        <span>Find my first business</span>

        <ArrowRight className="size-5" />
      </button>

      <p className="mt-4 text-[11px] leading-5 text-black/40">
        Earnings are not guaranteed. The
        examples above simply show how pricing
        can add up. What you earn depends on
        your effort, pricing and ability to
        find and close customers.
      </p>
    </section>
  );
}

function ExampleRow({
  price,
  clients,
  total,
}: {
  price: number;
  clients: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div>
        <p className="text-[15px] font-semibold">
          Sell {clients}{" "}
          {clients === 1
            ? "website"
            : "websites"}{" "}
          at ₦
          {price.toLocaleString("en-NG")}
        </p>

        <p className="mt-1 text-[13px] text-black/40">
          {clients} × ₦
          {price.toLocaleString("en-NG")}
        </p>
      </div>

      <p className="shrink-0 text-[20px] font-bold tracking-[-0.03em] text-[#087a46]">
        ₦{total.toLocaleString("en-NG")}
      </p>
    </div>
  );
}

function ResultStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[42px_1fr] border-b border-black/15 py-5">
      <span className="pt-0.5 text-[11px] font-bold text-[#087a46]">
        {number}
      </span>

      <div>
        <h3 className="text-[16px] font-semibold">
          {title}
        </h3>

        <p className="mt-1.5 text-[14px] leading-6 text-black/50">
          {children}
        </p>
      </div>
    </div>
  );
}
