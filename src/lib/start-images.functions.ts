import { createServerFn } from "@tanstack/react-start";

const PEXELS_SEARCH_URL =
  "https://api.pexels.com/v1/search";

type PexelsPhoto = {
  id: number;
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
  photos?: PexelsPhoto[];
};

export type StartHeroImage = {
  id: string;
  url: string;
  mobileUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
};

const QUERIES = [
  "African freelancer working laptop",
  "African entrepreneur laptop",
  "African man working laptop",
  "African woman working laptop",
  "young African freelancer computer",
];

function clean(
  value?: string | null,
) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

async function searchPexels(
  query: string,
): Promise<PexelsPhoto[]> {
  const apiKey =
    process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn(
      "[KodarAI start] PEXELS_API_KEY is not configured.",
    );

    return [];
  }

  const params =
    new URLSearchParams({
      query,
      orientation: "portrait",
      size: "medium",
      per_page: "8",
    });

  const response =
    await fetch(
      `${PEXELS_SEARCH_URL}?${params.toString()}`,
      {
        headers: {
          Authorization: apiKey,
        },

        signal:
          AbortSignal.timeout(
            10_000,
          ),
      },
    );

  if (!response.ok) {
    console.error(
      `[KodarAI start] Pexels returned ${response.status}`,
    );

    return [];
  }

  const result =
    (await response.json()) as PexelsSearchResponse;

  return result.photos ?? [];
}

function toStartHeroImage(
  photo: PexelsPhoto,
): StartHeroImage {
  return {
    id: String(photo.id),

    url:
      photo.src.large2x ||
      photo.src.large ||
      photo.src.portrait ||
      photo.src.original,

    mobileUrl:
      photo.src.portrait ||
      photo.src.large ||
      photo.src.medium,

    alt:
      clean(photo.alt) ||
      "Freelancer working on a laptop",

    photographer:
      clean(
        photo.photographer,
      ),

    photographerUrl:
      photo.photographer_url,

    sourceUrl:
      photo.url,
  };
}

export const getStartHeroImage =
  createServerFn({
    method: "GET",
  }).handler(async () => {
    if (
      !process.env
        .PEXELS_API_KEY
    ) {
      return {
        image: null as StartHeroImage | null,
      };
    }

    for (
      const query of QUERIES
    ) {
      try {
        const photos =
          await searchPexels(
            query,
          );

        if (!photos.length) {
          continue;
        }

        /*
         * Do not always use the very first result.
         *
         * Pick from the first few results so the
         * campaign page can feel less repetitive.
         */
        const pool =
          photos.slice(0, 4);

        const index =
          Math.floor(
            Date.now() /
              (1000 *
                60 *
                60 *
                24),
          ) % pool.length;

        const photo =
          pool[index] ??
          pool[0];

        if (!photo) {
          continue;
        }

        return {
          image:
            toStartHeroImage(
              photo,
            ),
        };
      } catch (error) {
        console.error(
          `[KodarAI start] Pexels search failed for "${query}":`,
          error,
        );
      }
    }

    return {
      image: null as StartHeroImage | null,
    };
  });
