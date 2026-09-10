import { z } from "zod";

import {
  type StudioFile,
} from "@/lib/studio-files";

export const WEBSITE_TEMPLATE_KEYS = [
  "restaurant",
  "professional",
  "salon",
  "hotel",
  "real-estate",
  "church",
  "gym",
  "retail",
  "healthcare",
  "general",
] as const;

export type WebsiteTemplateKey =
  (typeof WEBSITE_TEMPLATE_KEYS)[number];

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

  thumbnailUrl: string;

  alt: string;

  photographer: string;

  photographerUrl: string;

  sourceUrl: string;

  source: "pexels";
};

export type WebsiteVisuals = {
  heroStyle:
    WebsiteHeroStyle;

  overlayStrength:
    WebsiteOverlayStrength;

  heroImage:
    | WebsiteImage
    | null;

  galleryImages:
    WebsiteImage[];

  sourceName:
    | string
    | null;

  sourceUrl:
    | string
    | null;
};

export const websiteSpecificationSchema =
  z.object({
    template:
      z.enum(
        WEBSITE_TEMPLATE_KEYS,
      ),

    theme:
      z.object({
        primaryColor:
          z.string()
            .regex(
              /^#[0-9a-fA-F]{6}$/,
            ),

        secondaryColor:
          z.string()
            .regex(
              /^#[0-9a-fA-F]{6}$/,
            ),

        accentColor:
          z.string()
            .regex(
              /^#[0-9a-fA-F]{6}$/,
            ),

        backgroundColor:
          z.string()
            .regex(
              /^#[0-9a-fA-F]{6}$/,
            ),

        textColor:
          z.string()
            .regex(
              /^#[0-9a-fA-F]{6}$/,
            ),

        fontFamily:
          z.enum([
            "Inter",
            "Manrope",
            "DM Sans",
            "Playfair Display",
          ]),

        borderRadius:
          z.enum([
            "soft",
            "square",
            "rounded",
          ]),

        layoutStyle:
          z.enum([
            "editorial",
            "classic",
            "modern",
          ]),
      }),

    visualPlan:
      z.object({
        heroStyle:
          z.enum([
            "background",
            "split",
            "editorial",
          ]),

        overlayStrength:
          z.enum([
            "light",
            "medium",
            "dark",
          ]),

        imageSearchDirection:
          z.string()
            .min(3)
            .max(180),
      }),

    seo:
      z.object({
        title:
          z.string()
            .min(1)
            .max(90),

        description:
          z.string()
            .min(1)
            .max(170),
      }),

    hero:
      z.object({
        headline:
          z.string()
            .min(1)
            .max(110),

        description:
          z.string()
            .min(1)
            .max(280),

        primaryCta:
          z.string()
            .min(1)
            .max(40),

        secondaryCta:
          z.string()
            .max(40)
            .optional(),
      }),

    about:
      z.string()
        .min(1)
        .max(700),

    services:
      z.array(
        z.object({
          title:
            z.string()
              .min(1)
              .max(70),

          description:
            z.string()
              .max(200),
        }),
      )
        .min(2)
        .max(6),

    testimonial:
      z.object({
        quote:
          z.string()
            .max(260),

        attribution:
          z.string()
            .max(90),
      })
        .optional(),
  })
    .strict();

export type WebsiteSpecification =
  z.infer<
    typeof websiteSpecificationSchema
  >;

export type ResolvedWebsiteSpecification =
  WebsiteSpecification & {
    visuals:
      WebsiteVisuals;
  };

export type BusinessWebsiteInput = {
  name: string;

  category?:
    | string
    | null;

  location?:
    | string
    | null;

  address?:
    | string
    | null;

  phone?:
    | string
    | null;

  rating?:
    | number
    | null;

  reviewCount?:
    | number
    | null;
};

type TemplateDefaults =
  Omit<
    WebsiteSpecification,
    "seo"
  >;

