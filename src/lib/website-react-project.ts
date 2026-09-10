import type {
  StudioFile,
} from "@/lib/studio-files";

import type {
  BusinessWebsiteInput,
  ResolvedWebsiteSpecification,
} from "@/lib/website-templates";

function safePhone(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value?.trim() ??
    ""
  );
}

function telHref(
  phone:
    | string
    | null
    | undefined,
) {
  if (!phone) {
    return "";
  }

  const cleaned =
    phone.replace(
      /[^+\d]/g,
      "",
    );

  return cleaned
    ? `tel:${cleaned}`
    : "";
}

function whatsappHref(
  phone:
    | string
    | null
    | undefined,
) {
  if (!phone) {
    return "";
  }

  const digits =
    phone.replace(
      /\D/g,
      "",
    );

  return digits.length >=
    7
    ? `https://wa.me/${digits}`
    : "";
}

function radiusValue(
  radius:
    ResolvedWebsiteSpecification[
      "theme"
    ]["borderRadius"],
) {
  if (
    radius === "square"
  ) {
    return "8px";
  }

  if (
    radius === "rounded"
  ) {
    return "28px";
  }

  return "18px";
}

export function buildBusinessWebsiteFiles(
  business:
    BusinessWebsiteInput,

  specification:
    ResolvedWebsiteSpecification,
): StudioFile[] {
  const phone =
    safePhone(
      business.phone,
    );

  const siteData = {
    business: {
      name:
        business.name,

      category:
        business.category ??
        "Local business",

      location:
        business.location ??
        business.address ??
        "",

      address:
        business.address ??
        business.location ??
        "",

      phone,

      telHref:
        telHref(
          phone,
        ),

      whatsappHref:
        whatsappHref(
          phone,
        ),

      rating:
        business.rating ??
        null,

      reviewCount:
        business.reviewCount ??
        0,
    },

    template:
      specification.template,

    theme:
      specification.theme,

    visualPlan:
      specification.visualPlan,

    visuals:
      specification.visuals,

    seo:
      specification.seo,

    hero:
      specification.hero,

    about:
      specification.about,

    services:
      specification.services,

    testimonial:
      specification.testimonial ??
      null,
  };

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <meta
      name="description"
      content=${JSON.stringify(
        specification.seo
          .description,
      )}
    />

    <title>${specification.seo.title.replace(
      /</g,
      "&lt;",
    )}</title>
  </head>

  <body>
    <div id="root"></div>

    <script
      type="module"
      src="/src/main.jsx"
    ></script>
  </body>
</html>`;

  const packageJson =
    JSON.stringify(
      {
        name:
          "kodarai-business-website",

        private: true,

        version:
          "1.0.0",

        type:
          "module",

        scripts: {
          dev:
            "vite",

          build:
            "vite build",

          preview:
            "vite preview",
        },

        dependencies: {
          react:
            "^19.2.0",

          "react-dom":
            "^19.2.0",
        },

        devDependencies: {
          "@vitejs/plugin-react":
            "^5.0.4",

          vite:
            "^7.3.1",
        },
      },
      null,
      2,
    );

  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
});
`;

  const mainJsx = `import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import "./styles/global.css";

createRoot(
  document.getElementById("root"),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

  const siteJs = `export const site = ${JSON.stringify(
    siteData,
    null,
    2,
  )};
`;

  const appJsx = `import { Header } from "./components/Header.jsx";
import { Hero } from "./components/Hero.jsx";
import { About } from "./components/About.jsx";
import { Services } from "./components/Services.jsx";
import { Gallery } from "./components/Gallery.jsx";
import { Testimonial } from "./components/Testimonial.jsx";
import { Contact } from "./components/Contact.jsx";
import { Footer } from "./components/Footer.jsx";
import { MobileAction } from "./components/MobileAction.jsx";

export default function App() {
  return (
    <>
      <Header />

      <main>
        <Hero />

        <About />

        <Services />

        <Gallery />

        <Testimonial />

        <Contact />
      </main>

      <Footer />

      <MobileAction />
    </>
  );
}
`;

  const headerJsx = `import { useState } from "react";

import { site } from "../data/site.js";

export function Header() {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const closeMenu = () =>
    setMenuOpen(false);

  return (
    <header
      className={
        "site-header " +
        (
          site.visuals.heroStyle ===
          "background"
            ? "site-header--light"
            : ""
        )
      }
    >
      <div className="wrap navigation">
        <a
          className="brand"
          href="#home"
          onClick={
            closeMenu
          }
        >
          {
            site.business
              .name
          }
        </a>

        <button
          type="button"
          className={
            "menu-button " +
            (
              menuOpen
                ? "is-open"
                : ""
            )
          }
          aria-label="Toggle menu"
          aria-expanded={
            menuOpen
          }
          onClick={() =>
            setMenuOpen(
              (current) =>
                !current,
            )
          }
        >
          <span />

          <span />
        </button>

        <nav
          className={
            "site-nav " +
            (
              menuOpen
                ? "is-open"
                : ""
            )
          }
        >
          <a
            href="#about"
            onClick={
              closeMenu
            }
          >
            About
          </a>

          <a
            href="#services"
            onClick={
              closeMenu
            }
          >
            Services
          </a>

          <a
            href="#contact"
            onClick={
              closeMenu
            }
          >
            Contact
          </a>

          {
            site.business
              .telHref && (
              <a
                className="nav-cta"
                href={
                  site.business
                    .telHref
                }
              >
                Call now
              </a>
            )
          }
        </nav>
      </div>
    </header>
  );
}
`;

  const heroJsx = `import { site } from "../data/site.js";

function Rating() {
  if (
    typeof site.business.rating !==
      "number" ||
    !site.business.reviewCount
  ) {
    return null;
  }

  return (
    <div className="trust-row">
      <span className="trust-star">
        ★
      </span>

      <strong>
        {
          site.business.rating.toFixed(
            1,
          )
        }
      </strong>

      <span>
        {
          site.business.reviewCount.toLocaleString()
        }{" "}
        customer reviews
      </span>
    </div>
  );
}

function HeroActions({
  light = false,
}) {
  const primaryHref =
    site.business
      .whatsappHref ||
    site.business
      .telHref ||
    "#contact";

  return (
    <div className="hero-actions">
      <a
        className={
          light
            ? "button button--light"
            : "button button--primary"
        }
        href={
          primaryHref
        }
      >
        {
          site.hero
            .primaryCta
        }
      </a>

      {
        site.hero
          .secondaryCta && (
          <a
            className={
              light
                ? "button button--glass"
                : "button button--secondary"
            }
            href="#services"
          >
            {
              site.hero
                .secondaryCta
            }
          </a>
        )
      }
    </div>
  );
}

function HeroCredit() {
  const image =
    site.visuals
      .heroImage;

  if (!image) {
    return null;
  }

  return (
    <a
      className="hero-credit"
      href={
        image.sourceUrl
      }
      target="_blank"
      rel="noreferrer"
    >
      Photo by{" "}
      {
        image.photographer
      }{" "}
      · Pexels
    </a>
  );
}

function BackgroundHero() {
  const image =
    site.visuals
      .heroImage;

  return (
    <section
      id="home"
      className="hero hero--background"
      style={
        image
          ? {
              backgroundImage:
                \`linear-gradient(
                  rgba(9, 12, 10, 0.18),
                  rgba(9, 12, 10, 0.79)
                ),
                url("\${image.url}")\`,
            }
          : undefined
      }
    >
      <div className="wrap hero-background-content">
        <p className="eyebrow eyebrow--light">
          {
            site.business
              .category
          }

          {
            site.business
              .location &&
            \` · \${site.business.location}\`
          }
        </p>

        <h1>
          {
            site.hero
              .headline
          }
        </h1>

        <p className="hero-copy hero-copy--light">
          {
            site.hero
              .description
          }
        </p>

        <HeroActions light />

        <Rating />
      </div>

      <HeroCredit />
    </section>
  );
}

function SplitHero() {
  const image =
    site.visuals
      .heroImage;

  return (
    <section
      id="home"
      className="hero hero--split"
    >
      <div className="wrap hero-split-grid">
        <div className="hero-copy-column">
          <p className="eyebrow">
            {
              site.business
                .category
            }

            {
              site.business
                .location &&
              \` · \${site.business.location}\`
            }
          </p>

          <h1>
            {
              site.hero
                .headline
            }
          </h1>

          <p className="hero-copy">
            {
              site.hero
                .description
            }
          </p>

          <HeroActions />

          <Rating />
        </div>

        <div className="hero-media">
          {
            image ? (
              <>
                <img
                  src={
                    image.url
                  }
                  alt={
                    image.alt
                  }
                />

                <a
                  className="image-credit"
                  href={
                    image.sourceUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {
                    image.photographer
                  }{" "}
                  · Pexels
                </a>
              </>
            ) : (
              <div className="media-placeholder">
                {
                  site.business
                    .category
                }
              </div>
            )
          }
        </div>
      </div>
    </section>
  );
}

function EditorialHero() {
  const image =
    site.visuals
      .heroImage;

  return (
    <section
      id="home"
      className="hero hero--editorial"
    >
      <div className="wrap">
        <div className="editorial-heading">
          <p className="eyebrow">
            {
              site.business
                .category
            }

            {
              site.business
                .location &&
              \` · \${site.business.location}\`
            }
          </p>

          <h1>
            {
              site.hero
                .headline
            }
          </h1>
        </div>

        <div className="editorial-grid">
          <div className="editorial-media">
            {
              image ? (
                <>
                  <img
                    src={
                      image.url
                    }
                    alt={
                      image.alt
                    }
                  />

                  <a
                    className="image-credit"
                    href={
                      image.sourceUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {
                      image.photographer
                    }{" "}
                    · Pexels
                  </a>
                </>
              ) : (
                <div className="media-placeholder" />
              )
            }
          </div>

          <div className="editorial-copy">
            <p className="hero-copy">
              {
                site.hero
                  .description
              }
            </p>

            <HeroActions />

            <Rating />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Hero() {
  if (
    site.visuals.heroStyle ===
    "background"
  ) {
    return (
      <BackgroundHero />
    );
  }

  if (
    site.visuals.heroStyle ===
    "editorial"
  ) {
    return (
      <EditorialHero />
    );
  }

  return <SplitHero />;
}
`;

  const aboutJsx = `import { site } from "../data/site.js";

export function About() {
  return (
    <section
      id="about"
      className="section about-section"
    >
      <div className="wrap about-grid">
        <div>
          <p className="eyebrow">
            About{" "}
            {
              site.business
                .name
            }
          </p>

          <h2>
            A better way to experience{" "}
            {
              site.business
                .category
            }.
          </h2>
        </div>

        <div className="about-copy">
          <p>
            {
              site.about
            }
          </p>
        </div>
      </div>
    </section>
  );
}
`;

  const servicesJsx = `import { site } from "../data/site.js";

export function Services() {
  return (
    <section
      id="services"
      className="section services-section"
    >
      <div className="wrap">
        <div className="section-heading">
          <p className="eyebrow">
            What we do
          </p>

          <h2>
            Services designed around what matters.
          </h2>
        </div>

        <div className="services-grid">
          {
            site.services.map(
              (
                service,
                index,
              ) => (
                <article
                  className="service-card"
                  key={
                    service.title
                  }
                >
                  <span className="service-number">
                    {
                      String(
                        index +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )
                    }
                  </span>

                  <h3>
                    {
                      service.title
                    }
                  </h3>

                  <p>
                    {
                      service.description
                    }
                  </p>
                </article>
              ),
            )
          }
        </div>
      </div>
    </section>
  );
}
`;

  const galleryJsx = `import { site } from "../data/site.js";

export function Gallery() {
  const images =
    site.visuals
      .galleryImages ||
    [];

  if (
    images.length <
    2
  ) {
    return null;
  }

  return (
    <section className="section gallery-section">
      <div className="wrap">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">
              A closer look
            </p>

            <h2>
              Designed around the experience.
            </h2>
          </div>

          <p>
            A visual look at
            the atmosphere,
            detail and character
            of the business.
          </p>
        </div>

        <div className="gallery-grid">
          {
            images
              .slice(
                0,
                4,
              )
              .map(
                (
                  image,
                  index,
                ) => (
                  <figure
                    className={
                      "gallery-card gallery-card--" +
                      (
                        index +
                        1
                      )
                    }
                    key={
                      image.id
                    }
                  >
                    <img
                      src={
                        image.url
                      }
                      alt={
                        image.alt
                      }
                      loading="lazy"
                    />

                    <figcaption>
                      <a
                        href={
                          image.sourceUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {
                          image.photographer
                        }{" "}
                        · Pexels
                      </a>
                    </figcaption>
                  </figure>
                ),
              )
          }
        </div>
      </div>
    </section>
  );
}
`;

  const testimonialJsx = `import { site } from "../data/site.js";

export function Testimonial() {
  if (
    !site.testimonial
  ) {
    return null;
  }

  return (
    <section className="section testimonial-section">
      <div className="wrap">
        <blockquote>
          “
          {
            site.testimonial
              .quote
          }
          ”

          <footer>
            {
              site.testimonial
                .attribution
            }
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
`;

  const contactJsx = `import { site } from "../data/site.js";

export function Contact() {
  const {
    business,
  } = site;

  return (
    <section
      id="contact"
      className="section contact-section"
    >
      <div className="wrap contact-card">
        <div className="contact-main">
          <p className="eyebrow eyebrow--light">
            Get in touch
          </p>

          <h2>
            Ready to talk?
          </h2>

          <p>
            Contact{" "}
            {
              business.name
            }{" "}
            and take the next step.
          </p>

          <div className="contact-actions">
            {
              business.telHref && (
                <a
                  className="button button--light"
                  href={
                    business.telHref
                  }
                >
                  Call now
                </a>
              )
            }

            {
              business.whatsappHref && (
                <a
                  className="button button--glass"
                  href={
                    business.whatsappHref
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )
            }
          </div>
        </div>

        <div className="contact-details">
          {
            business.phone && (
              <a
                href={
                  business.telHref
                }
                className="contact-item"
              >
                <span>
                  Phone
                </span>

                <strong>
                  {
                    business.phone
                  }
                </strong>
              </a>
            )
          }

          {
            business.address && (
              <div className="contact-item">
                <span>
                  Find us
                </span>

                <strong>
                  {
                    business.address
                  }
                </strong>
              </div>
            )
          }
        </div>
      </div>
    </section>
  );
}
`;

  const footerJsx = `import { site } from "../data/site.js";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <a
            href="#home"
            className="brand"
          >
            {
              site.business
                .name
            }
          </a>

          <p>
            {
              site.business
                .category
            }

            {
              site.business
                .location &&
              \` · \${site.business.location}\`
            }
          </p>
        </div>

        <nav className="footer-links">
          <a href="#about">
            About
          </a>

          <a href="#services">
            Services
          </a>

          <a href="#contact">
            Contact
          </a>
        </nav>

        <p>
          ©{" "}
          {
            new Date().getFullYear()
          }{" "}
          {
            site.business
              .name
          }
        </p>
      </div>
    </footer>
  );
}
`;

  const mobileActionJsx = `import { site } from "../data/site.js";

export function MobileAction() {
  const href =
    site.business
      .whatsappHref ||
    site.business
      .telHref;

  if (!href) {
    return null;
  }

  return (
    <div className="mobile-action">
      <a
        href={
          href
        }
        target={
          site.business
            .whatsappHref
            ? "_blank"
            : undefined
        }
        rel={
          site.business
            .whatsappHref
            ? "noreferrer"
            : undefined
        }
      >
        {
          site.business
            .whatsappHref
            ? "Message us"
            : "Call now"
        }
      </a>
    </div>
  );
}
`;

  const css = `@import url("https://fonts.googleapis.com/css2?family=${specification.theme.fontFamily.replace(
    /\s/g,
    "+",
  )}:wght@400;500;600;700&display=swap");

:root {
  --primary: ${specification.theme.primaryColor};
  --secondary: ${specification.theme.secondaryColor};
  --accent: ${specification.theme.accentColor};
  --background: ${specification.theme.backgroundColor};
  --text: ${specification.theme.textColor};

  --font:
    "${specification.theme.fontFamily}",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --radius: ${radiusValue(
    specification.theme
      .borderRadius,
  )};

  --page:
    1180px;

  --shadow:
    0 24px 70px
    rgba(
      18,
      23,
      20,
      0.11
    );
}

* {
  box-sizing:
    border-box;
}

html {
  scroll-behavior:
    smooth;
}

body {
  margin:
    0;

  overflow-x:
    hidden;

  background:
    var(--background);

  color:
    var(--text);

  font-family:
    var(--font);

  -webkit-font-smoothing:
    antialiased;
}

body,
button,
a {
  font-family:
    var(--font);
}

img {
  display:
    block;

  max-width:
    100%;
}

a {
  color:
    inherit;
}

.wrap {
  width:
    min(
      calc(
        100% - 40px
      ),
      var(--page)
    );

  margin-inline:
    auto;
}

.site-header {
  position:
    absolute;

  z-index:
    50;

  top:
    0;

  left:
    0;

  width:
    100%;

  color:
    var(--text);
}

.site-header--light {
  color:
    white;
}

.navigation {
  display:
    flex;

  min-height:
    82px;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    30px;
}

.brand {
  max-width:
    330px;

  overflow:
    hidden;

  font-size:
    17px;

  font-weight:
    700;

  letter-spacing:
    -0.03em;

  text-decoration:
    none;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}

.site-nav {
  display:
    flex;

  align-items:
    center;

  gap:
    28px;
}

.site-nav > a {
  font-size:
    13px;

  font-weight:
    600;

  text-decoration:
    none;

  opacity:
    0.75;
}

.site-nav > a:hover {
  opacity:
    1;
}

.site-nav .nav-cta {
  border:
    1px solid
    currentColor;

  border-radius:
    999px;

  padding:
    10px 17px;

  opacity:
    1;
}

.menu-button {
  display:
    none;

  position:
    relative;

  z-index:
    65;

  width:
    44px;

  height:
    44px;

  border:
    1px solid
    rgba(
      120,
      120,
      120,
      0.22
    );

  border-radius:
    50%;

  background:
    rgba(
      255,
      255,
      255,
      0.80
    );

  color:
    #181818;
}

.menu-button span {
  position:
    absolute;

  left:
    13px;

  width:
    17px;

  height:
    1.5px;

  background:
    currentColor;

  transition:
    180ms ease;
}

.menu-button span:first-child {
  top:
    17px;
}

.menu-button span:last-child {
  top:
    24px;
}

.menu-button.is-open span:first-child {
  top:
    21px;

  transform:
    rotate(45deg);
}

.menu-button.is-open span:last-child {
  top:
    21px;

  transform:
    rotate(-45deg);
}

.hero {
  position:
    relative;
}

.hero h1 {
  margin:
    18px 0 0;

  font-size:
    clamp(
      3.2rem,
      7vw,
      7rem
    );

  font-weight:
    600;

  line-height:
    0.94;

  letter-spacing:
    -0.065em;
}

.eyebrow {
  margin:
    0;

  color:
    var(--primary);

  font-size:
    11px;

  font-weight:
    700;

  letter-spacing:
    0.12em;

  line-height:
    1.5;

  text-transform:
    uppercase;
}

.eyebrow--light {
  color:
    rgba(
      255,
      255,
      255,
      0.74
    );
}

.hero-copy {
  max-width:
    600px;

  margin:
    24px 0 0;

  color:
    color-mix(
      in srgb,
      var(--text) 68%,
      transparent
    );

  font-size:
    clamp(
      1rem,
      1.5vw,
      1.18rem
    );

  line-height:
    1.72;
}

.hero-copy--light {
  color:
    rgba(
      255,
      255,
      255,
      0.78
    );
}

.hero-actions {
  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    10px;

  margin-top:
    30px;
}

.button {
  display:
    inline-flex;

  min-height:
    48px;

  align-items:
    center;

  justify-content:
    center;

  border:
    1px solid
    transparent;

  border-radius:
    999px;

  padding:
    0 22px;

  font-size:
    13px;

  font-weight:
    700;

  text-decoration:
    none;
}

.button--primary {
  background:
    var(--primary);

  color:
    white;
}

.button--secondary {
  border-color:
    color-mix(
      in srgb,
      var(--text) 15%,
      transparent
    );

  color:
    var(--text);
}

.button--light {
  background:
    white;

  color:
    #151515;
}

.button--glass {
  border-color:
    rgba(
      255,
      255,
      255,
      0.28
    );

  background:
    rgba(
      255,
      255,
      255,
      0.10
    );

  color:
    white;

  backdrop-filter:
    blur(18px);
}

.trust-row {
  display:
    flex;

  flex-wrap:
    wrap;

  align-items:
    center;

  gap:
    6px;

  margin-top:
    27px;

  font-size:
    12px;
}

.trust-star {
  color:
    #e5aa3b;
}

.trust-row span:last-child {
  opacity:
    0.65;
}

/*
 * BACKGROUND HERO
 */

.hero--background {
  display:
    flex;

  min-height:
    min(
      840px,
      92svh
    );

  align-items:
    flex-end;

  overflow:
    hidden;

  background:
    var(--primary);

  background-position:
    center;

  background-size:
    cover;

  color:
    white;
}

.hero-background-content {
  padding:
    180px 0
    clamp(
      70px,
      10vw,
      120px
    );
}

.hero-background-content h1 {
  max-width:
    980px;
}

.hero-credit {
  position:
    absolute;

  right:
    15px;

  bottom:
    11px;

  color:
    rgba(
      255,
      255,
      255,
      0.54
    );

  font-size:
    9px;

  text-decoration:
    none;
}

/*
 * SPLIT HERO
 */

.hero--split {
  padding:
    120px 0 60px;
}

.hero-split-grid {
  display:
    grid;

  min-height:
    650px;

  grid-template-columns:
    minmax(
      0,
      0.9fr
    )
    minmax(
      0,
      1.1fr
    );

  align-items:
    center;

  gap:
    clamp(
      40px,
      7vw,
      100px
    );
}

.hero-copy-column {
  padding:
    60px 0;
}

.hero-media,
.editorial-media {
  position:
    relative;

  overflow:
    hidden;

  border-radius:
    calc(
      var(--radius) +
      10px
    );

  background:
    var(--secondary);

  box-shadow:
    var(--shadow);
}

.hero-media {
  min-height:
    590px;
}

.hero-media img {
  width:
    100%;

  height:
    590px;

  object-fit:
    cover;
}

.media-placeholder {
  display:
    flex;

  min-height:
    inherit;

  align-items:
    center;

  justify-content:
    center;

  background:
    var(--secondary);

  color:
    var(--primary);

  font-size:
    2rem;

  font-weight:
    700;
}

.image-credit {
  position:
    absolute;

  right:
    9px;

  bottom:
    8px;

  border-radius:
    999px;

  padding:
    5px 8px;

  background:
    rgba(
      0,
      0,
      0,
      0.47
    );

  color:
    rgba(
      255,
      255,
      255,
      0.74
    );

  font-size:
    9px;

  text-decoration:
    none;

  backdrop-filter:
    blur(10px);
}

/*
 * EDITORIAL HERO
 */

.hero--editorial {
  padding:
    170px 0 75px;
}

.editorial-heading {
  max-width:
    1100px;
}

.editorial-grid {
  display:
    grid;

  grid-template-columns:
    minmax(
      0,
      1.35fr
    )
    minmax(
      280px,
      0.65fr
    );

  align-items:
    end;

  gap:
    clamp(
      30px,
      5vw,
      70px
    );

  margin-top:
    60px;
}

.editorial-media {
  min-height:
    600px;
}

.editorial-media img {
  width:
    100%;

  height:
    600px;

  object-fit:
    cover;
}

.editorial-copy {
  padding-bottom:
    30px;
}

/*
 * GENERAL SECTIONS
 */

.section {
  padding:
    clamp(
      78px,
      10vw,
      132px
    ) 0;
}

.section h2 {
  margin:
    14px 0 0;

  max-width:
    760px;

  font-size:
    clamp(
      2.5rem,
      5vw,
      4.8rem
    );

  font-weight:
    600;

  line-height:
    1;

  letter-spacing:
    -0.055em;
}

.about-section {
  border-top:
    1px solid
    color-mix(
      in srgb,
      var(--text) 8%,
      transparent
    );
}

.about-grid {
  display:
    grid;

  grid-template-columns:
    minmax(
      0,
      1.1fr
    )
    minmax(
      300px,
      0.7fr
    );

  gap:
    clamp(
      50px,
      8vw,
      120px
    );
}

.about-copy {
  align-self:
    end;
}

.about-copy p {
  margin:
    0;

  color:
    color-mix(
      in srgb,
      var(--text) 68%,
      transparent
    );

  font-size:
    clamp(
      1.05rem,
      1.8vw,
      1.28rem
    );

  line-height:
    1.75;
}

.services-section {
  background:
    var(--secondary);
}

.section-heading h2 {
  margin-top:
    14px;
}

.section-heading--split {
  display:
    flex;

  align-items:
    end;

  justify-content:
    space-between;

  gap:
    50px;
}

.section-heading--split > p {
  max-width:
    390px;

  color:
    color-mix(
      in srgb,
      var(--text) 60%,
      transparent
    );

  line-height:
    1.7;
}

.services-grid {
  display:
    grid;

  grid-template-columns:
    repeat(
      3,
      minmax(
        0,
        1fr
      )
    );

  gap:
    1px;

  margin-top:
    58px;

  overflow:
    hidden;

  border:
    1px solid
    color-mix(
      in srgb,
      var(--text) 9%,
      transparent
    );

  border-radius:
    calc(
      var(--radius) +
      10px
    );

  background:
    color-mix(
      in srgb,
      var(--text) 9%,
      transparent
    );
}

.service-card {
  min-height:
    270px;

  padding:
    clamp(
      28px,
      4vw,
      42px
    );

  background:
    var(--background);
}

.service-number {
  color:
    var(--primary);

  font-size:
    10px;

  font-weight:
    700;

  letter-spacing:
    0.12em;
}

.service-card h3 {
  margin:
    62px 0 0;

  font-size:
    clamp(
      1.35rem,
      2vw,
      1.8rem
    );

  letter-spacing:
    -0.035em;
}

.service-card p {
  margin:
    13px 0 0;

  color:
    color-mix(
      in srgb,
      var(--text) 60%,
      transparent
    );

  font-size:
    13px;

  line-height:
    1.7;
}

/*
 * GALLERY
 */

.gallery-grid {
  display:
    grid;

  grid-template-columns:
    1.15fr
    0.85fr;

  grid-template-rows:
    280px
    280px;

  gap:
    14px;

  margin-top:
    55px;
}

.gallery-card {
  position:
    relative;

  margin:
    0;

  overflow:
    hidden;

  border-radius:
    calc(
      var(--radius) +
      10px
    );

  background:
    var(--secondary);
}

.gallery-card--1 {
  grid-row:
    1 / 3;
}

.gallery-card img {
  width:
    100%;

  height:
    100%;

  object-fit:
    cover;
}

.gallery-card figcaption {
  position:
    absolute;

  right:
    8px;

  bottom:
    8px;

  border-radius:
    999px;

  padding:
    5px 8px;

  background:
    rgba(
      0,
      0,
      0,
      0.45
    );

  color:
    rgba(
      255,
      255,
      255,
      0.75
    );

  font-size:
    9px;

  backdrop-filter:
    blur(10px);
}

.gallery-card figcaption a {
  text-decoration:
    none;
}

/*
 * TESTIMONIAL
 */

.testimonial-section {
  background:
    var(--primary);

  color:
    white;
}

.testimonial-section blockquote {
  max-width:
    950px;

  margin:
    0 auto;

  text-align:
    center;

  font-size:
    clamp(
      2.2rem,
      5vw,
      4.6rem
    );

  font-weight:
    500;

  line-height:
    1.08;

  letter-spacing:
    -0.05em;
}

.testimonial-section footer {
  margin-top:
    28px;

  font-size:
    12px;

  opacity:
    0.65;
}

/*
 * CONTACT
 */

.contact-section {
  padding-bottom:
    75px;
}

.contact-card {
  display:
    grid;

  overflow:
    hidden;

  grid-template-columns:
    1.2fr
    0.8fr;

  border-radius:
    calc(
      var(--radius) +
      14px
    );

  background:
    var(--primary);

  color:
    white;
}

.contact-main {
  padding:
    clamp(
      38px,
      7vw,
      80px
    );
}

.contact-main h2 {
  margin:
    14px 0 0;

  font-size:
    clamp(
      3rem,
      6vw,
      6rem
    );

  line-height:
    0.95;
}

.contact-main > p:not(
  .eyebrow
) {
  max-width:
    470px;

  color:
    rgba(
      255,
      255,
      255,
      0.72
    );

  line-height:
    1.7;
}

.contact-actions {
  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    10px;

  margin-top:
    28px;
}

.contact-details {
  display:
    flex;

  flex-direction:
    column;

  justify-content:
    center;

  border-left:
    1px solid
    rgba(
      255,
      255,
      255,
      0.15
    );

  padding:
    40px;
}

.contact-item {
  display:
    flex;

  flex-direction:
    column;

  gap:
    7px;

  border-bottom:
    1px solid
    rgba(
      255,
      255,
      255,
      0.14
    );

  padding:
    24px 0;

  color:
    white;

  text-decoration:
    none;
}

.contact-item:last-child {
  border-bottom:
    0;
}

.contact-item span {
  font-size:
    10px;

  font-weight:
    700;

  letter-spacing:
    0.11em;

  opacity:
    0.56;

  text-transform:
    uppercase;
}

/*
 * FOOTER
 */

.site-footer {
  padding:
    35px 0 55px;
}

.footer-grid {
  display:
    grid;

  grid-template-columns:
    1fr auto auto;

  align-items:
    end;

  gap:
    45px;

  border-top:
    1px solid
    color-mix(
      in srgb,
      var(--text) 10%,
      transparent
    );

  padding-top:
    30px;
}

.footer-grid p {
  margin:
    8px 0 0;

  color:
    color-mix(
      in srgb,
      var(--text) 55%,
      transparent
    );

  font-size:
    11px;
}

.footer-links {
  display:
    flex;

  gap:
    20px;
}

.footer-links a {
  font-size:
    11px;

  font-weight:
    600;

  text-decoration:
    none;
}

/*
 * MOBILE ACTION
 */

.mobile-action {
  display:
    none;
}

/*
 * RESPONSIVE
 */

@media (
  max-width: 900px
) {
  .navigation {
    min-height:
      72px;
  }

  .menu-button {
    display:
      block;
  }

  .site-nav {
    position:
      fixed;

    z-index:
      60;

    inset:
      0;

    display:
      flex;

    flex-direction:
      column;

    align-items:
      stretch;

    justify-content:
      center;

    gap:
      4px;

    padding:
      90px 28px
      40px;

    background:
      rgba(
        250,
        250,
        250,
        0.96
      );

    color:
      var(--text);

    opacity:
      0;

    pointer-events:
      none;

    transform:
      translateY(
        -10px
      );

    transition:
      180ms ease;

    backdrop-filter:
      blur(24px);
  }

  .site-nav.is-open {
    opacity:
      1;

    pointer-events:
      auto;

    transform:
      translateY(0);
  }

  .site-nav > a {
    padding:
      11px 0;

    font-size:
      clamp(
        1.8rem,
        7vw,
        3rem
      );

    letter-spacing:
      -0.04em;
  }

  .site-nav .nav-cta {
    margin-top:
      15px;

    border:
      0;

    border-radius:
      14px;

    padding:
      16px;

    background:
      var(--primary);

    color:
      white;
  }

  .hero-split-grid,
  .editorial-grid,
  .about-grid,
  .contact-card {
    grid-template-columns:
      1fr;
  }

  .hero--split {
    padding-top:
      100px;
  }

  .hero-split-grid {
    gap:
      20px;
  }

  .hero-copy-column {
    padding:
      55px 0
      20px;
  }

  .hero-media,
  .hero-media img {
    min-height:
      550px;

    height:
      550px;
  }

  .hero--editorial {
    padding-top:
      135px;
  }

  .editorial-grid {
    margin-top:
      35px;
  }

  .editorial-copy {
    order:
      -1;
  }

  .editorial-media,
  .editorial-media img {
    min-height:
      520px;

    height:
      520px;
  }

  .services-grid {
    grid-template-columns:
      1fr 1fr;
  }

  .contact-details {
    border-top:
      1px solid
      rgba(
        255,
        255,
        255,
        0.15
      );

    border-left:
      0;
  }

  .footer-grid {
    grid-template-columns:
      1fr;

    align-items:
      start;

    gap:
      24px;
  }
}

@media (
  max-width: 640px
) {
  .wrap {
    width:
      calc(
        100% - 28px
      );
  }

  .hero h1 {
    font-size:
      clamp(
        3rem,
        14vw,
        4.7rem
      );

    line-height:
      0.96;
  }

  .hero--background {
    min-height:
      88svh;
  }

  .hero-background-content {
    padding:
      140px 0
      70px;
  }

  .hero--split {
    padding:
      100px 0
      28px;
  }

  .hero-copy-column {
    padding:
      35px 0 10px;
  }

  .hero-media,
  .hero-media img {
    min-height:
      455px;

    height:
      455px;
  }

  .hero--editorial {
    padding:
      125px 0
      45px;
  }

  .editorial-media,
  .editorial-media img {
    min-height:
      440px;

    height:
      440px;
  }

  .hero-actions {
    flex-direction:
      column;
  }

  .hero-actions .button {
    width:
      100%;
  }

  .section {
    padding:
      74px 0;
  }

  .section h2 {
    font-size:
      clamp(
        2.45rem,
        12vw,
        3.55rem
      );
  }

  .section-heading--split {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .services-grid {
    grid-template-columns:
      1fr;

    margin-top:
      38px;
  }

  .service-card {
    min-height:
      225px;
  }

  .service-card h3 {
    margin-top:
      46px;
  }

  .gallery-grid {
    grid-template-columns:
      1fr;

    grid-template-rows:
      none;
  }

  .gallery-card,
  .gallery-card--1 {
    min-height:
      310px;

    grid-row:
      auto;
  }

  .gallery-card--1 {
    min-height:
      430px;
  }

  .contact-card {
    width:
      calc(
        100% - 20px
      );
  }

  .contact-main {
    padding:
      40px 27px;
  }

  .contact-main h2 {
    font-size:
      clamp(
        3rem,
        15vw,
        4.4rem
      );
  }

  .contact-details {
    padding:
      15px 27px
      28px;
  }

  .site-footer {
    padding-bottom:
      110px;
  }

  .mobile-action {
    position:
      fixed;

    z-index:
      80;

    right:
      13px;

    bottom:
      max(
        13px,
        env(
          safe-area-inset-bottom
        )
      );

    left:
      13px;

    display:
      block;
  }

  .mobile-action a {
    display:
      flex;

    min-height:
      52px;

    align-items:
      center;

    justify-content:
      center;

    border-radius:
      999px;

    background:
      var(--primary);

    box-shadow:
      0 15px 40px
      rgba(
        0,
        0,
        0,
        0.20
      );

    color:
      white;

    font-size:
      13px;

    font-weight:
      700;

    text-decoration:
      none;
  }
}
`;

  return [
    {
      path:
        "index.html",

      language:
        "html",

      content:
        indexHtml,
    },

    {
      path:
        "package.json",

      language:
        "json",

      content:
        packageJson,
    },

    {
      path:
        "vite.config.js",

      language:
        "javascript",

      content:
        viteConfig,
    },

    {
      path:
        "src/main.jsx",

      language:
        "javascript",

      content:
        mainJsx,
    },

    {
      path:
        "src/App.jsx",

      language:
        "javascript",

      content:
        appJsx,
    },

    {
      path:
        "src/data/site.js",

      language:
        "javascript",

      content:
        siteJs,
    },

    {
      path:
        "src/components/Header.jsx",

      language:
        "javascript",

      content:
        headerJsx,
    },

    {
      path:
        "src/components/Hero.jsx",

      language:
        "javascript",

      content:
        heroJsx,
    },

    {
      path:
        "src/components/About.jsx",

      language:
        "javascript",

      content:
        aboutJsx,
    },

    {
      path:
        "src/components/Services.jsx",

      language:
        "javascript",

      content:
        servicesJsx,
    },

    {
      path:
        "src/components/Gallery.jsx",

      language:
        "javascript",

      content:
        galleryJsx,
    },

    {
      path:
        "src/components/Testimonial.jsx",

      language:
        "javascript",

      content:
        testimonialJsx,
    },

    {
      path:
        "src/components/Contact.jsx",

      language:
        "javascript",

      content:
        contactJsx,
    },

    {
      path:
        "src/components/Footer.jsx",

      language:
        "javascript",

      content:
        footerJsx,
    },

    {
      path:
        "src/components/MobileAction.jsx",

      language:
        "javascript",

      content:
        mobileActionJsx,
    },

    {
      path:
        "src/styles/global.css",

      language:
        "css",

      content:
        css,
    },
  ];
}
