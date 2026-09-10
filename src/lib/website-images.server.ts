import type {
  BusinessWebsiteInput,
  WebsiteImage,
  WebsiteOverlayStrength,
  WebsiteTemplateKey,
  WebsiteVisuals,
  WebsiteHeroStyle,
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

function clean(value?: string | null) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanLocation(
  value?: string | null,
) {
  const location = clean(value);

  if (!location) {
    return "";
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(-2)
    .join(" ");
}

function defaultQueries(
  template: WebsiteTemplateKey,
  business: BusinessWebsiteInput,
) {
  const category =
    clean(business.category);

  const location =
    cleanLocation(
      business.location ||
        business.address,
    );

  const nearby = location
    ? ` ${location}`
    : "";

  switch (template) {
    case "restaurant":
      return [
        `${category || "restaurant"} food dining${nearby}`,
        "beautiful restaurant interior food",
        "premium restaurant plated food",
      ];

    case "salon":
      return [
        `${category || "beauty salon"} interior${nearby}`,
        "modern beauty salon interior",
        "professional hair salon styling",
      ];

    case "hotel":
      return [
        `${category || "hotel"} interior${nearby}`,
        "beautiful hotel room interior",
        "hotel lobby hospitality",
      ];

    case "real-estate":
      return [
        `modern property real estate${nearby}`,
        "modern residential property exterior",
        "premium house interior architecture",
      ];

    case "gym":
      return [
        `${category || "gym"} fitness${nearby}`,
        "modern gym interior training",
        "fitness strength training gym",
      ];

    case "healthcare":
      return [
        `${category || "medical clinic"} interior${nearby}`,
        "modern medical clinic interior",
        "healthcare professional clinic",
      ];

    case "church":
      return [
        `${category || "church"} worship${nearby}`,
        "church community worship interior",
        "modern church interior",
      ];

    case "retail":
      return [
        `${category || "retail store"} interior${nearby}`,
        "modern boutique retail interior",
        "premium store products display",
      ];

    case "professional":
      return [
        `${category || "professional office"}${nearby}`,
        "modern professional office meeting",
        "business consultation workspace",
      ];

    default:
      return [
        `${category || "local business"}${nearby}`,
        `${category || "small business"} professional interior`,
        "modern local business interior",
      ];
  }
}

async function searchPexels(
  query: string,
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
      per_page: "10",
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
      `[Kodarai images] Pexels returned ${response.status}`,
    );

    return [];
  }

  const result =
    (await response.json()) as PexelsSearchResponse;

  return result.photos ?? [];
}

function uniquePhotos(
  photos: PexelsPhoto[],
) {
  const used =
    new Set<number>();

  return photos.filter((photo) => {
    if (used.has(photo.id)) {
      return false;
    }

    used.add(photo.id);

    return true;
  });
}

function toWebsiteImage(
  photo: PexelsPhoto,
): WebsiteImage {
  return {
    id: String(photo.id),

    url:
      photo.src.large2x ||
      photo.src.landscape ||
      photo.src.large,

    thumbnailUrl:
      photo.src.medium ||
      photo.src.small,

    alt:
      clean(photo.alt) ||
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

export async function resolveWebsiteVisuals(
  business: BusinessWebsiteInput,
  options: {
    template: WebsiteTemplateKey;

    heroStyle: WebsiteHeroStyle;

    overlayStrength:
      WebsiteOverlayStrength;

    searchDirection?: string | null;
  },
): Promise<WebsiteVisuals> {
  const empty: WebsiteVisuals = {
    heroStyle:
      options.heroStyle,

    overlayStrength:
      options.overlayStrength,

    heroImage: null,

    galleryImages: [],

    sourceName: null,

    sourceUrl: null,
  };

  if (!process.env.PEXELS_API_KEY) {
    console.warn(
      "[Kodarai images] PEXELS_API_KEY is not configured.",
    );

    return empty;
  }

  const aiDirection =
    clean(
      options.searchDirection,
    );

  const queries = [
    ...(aiDirection
      ? [aiDirection]
      : []),

    ...defaultQueries(
      options.template,
      business,
    ),
  ];

  let photos: PexelsPhoto[] = [];

  for (const query of queries) {
    try {
      const found =
        await searchPexels(
          query,
        );

      photos = uniquePhotos([
        ...photos,
        ...found,
      ]);

      if (photos.length >= 7) {
        break;
      }
    } catch (error) {
      console.error(
        "[Kodarai images] Search failed:",
        error,
      );
    }
  }

  const images =
    photos
      .slice(0, 7)
      .map(toWebsiteImage);

  if (!images.length) {
    return empty;
  }

  return {
    heroStyle:
      options.heroStyle,

    overlayStrength:
      options.overlayStrength,

    heroImage:
      images[0] ?? null,

    galleryImages:
      images.slice(1, 5),

    sourceName:
      "Pexels",

    sourceUrl:
      "https://www.pexels.com/",
  };
}
