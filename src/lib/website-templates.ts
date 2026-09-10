import { z } from "zod";
import { type StudioFile } from "@/lib/studio-files";

export type WebsiteHeroStyle =
  | "background"
  | "split"
  | "editorial";

export type WebsiteOverlayStrength =
  | "light"
  | "medium"
  | "dark";

export type WebsiteImage = {
  id: string;
  url: string;
  largeUrl: string;
  thumbnailUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  source: "pexels";
};

export type WebsiteVisuals = {
  heroStyle: WebsiteHeroStyle;
  overlayStrength:
    WebsiteOverlayStrength;
  heroImage:
    | WebsiteImage
    | null;
  galleryImages: WebsiteImage[];
  sourceName:
    | string
    | null;
  sourceUrl:
    | string
    | null;
};

export const WEBSITE_TEMPLATE_KEYS = [
  "restaurant", "professional", "salon", "hotel", "real-estate",
  "church", "gym", "retail", "healthcare", "general",
] as const;

export type WebsiteTemplateKey = (typeof WEBSITE_TEMPLATE_KEYS)[number];

export const websiteSpecificationSchema = z.object({
  template: z.enum(WEBSITE_TEMPLATE_KEYS),
  theme: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    fontFamily: z.enum(["Inter", "Manrope", "DM Sans", "Playfair Display"]),
    borderRadius: z.enum(["soft", "square", "rounded"]),
    layoutStyle: z.enum(["editorial", "classic", "modern"]),
  }),
  seo: z.object({ title: z.string().min(1).max(90), description: z.string().min(1).max(170) }),
  hero: z.object({ headline: z.string().min(1).max(110), description: z.string().min(1).max(280), primaryCta: z.string().min(1).max(40), secondaryCta: z.string().max(40).optional() }),
  about: z.string().min(1).max(700),
  services: z.array(z.object({ title: z.string().min(1).max(70), description: z.string().max(200) })).min(2).max(6),
  testimonial: z.object({ quote: z.string().max(260), attribution: z.string().max(90) }).optional(),
}).strict();

export type WebsiteSpecification = z.infer<typeof websiteSpecificationSchema>;

