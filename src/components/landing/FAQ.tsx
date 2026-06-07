import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does Kodarai find businesses without a website?",
    a: "We search trusted local business data for your chosen category and location, check each business for a linked website, and flag the ones that don't have one — so you only spend time on real opportunities.",
  },
  {
    q: "Which countries does it work in?",
    a: "Kodarai works worldwide. It's especially popular with freelancers in the USA, UK, Canada, Australia, and across Africa including Nigeria. Just enter any city and country or ZIP code.",
  },
  {
    q: "How do leads work?",
    a: "Every search uses one lead. Monthly plans include a lead allowance that renews each billing cycle (60 on Starter, 250 on Pro, 800 on Agency). Prefer no subscription? Buy a one-time lead pack from $2 — those top-up leads never expire.",
  },
  {
    q: "What do the AI tools actually generate?",
    a: "For any lead you can instantly generate a detailed website-build prompt (tuned for Lovable, Framer AI, v0 and Claude) and a personalized cold-call script based on the business's details and reviews.",
  },
  {
    q: "Can I pay in my local currency?",
    a: "Yes. Global users can pay by card with Stripe, and customers in Nigeria and Africa can pay in Naira with Paystack.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts — upgrade, downgrade, or cancel your subscription whenever you like.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:py-28">
      <div className="text-center">
        <h2 className="text-2xl font-bold sm:text-4xl">Frequently asked questions</h2>
        <p className="mt-3 text-muted-foreground sm:mt-4">Everything you need to know before you start.</p>
      </div>

      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-base font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
