import type {
  BusinessWebsiteInput,
  WebsiteTemplateKey,
  WebsiteVisuals,
} from "@/lib/website-templates";

const PEXELS_SEARCH_URL =
  "https://api.pexels.com/v1/search";

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color?: string | null;
  alt?: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
};

type PexelsSearchResponse = {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
};

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

function normalize(
  value?: string | null,
) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanLocation(
  value?: string | null,
) {
  const location = normalize(value);

  if (!location) {
    return "";
  }

  /*
   * Full street addresses often make image
   * search worse. Keep the query broad.
   */
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(-2)
    .join(" ");
}

function queryForTemplate(
  template: WebsiteTemplateKey,
  business: BusinessWebsiteInput,
): string[] {
  const category =
    normalize(business.category);

  const location =
    cleanLocation(
      business.location ||
        business.address,
    );

  const local = location
    ? ` ${location}`
    : "";

  switch (template) {
    case "restaurant":
      return [
        `${category || "restaurant"} food interior${local}`,
        `restaurant dining food${local}`,
        "beautiful restaurant food table",
      ];

    case "salon":
      return [
        `${category || "beauty salon"} interior${local}`,
        "modern beauty salon interior",
        "hair salon styling",
      ];

    case "hotel":
      return [
        `${category || "hotel"} exterior interior${local}`,
        "luxury hotel room interior",
        "hotel hospitality interior",
      ];

    case "real-estate":
      return [
        `modern real estate property${local}`,
        "modern house architecture",
        "luxury residential property",
      ];

    case "gym":
      return [
        `${category || "gym"} training${local}`,
        "modern gym interior fitness",
        "fitness training gym",
      ];

    case "healthcare":
      return [
        `${category || "medical clinic"} interior${local}`,
        "modern medical clinic",
        "healthcare professional clinic",
      ];

    case "church":
      return [
        `${category || "church"} worship interior${local}`,
        "church community worship",
        "modern church interior",
      ];

    case "retail":
      return [
        `${category || "retail store"} interior${local}`,
        "modern boutique store interior",
        "retail shop products",
      ];

    case "professional":
      return [
        `${category || "professional office"} workspace${local}`,
        "modern professional office",
        "business consultation office",
      ];

    default:
      return [
        `${category || "local business"} professional${local}`,
        `${category || "small business"} interior`,
        "modern local business",
      ];
  }
}

async function searchPexels(
  query: string,
  perPage = 8,
): Promise<PexelsPhoto[]> {
  const apiKey =
    process.env.PEXELS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const params =
    new URLSearchParams({
      query,
      orientation: "landscape",
      size: "medium",
      per_page: String(perPage),
    });

  const response = await fetch(
    `${PEXELS_SEARCH_URL}?${params.toString()}`,
    {
      headers: {
        Authorization: apiKey,
      },
      signal:
        AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) {
    console.error(
      `[website-images] Pexels returned ${response.status}`,
    );

    return [];
  }

  const json =
    (await response.json()) as PexelsSearchResponse;

  return json.photos ?? [];
}

function toWebsiteImage(
  photo: PexelsPhoto,
): WebsiteImage {
  return {
    id: String(photo.id),

    /*
     * Use the Pexels-hosted optimized
     * landscape image in generated sites.
     */
    url:
      photo.src.landscape ||
      photo.src.large2x ||
      photo.src.large,

    largeUrl:
      photo.src.large2x ||
      photo.src.large ||
      photo.src.landscape,

    thumbnailUrl:
      photo.src.medium ||
      photo.src.small,

    alt:
      normalize(photo.alt) ||
      "Business photography",

    photographer:
      photo.photographer,

    photographerUrl:
      photo.photographer_url,

    sourceUrl:
      photo.url,

    source: "pexels",
  };
}

function uniquePhotos(
  photos: PexelsPhoto[],
) {
  const seen =
    new Set<number>();

  return photos.filter((photo) => {
    if (seen.has(photo.id)) {
      return false;
    }

    seen.add(photo.id);
    return true;
  });
}

export async function resolveWebsiteVisuals(
  business: BusinessWebsiteInput,
  input: {
    template: WebsiteTemplateKey;
    heroStyle:
      | "background"
      | "split"
      | "editorial";
    overlayStrength:
      | "light"
      | "medium"
      | "dark";
  },
): Promise<WebsiteVisuals> {
  if (!process.env.PEXELS_API_KEY) {
    return {
      heroStyle: input.heroStyle,
      overlayStrength:
        input.overlayStrength,
      heroImage: null,
      galleryImages: [],
      sourceName: null,
      sourceUrl: null,
    };
  }

  const queries =
    queryForTemplate(
      input.template,
      business,
    );

  let photos: PexelsPhoto[] = [];

  /*
   * We intentionally search sequentially.
   * Usually the first good category query
   * gives enough photos and avoids burning
   * unnecessary API quota.
   */
  for (const query of queries) {
    try {
      const results =
        await searchPexels(query);

      photos = uniquePhotos([
        ...photos,
        ...results,
      ]);

      if (photos.length >= 5) {
        break;
      }
    } catch (error) {
      console.error(
        "[website-images] image search failed",
        error,
      );
    }
  }

  if (!photos.length) {
    return {
      heroStyle: input.heroStyle,
      overlayStrength:
        input.overlayStrength,
      heroImage: null,
      galleryImages: [],
      sourceName: null,
      sourceUrl: null,
    };
  }

  const converted =
    photos
      .slice(0, 5)
      .map(toWebsiteImage);

  return {
    heroStyle: input.heroStyle,
    overlayStrength:
      input.overlayStrength,

    heroImage:
      converted[0] ?? null,

    galleryImages:
      converted.slice(1, 4),

    sourceName: "Pexels",
    sourceUrl:
      "https://www.pexels.com/",
  };
}