const templateDefaults:
  Record<
    WebsiteTemplateKey,
    TemplateDefaults
  > = {
  restaurant: {
    template:
      "restaurant",

    theme: {
      primaryColor:
        "#7B2D18",

      secondaryColor:
        "#F4EBDD",

      accentColor:
        "#C28B46",

      backgroundColor:
        "#FCF9F4",

      textColor:
        "#241A15",

      fontFamily:
        "Playfair Display",

      borderRadius:
        "soft",

      layoutStyle:
        "editorial",
    },

    visualPlan: {
      heroStyle:
        "background",

      overlayStrength:
        "dark",

      imageSearchDirection:
        "premium restaurant interior warm lighting plated food",
    },

    hero: {
      headline:
        "Good food, made for your table.",

      description:
        "A welcoming place for memorable meals, thoughtful food and warm service.",

      primaryCta:
        "Contact us",

      secondaryCta:
        "Explore",
    },

    about:
      "A welcoming local destination built around good food, thoughtful service and an experience worth returning to.",

    services: [
      {
        title:
          "Dine in",

        description:
          "A comfortable setting for everyday meals and special occasions.",
      },

      {
        title:
          "Takeaway",

        description:
          "Enjoy your favourites wherever the day takes you.",
      },

      {
        title:
          "Group dining",

        description:
          "Get in touch when planning a meal with family, friends or colleagues.",
      },
    ],
  },

  professional: {
    template:
      "professional",

    theme: {
      primaryColor:
        "#193B59",

      secondaryColor:
        "#EDF2F6",

      accentColor:
        "#B9874D",

      backgroundColor:
        "#FAFCFD",

      textColor:
        "#17212B",

      fontFamily:
        "Manrope",

      borderRadius:
        "soft",

      layoutStyle:
        "classic",
    },

    visualPlan: {
      heroStyle:
        "split",

      overlayStrength:
        "medium",

      imageSearchDirection:
        "premium professional office consultation modern workspace",
    },

    hero: {
      headline:
        "Clear support for the decisions that matter.",

      description:
        "Professional guidance delivered with clarity, care and attention to detail.",

      primaryCta:
        "Talk to us",

      secondaryCta:
        "Our services",
    },

    about:
      "Good professional service begins with listening, understanding the goal and making the next step clear.",

    services: [
      {
        title:
          "Professional guidance",

        description:
          "Straightforward support shaped around your needs.",
      },

      {
        title:
          "Personal service",

        description:
          "Clear communication throughout the process.",
      },

      {
        title:
          "Local knowledge",

        description:
          "Practical support informed by the community you operate in.",
      },
    ],
  },

  salon: {
    template:
      "salon",

    theme: {
      primaryColor:
        "#713E58",

      secondaryColor:
        "#F8EEF2",

      accentColor:
        "#C98B9D",

      backgroundColor:
        "#FFFDFE",

      textColor:
        "#271B21",

      fontFamily:
        "DM Sans",

      borderRadius:
        "rounded",

      layoutStyle:
        "modern",
    },

    visualPlan: {
      heroStyle:
        "split",

      overlayStrength:
        "light",

      imageSearchDirection:
        "luxury contemporary beauty salon interior professional styling",
    },

    hero: {
      headline:
        "Feel like your best self.",

      description:
        "Thoughtful personal care, beautiful detail and an experience designed around you.",

      primaryCta:
        "Book an appointment",

      secondaryCta:
        "Explore services",
    },

    about:
      "A considered approach to beauty and personal care, with an experience designed to feel comfortable from beginning to end.",

    services: [
      {
        title:
          "Signature care",

        description:
          "Thoughtful services tailored to your style and routine.",
      },

      {
        title:
          "Consultation",

        description:
          "A considered conversation before the service begins.",
      },

      {
        title:
          "Special occasions",

        description:
          "Professional preparation for the moments that matter.",
      },
    ],
  },

  hotel: {
    template:
      "hotel",

    theme: {
      primaryColor:
        "#193F3B",

      secondaryColor:
        "#EEF3F1",

      accentColor:
        "#B99357",

      backgroundColor:
        "#FBFCFB",

      textColor:
        "#172521",

      fontFamily:
        "Playfair Display",

      borderRadius:
        "soft",

      layoutStyle:
        "editorial",
    },

    visualPlan: {
      heroStyle:
        "background",

      overlayStrength:
        "dark",

      imageSearchDirection:
        "beautiful premium hotel exterior interior hospitality room",
    },

    hero: {
      headline:
        "A stay worth settling into.",

      description:
        "Comfortable spaces, thoughtful hospitality and an easy place to make yourself at home.",

      primaryCta:
        "Check availability",

      secondaryCta:
        "Discover more",
    },

    about:
      "A welcoming stay built around comfort, convenience and the small details that make travel feel easier.",

    services: [
      {
        title:
          "Comfortable stays",

        description:
          "Spaces designed for rest, work and time away.",
      },

      {
        title:
          "Guest support",

        description:
          "Helpful service throughout your stay.",
      },

      {
        title:
          "Meetings & gatherings",

        description:
          "Get in touch to discuss your next event or group visit.",
      },
    ],
  },

  "real-estate": {
    template:
      "real-estate",

    theme: {
      primaryColor:
        "#173653",

      secondaryColor:
        "#EEF3F7",

      accentColor:
        "#BC8750",

      backgroundColor:
        "#FBFCFD",

      textColor:
        "#18242F",

      fontFamily:
        "Manrope",

      borderRadius:
        "square",

      layoutStyle:
        "editorial",
    },

    visualPlan: {
      heroStyle:
        "editorial",

      overlayStrength:
        "medium",

      imageSearchDirection:
        "premium modern residential property architecture real estate",
    },

    hero: {
      headline:
        "Property decisions, made clearer.",

      description:
        "Practical guidance and a more considered way to approach your next property move.",

      primaryCta:
        "Speak with us",

      secondaryCta:
        "Our services",
    },

    about:
      "Whether the next move involves buying, selling, renting or investing, good property decisions begin with clear information.",

    services: [
      {
        title:
          "Buying",

        description:
          "Support when searching for the right next property.",
      },

      {
        title:
          "Selling",

        description:
          "A clear approach to presenting and marketing a property.",
      },

      {
        title:
          "Property guidance",

        description:
          "Practical support when considering your options.",
      },
    ],
  },

  church: {
    template:
      "church",

    theme: {
      primaryColor:
        "#294D70",

      secondaryColor:
        "#EEF4F8",

      accentColor:
        "#C4974B",

      backgroundColor:
        "#FCFDFE",

      textColor:
        "#192B3C",

      fontFamily:
        "DM Sans",

      borderRadius:
        "soft",

      layoutStyle:
        "classic",
    },

    visualPlan: {
      heroStyle:
        "background",

      overlayStrength:
        "dark",

      imageSearchDirection:
        "welcoming church community worship modern interior",
    },

    hero: {
      headline:
        "A place to belong.",

      description:
        "A welcoming community centred on faith, worship, connection and service.",

      primaryCta:
        "Plan your visit",

      secondaryCta:
        "Learn more",
    },

    about:
      "A community where people can connect, worship, grow and serve together.",

    services: [
      {
        title:
          "Worship",

        description:
          "Gather together for worship, reflection and community.",
      },

      {
        title:
          "Community",

        description:
          "Opportunities to connect and grow alongside others.",
      },

      {
        title:
          "Service",

        description:
          "Supporting people and communities with care.",
      },
    ],
  },

  gym: {
    template:
      "gym",

    theme: {
      primaryColor:
        "#1F3025",

      secondaryColor:
        "#EDF1EE",

      accentColor:
        "#E07132",

      backgroundColor:
        "#F9FBF9",

      textColor:
        "#18201A",

      fontFamily:
        "Manrope",

      borderRadius:
        "square",

      layoutStyle:
        "modern",
    },

    visualPlan: {
      heroStyle:
        "background",

      overlayStrength:
        "dark",

      imageSearchDirection:
        "modern premium gym interior strength fitness training",
    },

    hero: {
      headline:
        "Train with purpose.",

      description:
        "A focused place to build strength, consistency and confidence.",

      primaryCta:
        "Get started",

      secondaryCta:
        "Explore",
    },

    about:
      "Progress comes from showing up consistently. Find the space and support to keep moving forward.",

    services: [
      {
        title:
          "Open training",

        description:
          "A practical environment for focused training.",
      },

      {
        title:
          "Guidance",

        description:
          "Support for building a more structured routine.",
      },

      {
        title:
          "Community",

        description:
          "Train around people working toward their own goals.",
      },
    ],
  },

  retail: {
    template:
      "retail",

    theme: {
      primaryColor:
        "#23485C",

      secondaryColor:
        "#EEF4F6",

      accentColor:
        "#CC7E3B",

      backgroundColor:
        "#FCFDFD",

      textColor:
        "#172930",

      fontFamily:
        "DM Sans",

      borderRadius:
        "soft",

      layoutStyle:
        "modern",
    },

    visualPlan: {
      heroStyle:
        "split",

      overlayStrength:
        "light",

      imageSearchDirection:
        "premium boutique retail store interior product display",
    },

    hero: {
      headline:
        "Find something worth taking home.",

      description:
        "A considered shopping experience with helpful service and products worth discovering.",

      primaryCta:
        "Visit us",

      secondaryCta:
        "Get in touch",
    },

    about:
      "A straightforward local shopping experience built around useful products and helpful service.",

    services: [
      {
        title:
          "Curated selection",

        description:
          "Products selected with care and purpose.",
      },

      {
        title:
          "Helpful service",

        description:
          "Friendly support when you need help choosing.",
      },

      {
        title:
          "Local convenience",

        description:
          "A simpler way to shop close to home.",
      },
    ],
  },

  healthcare: {
    template:
      "healthcare",

    theme: {
      primaryColor:
        "#176268",

      secondaryColor:
        "#EBF5F4",

      accentColor:
        "#4B8297",

      backgroundColor:
        "#FCFEFE",

      textColor:
        "#183235",

      fontFamily:
        "DM Sans",

      borderRadius:
        "soft",

      layoutStyle:
        "classic",
    },

    visualPlan: {
      heroStyle:
        "split",

      overlayStrength:
        "light",

      imageSearchDirection:
        "modern clean healthcare clinic interior medical professional",
    },

    hero: {
      headline:
        "Care centred around people.",

      description:
        "A welcoming place for clear information, thoughtful support and professional care.",

      primaryCta:
        "Contact the clinic",

      secondaryCta:
        "Our services",
    },

    about:
      "A calm, respectful approach focused on making each visit easier to understand and navigate.",

    services: [
      {
        title:
          "Patient care",

        description:
          "Professional support focused on individual needs.",
      },

      {
        title:
          "Appointments",

        description:
          "Get in touch to arrange or discuss a visit.",
      },

      {
        title:
          "Clear guidance",

        description:
          "Helpful information throughout your experience.",
      },
    ],
  },

  general: {
    template:
      "general",

    theme: {
      primaryColor:
        "#315A48",

      secondaryColor:
        "#EDF4F0",

      accentColor:
        "#BE7A36",

      backgroundColor:
        "#FCFDFC",

      textColor:
        "#19281F",

      fontFamily:
        "Manrope",

      borderRadius:
        "soft",

      layoutStyle:
        "modern",
    },

    visualPlan: {
      heroStyle:
        "split",

      overlayStrength:
        "medium",

      imageSearchDirection:
        "modern professional local business interior service",
    },

    hero: {
      headline:
        "Local service, done well.",

      description:
        "Straightforward service built around quality, reliability and the people it serves.",

      primaryCta:
        "Get in touch",

      secondaryCta:
        "Our services",
    },

    about:
      "Good service should feel simple: understand what people need, communicate clearly and do the work well.",

    services: [
      {
        title:
          "Quality service",

        description:
          "Practical help centred around the job at hand.",
      },

      {
        title:
          "Friendly support",

        description:
          "Clear communication from beginning to end.",
      },

      {
        title:
          "Local focus",

        description:
          "Service designed around the surrounding community.",
      },
    ],
  },
};