export type BusinessWebsiteInput = {
  name: string;
  category?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

const templateDefaults: Record<WebsiteTemplateKey, Omit<WebsiteSpecification, "seo">> = {
  restaurant: { template: "restaurant", theme: { primaryColor: "#7c2d12", secondaryColor: "#fef3c7", accentColor: "#b45309", backgroundColor: "#fffdf8", textColor: "#23150e", fontFamily: "Playfair Display", borderRadius: "soft", layoutStyle: "editorial" }, hero: { headline: "Good food, made for your table.", description: "A welcoming local place for thoughtful food and warm service.", primaryCta: "View Menu", secondaryCta: "Get Directions" }, about: "Made for everyday meals, special occasions, and everyone who enjoys a table worth returning to.", services: [{ title: "Dine in", description: "A relaxed space for sharing good food." }, { title: "Takeaway", description: "Order ahead and enjoy your favourites wherever you are." }, { title: "Private events", description: "Contact us to plan a gathering." }] },
  professional: { template: "professional", theme: { primaryColor: "#173b63", secondaryColor: "#e8f0f7", accentColor: "#b7791f", backgroundColor: "#fbfcfe", textColor: "#172033", fontFamily: "Manrope", borderRadius: "square", layoutStyle: "classic" }, hero: { headline: "Clear advice. Practical support.", description: "A trusted local team focused on helping clients move forward with confidence.", primaryCta: "Talk to us", secondaryCta: "Our Services" }, about: "We make it easier to get the professional support you need, with clear communication at every step.", services: [{ title: "Expert guidance", description: "Thoughtful support shaped around your needs." }, { title: "Client-first service", description: "Straightforward communication from start to finish." }, { title: "Local knowledge", description: "Practical help grounded in your community." }] },
  salon: { template: "salon", theme: { primaryColor: "#6d2857", secondaryColor: "#fdf2f8", accentColor: "#c26a93", backgroundColor: "#fffafd", textColor: "#2c1727", fontFamily: "DM Sans", borderRadius: "rounded", layoutStyle: "modern" }, hero: { headline: "Feel like your best self.", description: "Personal care, thoughtful detail, and a look that feels entirely yours.", primaryCta: "Book an appointment", secondaryCta: "Explore Services" }, about: "Come in, take a breath, and leave feeling refreshed. Every appointment begins with listening.", services: [{ title: "Signature services", description: "Care tailored to your style and routine." }, { title: "Personal consultations", description: "A considered approach before every service." }, { title: "Special occasions", description: "Get ready for the moments that matter." }] },
  hotel: { template: "hotel", theme: { primaryColor: "#174f4a", secondaryColor: "#edf7f5", accentColor: "#b7873b", backgroundColor: "#fbfdfc", textColor: "#142724", fontFamily: "Playfair Display", borderRadius: "soft", layoutStyle: "editorial" }, hero: { headline: "A comfortable stay, thoughtfully prepared.", description: "A welcoming place to rest, work, and make the most of your visit.", primaryCta: "Check availability", secondaryCta: "Explore the hotel" }, about: "We focus on the details that make travel feel easy: warm hospitality, comfortable spaces, and a convenient location.", services: [{ title: "Comfortable rooms", description: "A calm place to settle in." }, { title: "Guest service", description: "Helpful support throughout your stay." }, { title: "Events & meetings", description: "Spaces for your next gathering." }] },
  "real-estate": { template: "real-estate", theme: { primaryColor: "#1e3a5f", secondaryColor: "#edf4fb", accentColor: "#bc7b2c", backgroundColor: "#fbfdff", textColor: "#172536", fontFamily: "Manrope", borderRadius: "square", layoutStyle: "classic" }, hero: { headline: "Property decisions made clearer.", description: "Local insight and practical guidance for your next move.", primaryCta: "Speak with an agent", secondaryCta: "Our Services" }, about: "Whether you are buying, selling, renting, or investing, we are here to help you make a well-informed decision.", services: [{ title: "Buying", description: "Find a property that works for you." }, { title: "Selling", description: "Present your property with confidence." }, { title: "Property advice", description: "Clear local guidance for your next step." }] },
  church: { template: "church", theme: { primaryColor: "#284f78", secondaryColor: "#edf5fb", accentColor: "#c99a3d", backgroundColor: "#fcfdff", textColor: "#1a2d43", fontFamily: "DM Sans", borderRadius: "soft", layoutStyle: "classic" }, hero: { headline: "A place to belong.", description: "Join a welcoming community of faith, worship, and service.", primaryCta: "Plan your visit", secondaryCta: "Service times" }, about: "Everyone is welcome here. Come as you are and find a community that walks together in faith.", services: [{ title: "Sunday services", description: "Worship, reflection, and community." }, { title: "Community groups", description: "Connect and grow together." }, { title: "Outreach", description: "Serving our neighbours with care." }] },
  gym: { template: "gym", theme: { primaryColor: "#263b2b", secondaryColor: "#eff5ed", accentColor: "#d86b2f", backgroundColor: "#fbfdfb", textColor: "#1c251e", fontFamily: "Manrope", borderRadius: "square", layoutStyle: "modern" }, hero: { headline: "Train with purpose.", description: "A supportive space to build strength, consistency, and confidence.", primaryCta: "Start today", secondaryCta: "Explore membership" }, about: "No matter where you are starting from, you will find the space, equipment, and encouragement to keep moving.", services: [{ title: "Open gym", description: "Train on your schedule." }, { title: "Coaching", description: "Guidance for your goals." }, { title: "Group sessions", description: "Train alongside a focused community." }] },
  retail: { template: "retail", theme: { primaryColor: "#254b68", secondaryColor: "#eef5f8", accentColor: "#d17a2b", backgroundColor: "#fcfdfd", textColor: "#182a36", fontFamily: "DM Sans", borderRadius: "soft", layoutStyle: "modern" }, hero: { headline: "Find something you will love.", description: "A considered selection, helpful service, and a friendly local shopping experience.", primaryCta: "Visit our shop", secondaryCta: "Contact us" }, about: "We bring together products people look for and service that makes every visit easy.", services: [{ title: "Curated selection", description: "Products chosen with care." }, { title: "Helpful service", description: "Ask us anything when you visit." }, { title: "Local convenience", description: "Easy to find and ready to help." }] },
  healthcare: { template: "healthcare", theme: { primaryColor: "#17646a", secondaryColor: "#ebf8f7", accentColor: "#407f9c", backgroundColor: "#fcfefe", textColor: "#153135", fontFamily: "DM Sans", borderRadius: "soft", layoutStyle: "classic" }, hero: { headline: "Care that puts people first.", description: "Compassionate local care with clear information and a welcoming team.", primaryCta: "Contact the clinic", secondaryCta: "Our Services" }, about: "We are here to make every visit feel informed, respectful, and focused on your wellbeing.", services: [{ title: "Patient care", description: "Support tailored to your needs." }, { title: "Appointments", description: "Get in touch to arrange a visit." }, { title: "Health guidance", description: "Clear information from a caring team." }] },
  general: { template: "general", theme: { primaryColor: "#315a48", secondaryColor: "#edf6f0", accentColor: "#be7a36", backgroundColor: "#fcfdfc", textColor: "#1a2920", fontFamily: "Manrope", borderRadius: "soft", layoutStyle: "modern" }, hero: { headline: "Local service, done well.", description: "A dependable business focused on the people and places it serves.", primaryCta: "Get in touch", secondaryCta: "Our Services" }, about: "We believe good service is simple: listen carefully, do quality work, and make it easy to come back.", services: [{ title: "Quality service", description: "Practical help when you need it." }, { title: "Friendly support", description: "Clear answers and a straightforward experience." }, { title: "Local focus", description: "Proud to serve our community." }] },
};

export function chooseWebsiteTemplate(category?: string | null): WebsiteTemplateKey {
  const value = (category ?? "").toLowerCase();
  if (/restaurant|food|cafe|bakery|cater|barbecue|grill|shawarma/.test(value)) return "restaurant";
  if (/hotel|lodg|resort|guest.?house|shortlet/.test(value)) return "hotel";
  if (/salon|spa|beauty|barber|hair|nail/.test(value)) return "salon";
  if (/gym|fitness|yoga|sport/.test(value)) return "gym";
  if (/real estate|property|estate|realt/.test(value)) return "real-estate";
  if (/church|ministry|mosque|relig/.test(value)) return "church";
  if (/school|college|university|academy|tutor|education/.test(value)) return "general";
  if (/clinic|hospital|medical|dental|pharmacy|health/.test(value)) return "healthcare";
  if (/shop|store|retail|boutique|fashion|clothing/.test(value)) return "retail";
  if (/law|account|consult|agency|professional|architect/.test(value)) return "professional";
  return "general";
}

export function createFallbackWebsiteSpec(business: BusinessWebsiteInput): WebsiteSpecification {
  const template = chooseWebsiteTemplate(business.category);
  const defaults = templateDefaults[template];
  const name = business.name.trim();
  const location = business.location ?? business.address ?? "your area";
  return {
    ...defaults,
    seo: {
      title: `${name} | ${business.category || "Local business"}${location ? ` in ${location}` : ""}`.slice(0, 90),
      description: `${name} is a local ${business.category || "business"}${location ? ` serving ${location}` : ""}. Contact us to learn more.`.slice(0, 170),
    },
    hero: { ...defaults.hero, headline: `${name}. ${defaults.hero.headline}` },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function whatsappHref(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

export function buildBusinessWebsiteFiles(business: BusinessWebsiteInput, spec: WebsiteSpecification): StudioFile[] {
  const name = escapeHtml(business.name);
  const category = escapeHtml(business.category || "Local business");
  const location = escapeHtml(business.location || business.address || "");
  const phone = business.phone ? escapeHtml(business.phone) : "";
  const wa = whatsappHref(business.phone);
  const rating = business.rating && business.reviewCount ? `<p class="trust">Rated ${business.rating.toFixed(1)} by ${business.reviewCount} customers</p>` : "";
  const contactRows = [
    phone ? `<a href="tel:${business.phone!.replace(/[^+\d]/g, "")}">${phone}</a>` : "",
    location ? `<span>${location}</span>` : "",
  ].filter(Boolean).join("<span class=\"dot\">•</span>");
  const serviceCards = spec.services.map((service) => `<article class="service"><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p></article>`).join("");
  const testimonial = spec.testimonial ? `<section class="quote wrap"><blockquote>“${escapeHtml(spec.testimonial.quote)}”</blockquote><p>${escapeHtml(spec.testimonial.attribution)}</p></section>` : "";
  const primaryHref = wa ?? (phone ? `tel:${business.phone!.replace(/[^+\d]/g, "")}` : "#contact");

  const index = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(spec.seo.description)}" />
  <meta property="og:title" content="${escapeHtml(spec.seo.title)}" />
  <meta property="og:description" content="${escapeHtml(spec.seo.description)}" />
  <meta property="og:type" content="website" />
  <title>${escapeHtml(spec.seo.title)}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header"><div class="wrap nav"><a class="brand" href="#home">${name}</a><button class="menu-button" aria-label="Open menu" aria-expanded="false">Menu</button><nav><a href="#about">About</a><a href="#services">Services</a><a href="#contact">Contact</a></nav></div></header>
  <main id="home">
    <section class="hero"><div class="wrap hero-grid"><div><p class="eyebrow">${category}${location ? ` · ${location}` : ""}</p><h1>${escapeHtml(spec.hero.headline)}</h1><p class="lead">${escapeHtml(spec.hero.description)}</p><div class="actions"><a class="button button-primary" href="${primaryHref}">${escapeHtml(spec.hero.primaryCta)}</a><a class="button button-secondary" href="#services">${escapeHtml(spec.hero.secondaryCta || "Our Services")}</a></div>${rating}</div><div class="hero-panel"><p>Welcome to</p><strong>${name}</strong><span>${location || category}</span></div></div></section>
    <section id="about" class="wrap split"><p class="eyebrow">About us</p><div><h2>Built around the people we serve.</h2><p>${escapeHtml(spec.about)}</p></div></section>
    <section id="services" class="services-section"><div class="wrap"><p class="eyebrow">What we offer</p><h2>Simple, thoughtful service.</h2><div class="services">${serviceCards}</div></div></section>
    ${testimonial}
    <section id="contact" class="contact"><div class="wrap contact-grid"><div><p class="eyebrow">Contact</p><h2>Let’s start a conversation.</h2><p>Get in touch with ${name} to find out more.</p></div><div class="contact-details">${contactRows || "<span>Contact us for more information.</span>"}${wa ? `<a class="button button-primary" href="${wa}" target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>` : ""}</div></div></section>
  </main>
  <footer><div class="wrap"><span>© ${new Date().getFullYear()} ${name}</span><a href="#home">Back to top ↑</a></div></footer>
  <script src="script.js"></script>
</body></html>`;

  const radius = spec.theme.borderRadius === "square" ? "4px" : spec.theme.borderRadius === "rounded" ? "22px" : "12px";
  const css = `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec.theme.fontFamily).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap');
:root{--primary:${spec.theme.primaryColor};--secondary:${spec.theme.secondaryColor};--accent:${spec.theme.accentColor};--surface:${spec.theme.backgroundColor};--ink:${spec.theme.textColor};--radius:${radius}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--surface);color:var(--ink);font-family:'${spec.theme.fontFamily}',Arial,sans-serif;line-height:1.6}.wrap{width:min(1120px,calc(100% - 40px));margin:auto}.site-header{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}.nav{height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{color:var(--ink);font-size:1.08rem;font-weight:700;text-decoration:none;letter-spacing:-.03em}.nav nav{display:flex;gap:24px}.nav nav a,footer a{color:inherit;text-decoration:none;font-size:.92rem}.menu-button{display:none;border:0;background:none;color:var(--ink);font:inherit}.hero{padding:96px 0 76px;background:var(--secondary)}.hero-grid{display:grid;grid-template-columns:1.5fr .8fr;gap:48px;align-items:center}.eyebrow{color:var(--primary);font-size:.75rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;margin:0 0 14px}.hero h1{font-size:clamp(2.6rem,6vw,5.3rem);line-height:1.02;letter-spacing:-.06em;margin:0;max-width:800px}.lead{font-size:1.12rem;max-width:620px;margin:24px 0;color:color-mix(in srgb,var(--ink) 76%,transparent)}.actions{display:flex;flex-wrap:wrap;gap:12px}.button{display:inline-flex;align-items:center;justify-content:center;padding:13px 19px;border-radius:var(--radius);font-weight:700;text-decoration:none;font-size:.92rem}.button-primary{color:white;background:var(--primary)}.button-secondary{color:var(--ink);border:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}.trust{font-size:.87rem;margin-top:22px}.hero-panel{min-height:290px;padding:34px;display:flex;flex-direction:column;justify-content:end;border-radius:var(--radius);background:var(--primary);color:white;box-shadow:18px 18px 0 color-mix(in srgb,var(--accent) 50%,transparent)}.hero-panel p{margin:0;opacity:.7}.hero-panel strong{font-size:1.8rem;line-height:1.15;margin:6px 0}.hero-panel span{opacity:.8}.split{padding:112px 0;display:grid;grid-template-columns:.7fr 1.3fr;gap:48px}.split h2,.services-section h2,.contact h2{font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.05em;line-height:1.08;margin:0 0 18px}.split p:not(.eyebrow){font-size:1.14rem;max-width:680px;margin:0}.services-section{padding:90px 0;background:#fff}.services{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}.service{padding:26px;border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);border-radius:var(--radius)}.service h3{margin:0 0 8px;font-size:1.1rem}.service p{margin:0;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:.94rem}.quote{padding:90px 0;text-align:center}.quote blockquote{font-size:clamp(1.5rem,3vw,2.4rem);line-height:1.3;letter-spacing:-.04em;max-width:850px;margin:0 auto}.quote p{color:var(--primary);font-weight:700}.contact{padding:82px 0;background:var(--primary);color:white}.contact .eyebrow{color:color-mix(in srgb,white 76%,transparent)}.contact-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:48px}.contact p{max-width:500px}.contact-details{display:flex;flex-direction:column;align-items:start;justify-content:center;gap:12px}.contact-details a:not(.button){color:white}.contact .button-primary{background:white;color:var(--primary);margin-top:8px}.dot{opacity:.55}footer{padding:28px 0;background:#101715;color:white;font-size:.85rem}footer .wrap{display:flex;justify-content:space-between;gap:16px}@media(max-width:720px){.wrap{width:min(100% - 32px,1120px)}.nav nav{display:none}.menu-button{display:block}.nav.menu-open nav{position:absolute;display:flex;flex-direction:column;align-items:flex-start;gap:12px;left:16px;right:16px;top:66px;padding:18px;background:var(--surface);border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);border-radius:var(--radius)}.hero{padding:64px 0}.hero-grid,.split,.contact-grid{grid-template-columns:1fr;gap:30px}.hero-panel{min-height:190px;box-shadow:10px 10px 0 color-mix(in srgb,var(--accent) 45%,transparent)}.split{padding:76px 0}.services{grid-template-columns:1fr}.services-section,.quote{padding:68px 0}.contact{padding:66px 0}footer .wrap{flex-direction:column}.actions .button{width:100%}}`;
  const script = `const button=document.querySelector('.menu-button');const nav=document.querySelector('.nav');button?.addEventListener('click',()=>{const open=nav.classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));});document.querySelectorAll('.nav nav a').forEach(link=>link.addEventListener('click',()=>nav.classList.remove('menu-open')));`;
  return [
    { path: "index.html", content: index, language: "html" },
    { path: "styles.css", content: css, language: "css" },
    { path: "script.js", content: script, language: "javascript" },
  ];
}