export function chooseWebsiteTemplate(
  category?: string | null,
): WebsiteTemplateKey {
  const value =
    (
      category ?? ""
    ).toLowerCase();

  if (
    /restaurant|food|cafe|bakery|cater|barbecue|grill|shawarma|pizza|kitchen|eatery/.test(
      value,
    )
  ) {
    return "restaurant";
  }

  if (
    /hotel|lodg|resort|guest.?house|shortlet|apartment|hospitality/.test(
      value,
    )
  ) {
    return "hotel";
  }

  if (
    /salon|spa|beauty|barber|hair|nail|makeup|lash/.test(
      value,
    )
  ) {
    return "salon";
  }

  if (
    /gym|fitness|yoga|sport|training|crossfit/.test(
      value,
    )
  ) {
    return "gym";
  }

  if (
    /real estate|property|estate|realt|housing|realtor/.test(
      value,
    )
  ) {
    return "real-estate";
  }

  if (
    /church|ministry|mosque|relig|worship/.test(
      value,
    )
  ) {
    return "church";
  }

  if (
    /clinic|hospital|medical|dental|pharmacy|health|doctor|dentist/.test(
      value,
    )
  ) {
    return "healthcare";
  }

  if (
    /shop|store|retail|boutique|fashion|clothing|supermarket/.test(
      value,
    )
  ) {
    return "retail";
  }

  if (
    /law|account|consult|agency|professional|architect|legal|finance|insurance/.test(
      value,
    )
  ) {
    return "professional";
  }

  return "general";
}

export function createFallbackWebsiteSpec(
  business: BusinessWebsiteInput,
): WebsiteSpecification {
  const template =
    chooseWebsiteTemplate(
      business.category,
    );

  const defaults =
    templateDefaults[
      template
    ];

  const name =
    business.name.trim();

  const location =
    business.location ??
    business.address ??
    "";

  return {
    ...defaults,

    theme: {
      ...defaults.theme,
    },

    visualPlan: {
      ...defaults.visualPlan,
    },

    hero: {
      ...defaults.hero,

      headline:
        defaults.hero.headline,
    },

    services:
      defaults.services.map(
        (service) => ({
          ...service,
        }),
      ),

    seo: {
      title:
        `${name} | ${
          business.category ||
          "Local business"
        }${
          location
            ? ` in ${location}`
            : ""
        }`.slice(
          0,
          90,
        ),

      description:
        `${name} is a ${
          business.category ||
          "local business"
        }${
          location
            ? ` serving ${location}`
            : ""
        }. Find contact information and learn more.`.slice(
          0,
          170,
        ),
    },
  };
}

function escapeHtml(
  value: string,
) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        "\"":
          "&quot;",

        "'":
          "&#39;",
      })[
        character
      ] ??
      character,
  );
}

function safeUrl(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  try {
    const parsed =
      new URL(value);

    if (
      parsed.protocol !==
        "https:" &&
      parsed.protocol !==
        "http:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function whatsappHref(
  phone?: string | null,
): string | null {
  const digits =
    phone?.replace(
      /\D/g,
      "",
    ) ?? "";

  return digits.length >= 7
    ? `https://wa.me/${digits}`
    : null;
}

function telHref(
  phone?: string | null,
) {
  if (!phone) {
    return null;
  }

  const value =
    phone.replace(
      /[^+\d]/g,
      "",
    );

  return value
    ? `tel:${value}`
    : null;
}

function radiusValue(
  value:
    WebsiteSpecification[
      "theme"
    ]["borderRadius"],
) {
  if (
    value === "square"
  ) {
    return "8px";
  }

  if (
    value === "rounded"
  ) {
    return "28px";
  }

  return "18px";
}

function fontImport(
  font:
    WebsiteSpecification[
      "theme"
    ]["fontFamily"],
) {
  const family =
    font.replace(
      /\s/g,
      "+",
    );

  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
}

function imageFigure(
  image: WebsiteImage,
  className: string,
) {
  const imageUrl =
    safeUrl(image.url);

  if (!imageUrl) {
    return "";
  }

  return `
    <figure class="${className}">
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(image.alt)}"
        loading="lazy"
      />

      <figcaption class="photo-credit photo-credit--dark">
        <a
          href="${escapeHtml(safeUrl(image.sourceUrl))}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(image.photographer)} · Pexels
        </a>
      </figcaption>
    </figure>
  `;
}

function buildGallery(
  images: WebsiteImage[],
) {
  if (
    images.length < 2
  ) {
    return "";
  }

  return `
    <section class="section gallery-section">
      <div class="wrap">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">A closer look</p>

            <h2>
              An experience made to feel considered.
            </h2>
          </div>

          <p>
            Discover the atmosphere, detail and character behind the business.
          </p>
        </div>

        <div class="gallery-grid">
          ${images
            .slice(0, 4)
            .map(
              (
                image,
                index,
              ) =>
                imageFigure(
                  image,
                  `gallery-card gallery-card--${index + 1}`,
                ),
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function buildBackgroundHero(
  input: {
    name: string;

    category: string;

    location: string;

    specification:
      ResolvedWebsiteSpecification;

    primaryHref: string;

    rating: string;
  },
) {
  const {
    name,
    category,
    location,
    specification,
    primaryHref,
    rating,
  } = input;

  const image =
    specification.visuals
      .heroImage;

  const imageUrl =
    safeUrl(
      image?.url,
    );

  const style =
    imageUrl
      ? ` style="--hero-image:url('${escapeHtml(imageUrl)}')"`
      : "";

  return `
    <section class="hero hero--background"${style}>
      <div class="hero-shade"></div>

      <div class="wrap hero-background-content">
        <p class="eyebrow eyebrow--light">
          ${category}${
            location
              ? ` · ${location}`
              : ""
          }
        </p>

        <h1>
          ${escapeHtml(
            specification.hero
              .headline,
          )}
        </h1>

        <p class="hero-copy">
          ${escapeHtml(
            specification.hero
              .description,
          )}
        </p>

        <div class="hero-actions">
          <a
            class="button button--light"
            href="${escapeHtml(primaryHref)}"
          >
            ${escapeHtml(
              specification.hero
                .primaryCta,
            )}
          </a>

          ${
            specification.hero
              .secondaryCta
              ? `
                <a
                  class="button button--glass"
                  href="#services"
                >
                  ${escapeHtml(
                    specification.hero
                      .secondaryCta,
                  )}
                </a>
              `
              : ""
          }
        </div>

        ${rating}
      </div>

      ${
        image
          ? `
            <div class="photo-credit photo-credit--hero">
              <a
                href="${escapeHtml(
                  safeUrl(
                    image.sourceUrl,
                  ),
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Photo by ${escapeHtml(
                  image.photographer,
                )} · Pexels
              </a>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function buildSplitHero(
  input: {
    category: string;

    location: string;

    specification:
      ResolvedWebsiteSpecification;

    primaryHref: string;

    rating: string;
  },
) {
  const {
    category,
    location,
    specification,
    primaryHref,
    rating,
  } = input;

  const image =
    specification.visuals
      .heroImage;

  return `
    <section class="hero hero--split">
      <div class="wrap hero-split-grid">
        <div class="hero-split-copy reveal">
          <p class="eyebrow">
            ${category}${
              location
                ? ` · ${location}`
                : ""
            }
          </p>

          <h1>
            ${escapeHtml(
              specification.hero
                .headline,
            )}
          </h1>

          <p class="hero-copy">
            ${escapeHtml(
              specification.hero
                .description,
            )}
          </p>

          <div class="hero-actions">
            <a
              class="button button--primary"
              href="${escapeHtml(primaryHref)}"
            >
              ${escapeHtml(
                specification.hero
                  .primaryCta,
              )}
            </a>

            ${
              specification.hero
                .secondaryCta
                ? `
                  <a
                    class="button button--secondary"
                    href="#services"
                  >
                    ${escapeHtml(
                      specification.hero
                        .secondaryCta,
                    )}
                  </a>
                `
                : ""
            }
          </div>

          ${rating}
        </div>

        ${
          image
            ? imageFigure(
                image,
                "hero-split-image reveal",
              )
            : `
              <div class="hero-placeholder reveal">
                <span>
                  ${category}
                </span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function buildEditorialHero(
  input: {
    category: string;

    location: string;

    specification:
      ResolvedWebsiteSpecification;

    primaryHref: string;

    rating: string;
  },
) {
  const {
    category,
    location,
    specification,
    primaryHref,
    rating,
  } = input;

  const image =
    specification.visuals
      .heroImage;

  return `
    <section class="hero hero--editorial">
      <div class="wrap">
        <div class="editorial-heading reveal">
          <p class="eyebrow">
            ${category}${
              location
                ? ` · ${location}`
                : ""
            }
          </p>

          <h1>
            ${escapeHtml(
              specification.hero
                .headline,
            )}
          </h1>
        </div>

        <div class="editorial-grid">
          ${
            image
              ? imageFigure(
                  image,
                  "editorial-image reveal",
                )
              : `
                <div class="editorial-image editorial-placeholder reveal"></div>
              `
          }

          <div class="editorial-copy reveal">
            <p class="hero-copy">
              ${escapeHtml(
                specification.hero
                  .description,
              )}
            </p>

            <div class="hero-actions">
              <a
                class="button button--primary"
                href="${escapeHtml(primaryHref)}"
              >
                ${escapeHtml(
                  specification.hero
                    .primaryCta,
                )}
              </a>

              ${
                specification.hero
                  .secondaryCta
                  ? `
                    <a
                      class="text-link"
                      href="#services"
                    >
                      ${escapeHtml(
                        specification.hero
                          .secondaryCta,
                      )}
                      <span>↗</span>
                    </a>
                  `
                  : ""
              }
            </div>

            ${rating}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function buildBusinessWebsiteFiles(
  business:
    BusinessWebsiteInput,

  specification:
    ResolvedWebsiteSpecification,
): StudioFile[] {
  const name =
    escapeHtml(
      business.name,
    );

  const category =
    escapeHtml(
      business.category ||
        "Local business",
    );

  const location =
    escapeHtml(
      business.location ||
        business.address ||
        "",
    );

  const address =
    escapeHtml(
      business.address ||
        business.location ||
        "",
    );

  const phone =
    business.phone
      ? escapeHtml(
          business.phone,
        )
      : "";

  const whatsapp =
    whatsappHref(
      business.phone,
    );

  const telephone =
    telHref(
      business.phone,
    );

  const primaryHref =
    whatsapp ??
    telephone ??
    "#contact";

  const rating =
    typeof business.rating ===
        "number" &&
      typeof business.reviewCount ===
        "number" &&
      business.reviewCount > 0
      ? `
        <div class="trust-row">
          <span class="trust-star">★</span>

          <strong>
            ${business.rating.toFixed(
              1,
            )}
          </strong>

          <span>
            ${business.reviewCount.toLocaleString()} customer reviews
          </span>
        </div>
      `
      : "";

  const services =
    specification.services
      .map(
        (
          service,
          index,
        ) => `
          <article class="service-card reveal">
            <span class="service-number">
              ${String(
                index + 1,
              ).padStart(
                2,
                "0",
              )}
            </span>

            <h3>
              ${escapeHtml(
                service.title,
              )}
            </h3>

            <p>
              ${escapeHtml(
                service.description,
              )}
            </p>
          </article>
        `,
      )
      .join("");

  const visualStyle =
    specification.visuals
      ?.heroStyle ??
    specification.visualPlan
      .heroStyle;

  const hero =
    visualStyle ===
    "background"
      ? buildBackgroundHero({
          name,
          category,
          location,
          specification,
          primaryHref,
          rating,
        })
      : visualStyle ===
          "editorial"
        ? buildEditorialHero({
            category,
            location,
            specification,
            primaryHref,
            rating,
          })
        : buildSplitHero({
            category,
            location,
            specification,
            primaryHref,
            rating,
          });

  const gallery =
    buildGallery(
      specification.visuals
        ?.galleryImages ??
        [],
    );

  const testimonial =
    specification.testimonial
      ? `
        <section class="section quote-section">
          <div class="wrap">
            <blockquote class="quote reveal">
              “${escapeHtml(
                specification.testimonial
                  .quote,
              )}”

              <footer>
                ${escapeHtml(
                  specification.testimonial
                    .attribution,
                )}
              </footer>
            </blockquote>
          </div>
        </section>
      `
      : "";

  const contactItems = [
    phone
      ? `
        <a
          class="contact-item"
          href="${escapeHtml(
            telephone ?? "#",
          )}"
        >
          <span>Call</span>
          <strong>${phone}</strong>
        </a>
      `
      : "",

    address
      ? `
        <div class="contact-item">
          <span>Find us</span>
          <strong>${address}</strong>
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  const index = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <meta
    name="description"
    content="${escapeHtml(
      specification.seo
        .description,
    )}"
  />

  <meta
    property="og:title"
    content="${escapeHtml(
      specification.seo
        .title,
    )}"
  />

  <meta
    property="og:description"
    content="${escapeHtml(
      specification.seo
        .description,
    )}"
  />

  <meta
    property="og:type"
    content="website"
  />

  <title>
    ${escapeHtml(
      specification.seo
        .title,
    )}
  </title>

  <link
    rel="preconnect"
    href="https://fonts.googleapis.com"
  />

  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin
  />

  <link
    href="${fontImport(
      specification.theme
        .fontFamily,
    )}"
    rel="stylesheet"
  />

  <link
    rel="stylesheet"
    href="styles.css"
  />
</head>

<body
  class="
    template-${specification.template}
    layout-${specification.theme.layoutStyle}
  "
>
  <header class="site-header">
    <div class="wrap navigation">
      <a
        class="brand"
        href="#home"
        aria-label="${name} home"
      >
        ${name}
      </a>

      <button
        class="menu-button"
        type="button"
        aria-label="Open navigation"
        aria-expanded="false"
      >
        <span></span>
        <span></span>
      </button>

      <nav class="site-nav">
        <a href="#about">
          About
        </a>

        <a href="#services">
          Services
        </a>

        <a href="#contact">
          Contact
        </a>

        ${
          telephone
            ? `
              <a
                class="nav-cta"
                href="${escapeHtml(
                  telephone,
                )}"
              >
                Call now
              </a>
            `
            : ""
        }
      </nav>
    </div>
  </header>

  <main id="home">
    ${hero}

    <section
      id="about"
      class="section about-section"
    >
      <div class="wrap about-grid">
        <div>
          <p class="eyebrow">
            About ${name}
          </p>

          <h2 class="section-title reveal">
            A better way to experience ${category}.
          </h2>
        </div>

        <div class="about-copy reveal">
          <p>
            ${escapeHtml(
              specification.about,
            )}
          </p>

          ${
            rating
              ? rating
              : ""
          }
        </div>
      </div>
    </section>

    <section
      id="services"
      class="section services-section"
    >
      <div class="wrap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">
              What we do
            </p>

            <h2>
              Services designed around what matters.
            </h2>
          </div>
        </div>

        <div class="services-grid">
          ${services}
        </div>
      </div>
    </section>

    ${gallery}

    ${testimonial}

    <section
      id="contact"
      class="section contact-section"
    >
      <div class="wrap contact-card reveal">
        <div class="contact-copy">
          <p class="eyebrow eyebrow--light">
            Get in touch
          </p>

          <h2>
            Ready to talk?
          </h2>

          <p>
            Contact ${name} and take the next step.
          </p>

          <div class="contact-actions">
            ${
              telephone
                ? `
                  <a
                    class="button button--light"
                    href="${escapeHtml(
                      telephone,
                    )}"
                  >
                    Call ${name}
                  </a>
                `
                : ""
            }

            ${
              whatsapp
                ? `
                  <a
                    class="button button--glass"
                    href="${escapeHtml(
                      whatsapp,
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                `
                : ""
            }
          </div>
        </div>

        ${
          contactItems
            ? `
              <div class="contact-details">
                ${contactItems}
              </div>
            `
            : ""
        }
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div>
        <a
          class="brand"
          href="#home"
        >
          ${name}
        </a>

        <p>
          ${category}${
            location
              ? ` · ${location}`
              : ""
          }
        </p>
      </div>

      <div class="footer-links">
        <a href="#about">
          About
        </a>

        <a href="#services">
          Services
        </a>

        <a href="#contact">
          Contact
        </a>
      </div>

      <p class="copyright">
        © <span id="year"></span>
        ${name}
      </p>
    </div>
  </footer>

  ${
    telephone ||
    whatsapp
      ? `
        <div class="mobile-action">
          <a
            href="${escapeHtml(
              whatsapp ??
                telephone ??
                "#contact",
            )}"
            ${
              whatsapp
                ? `target="_blank" rel="noopener noreferrer"`
                : ""
            }
          >
            ${
              whatsapp
                ? "Message us"
                : "Call now"
            }
          </a>
        </div>
      `
      : ""
  }

  <script src="script.js"></script>
</body>
</html>`;

  const styles = `
:root {
  --primary:
    ${specification.theme.primaryColor};

  --secondary:
    ${specification.theme.secondaryColor};

  --accent:
    ${specification.theme.accentColor};

  --background:
    ${specification.theme.backgroundColor};

  --text:
    ${specification.theme.textColor};

  --font:
    "${specification.theme.fontFamily}",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --radius:
    ${radiusValue(
      specification.theme
        .borderRadius,
    )};

  --radius-large:
    calc(
      var(--radius) + 10px
    );

  --page:
    1180px;

  --shadow:
    0 22px 70px
    rgba(
      16,
      24,
      20,
      0.10
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

body.menu-open {
  overflow:
    hidden;
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

button,
input,
textarea {
  font:
    inherit;
}

.wrap {
  width:
    min(
      calc(100% - 40px),
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

.hero--background
  ~ .site-header {
  color:
    white;
}

.navigation {
  display:
    flex;

  min-height:
    84px;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    30px;
}

.brand {
  position:
    relative;

  z-index:
    60;

  max-width:
    340px;

  overflow:
    hidden;

  color:
    inherit;

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

  font-size:
    13px;

  font-weight:
    600;
}

.site-nav a {
  text-decoration:
    none;

  opacity:
    0.76;

  transition:
    opacity 160ms ease;
}

.site-nav a:hover {
  opacity:
    1;
}

.nav-cta {
  border:
    1px solid
    rgba(
      127,
      127,
      127,
      0.28
    );

  border-radius:
    999px;

  padding:
    10px 17px;

  opacity:
    1 !important;
}

.menu-button {
  display:
    none;

  position:
    relative;

  z-index:
    60;

  width:
    42px;

  height:
    42px;

  border:
    1px solid
    rgba(
      127,
      127,
      127,
      0.20
    );

  border-radius:
    50%;

  background:
    rgba(
      255,
      255,
      255,
      0.68
    );

  cursor:
    pointer;

  backdrop-filter:
    blur(18px);
}

.menu-button span {
  position:
    absolute;

  left:
    12px;

  width:
    17px;

  height:
    1.5px;

  border-radius:
    999px;

  background:
    currentColor;

  transition:
    transform 200ms ease,
    top 200ms ease;
}

.menu-button span:first-child {
  top:
    16px;
}

.menu-button span:last-child {
  top:
    23px;
}

body.menu-open
  .menu-button
  span:first-child {
  top:
    20px;

  transform:
    rotate(45deg);
}

body.menu-open
  .menu-button
  span:last-child {
  top:
    20px;

  transform:
    rotate(-45deg);
}

.hero {
  position:
    relative;
}

.hero h1 {
  margin:
    0;

  font-size:
    clamp(
      3.2rem,
      7.4vw,
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
      0.76
    );
}

.hero-copy {
  max-width:
    590px;

  margin:
    24px 0 0;

  color:
    color-mix(
      in srgb,
      var(--text) 69%,
      transparent
    );

  font-size:
    clamp(
      1rem,
      1.6vw,
      1.18rem
    );

  line-height:
    1.72;
}

.hero-actions {
  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    11px;

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

  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.button:hover {
  transform:
    translateY(-2px);
}

.button--primary {
  background:
    var(--primary);

  color:
    white;

  box-shadow:
    0 12px 30px
    color-mix(
      in srgb,
      var(--primary) 22%,
      transparent
    );
}

.button--secondary {
  border-color:
    color-mix(
      in srgb,
      var(--text) 14%,
      transparent
    );

  background:
    transparent;

  color:
    var(--text);
}

.button--light {
  background:
    white;

  color:
    #171717;
}

.button--glass {
  border-color:
    rgba(
      255,
      255,
      255,
      0.30
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
    blur(15px);
}

.text-link {
  display:
    inline-flex;

  align-items:
    center;

  gap:
    8px;

  padding:
    12px 4px;

  color:
    var(--text);

  font-size:
    13px;

  font-weight:
    700;

  text-decoration:
    none;
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
    28px;

  font-size:
    12px;
}

.trust-row span:last-child {
  opacity:
    0.65;
}

.trust-star {
  color:
    #E9AA38;

  font-size:
    14px;
}

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

  color:
    white;

  isolation:
    isolate;
}

.hero--background::before {
  position:
    absolute;

  z-index:
    -3;

  inset:
    0;

  background:
    var(--primary);

  background-image:
    var(--hero-image);

  background-position:
    center;

  background-size:
    cover;

  content:
    "";

  transform:
    scale(1.015);
}

.hero-shade {
  position:
    absolute;

  z-index:
    -2;

  inset:
    0;

  background:
    linear-gradient(
      180deg,
      rgba(
        7,
        10,
        8,
        0.18
      )
      8%,
      rgba(
        7,
        10,
        8,
        0.22
      )
      37%,
      rgba(
        7,
        10,
        8,
        0.79
      )
      100%
    );
}

.hero--background
  .site-header {
  color:
    white;
}

.hero-background-content {
  padding-top:
    180px;

  padding-bottom:
    clamp(
      70px,
      9vw,
      120px
    );
}

.hero-background-content h1 {
  max-width:
    970px;
}

.hero-background-content
  .hero-copy {
  color:
    rgba(
      255,
      255,
      255,
      0.78
    );
}

.hero-background-content
  .trust-row {
  color:
    white;
}

.photo-credit {
  font-size:
    9px;

  line-height:
    1.3;
}

.photo-credit a {
  color:
    inherit;

  text-decoration:
    none;
}

.photo-credit--hero {
  position:
    absolute;

  right:
    16px;

  bottom:
    12px;

  color:
    rgba(
      255,
      255,
      255,
      0.55
    );
}

.hero--split {
  padding:
    120px 0 55px;
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

.hero-split-copy {
  padding:
    70px 0;
}

.hero-split-copy h1 {
  margin-top:
    18px;

  font-size:
    clamp(
      3.4rem,
      6vw,
      6.2rem
    );
}

.hero-split-image,
.hero-placeholder {
  position:
    relative;

  min-height:
    590px;

  overflow:
    hidden;

  border-radius:
    var(--radius-large);

  background:
    var(--secondary);

  box-shadow:
    var(--shadow);
}

.hero-split-image img {
  width:
    100%;

  height:
    100%;

  min-height:
    590px;

  object-fit:
    cover;
}

.hero-placeholder {
  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    var(--secondary);

  color:
    var(--primary);

  font-size:
    clamp(
      2rem,
      5vw,
      5rem
    );

  font-weight:
    700;

  letter-spacing:
    -0.05em;
}

.photo-credit--dark {
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
      0.48
    );

  color:
    rgba(
      255,
      255,
      255,
      0.75
    );

  backdrop-filter:
    blur(9px);
}

.hero--editorial {
  padding:
    170px 0 75px;
}

.editorial-heading {
  max-width:
    1100px;
}

.editorial-heading h1 {
  margin-top:
    18px;
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
      28px,
      5vw,
      70px
    );

  margin-top:
    62px;
}

.editorial-image {
  position:
    relative;

  min-height:
    570px;

  overflow:
    hidden;

  border-radius:
    var(--radius-large);

  background:
    var(--secondary);
}

.editorial-image img {
  width:
    100%;

  height:
    100%;

  min-height:
    570px;

  object-fit:
    cover;
}

.editorial-placeholder {
  background:
    var(--secondary);
}

.editorial-copy {
  padding-bottom:
    30px;
}

.section {
  padding:
    clamp(
      78px,
      10vw,
      132px
    ) 0;
}

.section-title,
.section-heading h2 {
  margin:
    14px 0 0;

  max-width:
    740px;

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

.about-copy > p {
  margin:
    0;

  color:
    color-mix(
      in srgb,
      var(--text) 69%,
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

.section-heading {
  display:
    flex;

  align-items:
    end;

  justify-content:
    space-between;

  gap:
    50px;
}

.section-heading--wide
  > p {
  max-width:
    390px;

  margin:
    0;

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
    var(--radius-large);

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
    64px 0 0;

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
      var(--text) 61%,
      transparent
    );

  font-size:
    13px;

  line-height:
    1.7;
}

.gallery-section {
  overflow:
    hidden;
}

.gallery-grid {
  display:
    grid;

  grid-template-columns:
    minmax(
      0,
      1.15fr
    )
    minmax(
      0,
      0.85fr
    );

  grid-template-rows:
    280px 280px;

  gap:
    14px;

  margin-top:
    55px;
}

.gallery-card {
  position:
    relative;

  overflow:
    hidden;

  border-radius:
    var(--radius-large);

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

  transition:
    transform 700ms
    cubic-bezier(
      0.2,
      0.8,
      0.2,
      1
    );
}

.gallery-card:hover img {
  transform:
    scale(1.025);
}

.quote-section {
  background:
    var(--primary);

  color:
    white;
}

.quote {
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
      4.7rem
    );

  font-weight:
    500;

  line-height:
    1.08;

  letter-spacing:
    -0.05em;
}

.quote footer {
  margin-top:
    30px;

  font-size:
    12px;

  font-weight:
    600;

  letter-spacing:
    0.04em;

  opacity:
    0.65;
}

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
    minmax(
      0,
      1.25fr
    )
    minmax(
      280px,
      0.75fr
    );

  border-radius:
    calc(
      var(--radius-large) + 8px
    );

  background:
    var(--primary);

  color:
    white;
}

.contact-copy {
  padding:
    clamp(
      38px,
      7vw,
      80px
    );
}

.contact-copy h2 {
  margin:
    14px 0 0;

  font-size:
    clamp(
      3rem,
      6vw,
      6rem
    );

  font-weight:
    600;

  line-height:
    0.95;

  letter-spacing:
    -0.06em;
}

.contact-copy > p:not(
  .eyebrow
) {
  max-width:
    470px;

  margin:
    22px 0 0;

  color:
    rgba(
      255,
      255,
      255,
      0.71
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
    30px;
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

  padding:
    24px 0;

  border-bottom:
    1px solid
    rgba(
      255,
      255,
      255,
      0.14
    );

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

.contact-item strong {
  font-size:
    14px;

  line-height:
    1.5;
}

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

  padding-top:
    30px;

  border-top:
    1px solid
    color-mix(
      in srgb,
      var(--text) 10%,
      transparent
    );
}

.footer-grid p {
  margin:
    9px 0 0;

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
  color:
    color-mix(
      in srgb,
      var(--text) 65%,
      transparent
    );

  font-size:
    11px;

  font-weight:
    600;

  text-decoration:
    none;
}

.copyright {
  margin:
    0 !important;

  white-space:
    nowrap;
}

.mobile-action {
  display:
    none;
}

.reveal {
  opacity:
    0;

  transform:
    translateY(
      18px
    );

  transition:
    opacity 650ms ease,
    transform 650ms
    cubic-bezier(
      0.2,
      0.8,
      0.2,
      1
    );
}

.reveal.is-visible {
  opacity:
    1;

  transform:
    translateY(0);
}

.template-gym
  .hero--background
  h1 {
  text-transform:
    uppercase;
}

.template-restaurant
  .hero-background-content,
.template-hotel
  .hero-background-content {
  max-width:
    var(--page);
}

.template-healthcare
  .hero-split-image img {
  filter:
    saturate(
      0.86
    );
}

.template-salon
  .hero-split-grid {
  grid-template-columns:
    0.82fr 1.18fr;
}

.template-real-estate
  .editorial-image {
  min-height:
    650px;
}

@media (
  max-width: 900px
) {
  .navigation {
    min-height:
      74px;
  }

  .menu-button {
    display:
      block;
  }

  .site-nav {
    position:
      fixed;

    z-index:
      55;

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
      6px;

    padding:
      90px 28px 40px;

    background:
      color-mix(
        in srgb,
        var(--background) 95%,
        transparent
      );

    color:
      var(--text);

    opacity:
      0;

    pointer-events:
      none;

    transform:
      translateY(-12px);

    transition:
      opacity 190ms ease,
      transform 190ms ease;

    backdrop-filter:
      blur(24px);
  }

  body.menu-open
    .site-nav {
    opacity:
      1;

    pointer-events:
      auto;

    transform:
      translateY(0);
  }

  .site-nav a {
    padding:
      12px 0;

    font-size:
      clamp(
        1.8rem,
        7vw,
        3rem
      );

    font-weight:
      600;

    letter-spacing:
      -0.04em;
  }

  .nav-cta {
    margin-top:
      16px;

    border-radius:
      14px;

    padding:
      16px !important;

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
      105px;
  }

  .hero-split-grid {
    gap:
      20px;
  }

  .hero-split-copy {
    padding:
      60px 0 15px;
  }

  .hero-split-image,
  .hero-split-image img,
  .hero-placeholder {
    min-height:
      min(
        600px,
        72svh
      );
  }

  .hero--editorial {
    padding-top:
      135px;
  }

  .editorial-grid {
    margin-top:
      36px;
  }

  .editorial-copy {
    order:
      -1;
  }

  .editorial-image,
  .editorial-image img {
    min-height:
      500px;
  }

  .about-copy {
    max-width:
      620px;
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
      25px;
  }
}

@media (
  max-width: 640px
) {
  .wrap {
    width:
      min(
        calc(
          100% - 28px
        ),
        var(--page)
      );
  }

  .hero h1 {
    font-size:
      clamp(
        3.15rem,
        15vw,
        5rem
      );
  }

  .hero--background {
    min-height:
      88svh;
  }

  .hero-background-content {
    padding-top:
      135px;

    padding-bottom:
      70px;
  }

  .hero--split {
    padding-bottom:
      28px;
  }

  .hero-split-copy {
    padding-top:
      45px;
  }

  .hero-split-copy h1 {
    font-size:
      clamp(
        3.1rem,
        14vw,
        4.8rem
      );
  }

  .hero-split-image,
  .hero-split-image img,
  .hero-placeholder {
    min-height:
      460px;
  }

  .hero--editorial {
    padding-bottom:
      42px;
  }

  .editorial-image,
  .editorial-image img {
    min-height:
      450px;
  }

  .hero-actions {
    align-items:
      stretch;

    flex-direction:
      column;
  }

  .hero-actions
    .button {
    width:
      100%;
  }

  .section {
    padding:
      75px 0;
  }

  .section-title,
  .section-heading h2 {
    font-size:
      clamp(
        2.5rem,
        12vw,
        3.6rem
      );
  }

  .section-heading,
  .section-heading--wide {
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
      230px;
  }

  .service-card h3 {
    margin-top:
      50px;
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

  .gallery-card:first-child {
    min-height:
      440px;
  }

  .contact-card {
    width:
      calc(
        100% - 20px
      );

    border-radius:
      24px;
  }

  .contact-copy {
    padding:
      40px 27px;
  }

  .contact-details {
    padding:
      15px 27px 28px;
  }

  .contact-copy h2 {
    font-size:
      clamp(
        3rem,
        15vw,
        4.4rem
      );
  }

  .site-footer {
    padding-bottom:
      115px;
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

    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.16
      );

    border-radius:
      999px;

    background:
      color-mix(
        in srgb,
        var(--primary) 92%,
        transparent
      );

    box-shadow:
      0 15px 45px
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

    backdrop-filter:
      blur(20px);
  }
}

@media (
  prefers-reduced-motion:
    reduce
) {
  *,
  *::before,
  *::after {
    scroll-behavior:
      auto !important;

    transition-duration:
      0.01ms !important;

    animation-duration:
      0.01ms !important;

    animation-iteration-count:
      1 !important;
  }

  .reveal {
    opacity:
      1;

    transform:
      none;
  }
}
`;

  const script = `
const body =
  document.body;

const menuButton =
  document.querySelector(
    ".menu-button",
  );

const navigationLinks =
  document.querySelectorAll(
    ".site-nav a",
  );

if (menuButton) {
  menuButton.addEventListener(
    "click",
    () => {
      const open =
        body.classList.toggle(
          "menu-open",
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(open),
      );
    },
  );
}

navigationLinks.forEach(
  (link) => {
    link.addEventListener(
      "click",
      () => {
        body.classList.remove(
          "menu-open",
        );

        if (menuButton) {
          menuButton.setAttribute(
            "aria-expanded",
            "false",
          );
        }
      },
    );
  },
);

const year =
  document.querySelector(
    "#year",
  );

if (year) {
  year.textContent =
    String(
      new Date().getFullYear(),
    );
}

const reveals =
  document.querySelectorAll(
    ".reveal",
  );

if (
  "IntersectionObserver"
  in window
) {
  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            if (
              entry.isIntersecting
            ) {
              entry.target
                .classList
                .add(
                  "is-visible",
                );

              observer.unobserve(
                entry.target,
              );
            }
          },
        );
      },
      {
        threshold:
          0.12,

        rootMargin:
          "0px 0px -30px 0px",
      },
    );

  reveals.forEach(
    (element) =>
      observer.observe(
        element,
      ),
  );
} else {
  reveals.forEach(
    (element) =>
      element.classList.add(
        "is-visible",
      ),
  );
}
`;

  return [
    {
      path:
        "index.html",

      language:
        "html",

      content:
        index,
    },

    {
      path:
        "styles.css",

      language:
        "css",

      content:
        styles,
    },

    {
      path:
        "script.js",

      language:
        "javascript",

      content:
        script,
    },
  ];
}
