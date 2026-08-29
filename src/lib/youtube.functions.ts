import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const channelUrlSchema = z.object({
  url: z.string().min(1).max(500),
});

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  country: string | null;
  subscribers: number | null;
  videoCount: number;
  viewCount: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  channelId: string;
  channelTitle: string;
  views: number;
  likes: number | null;
  comments: number | null;
  duration: string | null;
}

export interface YouTubeChannelData {
  channel: YouTubeChannel;
  videos: YouTubeVideo[];
}

interface YouTubeApiChannel {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
    country?: string;
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    videoCount?: string;
  };
}

interface YouTubeApiVideo {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

function getYouTubeKey(): string {
  const key =
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_YOUTUBE_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY;

  if (!key) {
    throw new Error(
      "YouTube API key is not configured. Set YOUTUBE_API_KEY in Render.",
    );
  }

  return key;
}

/**
 * Extract a YouTube channel identifier from common URL formats.
 *
 * Supported:
 * https://www.youtube.com/channel/UC...
 * https://youtube.com/@creator
 * https://www.youtube.com/c/creator
 * https://www.youtube.com/user/creator
 * https://www.youtube.com/@creator/videos
 * @creator
 */
export function parseYouTubeChannelUrl(input: string): {
  type: "channelId" | "handle" | "custom" | "username";
  value: string;
} {
  const value = input.trim();

  if (!value) {
    throw new Error("Please enter a YouTube channel URL.");
  }

  // Direct channel ID
  const channelMatch = value.match(
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i,
  );

  if (channelMatch?.[1]) {
    return {
      type: "channelId",
      value: channelMatch[1],
    };
  }

  // @handle
  const handleMatch = value.match(
    /youtube\.com\/@([a-zA-Z0-9._-]+)/i,
  );

  if (handleMatch?.[1]) {
    return {
      type: "handle",
      value: handleMatch[1],
    };
  }

  // /c/channel-name
  const customMatch = value.match(
    /youtube\.com\/c\/([a-zA-Z0-9._-]+)/i,
  );

  if (customMatch?.[1]) {
    return {
      type: "custom",
      value: customMatch[1],
    };
  }

  // /user/channel-name
  const usernameMatch = value.match(
    /youtube\.com\/user\/([a-zA-Z0-9._-]+)/i,
  );

  if (usernameMatch?.[1]) {
    return {
      type: "username",
      value: usernameMatch[1],
    };
  }

  // Allow @handle directly
  if (value.startsWith("@")) {
    return {
      type: "handle",
      value: value.slice(1),
    };
  }

  throw new Error(
    "That doesn't look like a valid YouTube channel URL. Paste a channel URL such as youtube.com/@creator.",
  );
}

async function youtubeFetch<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const key = getYouTubeKey();

  const searchParams = new URLSearchParams({
    ...params,
    key,
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/${endpoint}?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    let message = `YouTube API error (${response.status})`;

    try {
      const json = JSON.parse(text) as {
        error?: {
          errors?: { reason?: string }[];
          message?: string;
        };
      };

      const reason = json.error?.errors?.[0]?.reason;
      const apiMessage = json.error?.message;

      if (reason === "quotaExceeded") {
        message =
          "YouTube API quota has been exceeded. Try again later.";
      } else if (reason === "keyInvalid") {
        message =
          "The Google/YouTube API key is invalid.";
      } else if (apiMessage) {
        message = apiMessage;
      }
    } catch {
      // Keep generic message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function resolveChannelId(
  parsed: ReturnType<typeof parseYouTubeChannelUrl>,
): Promise<string> {
  if (parsed.type === "channelId") {
    return parsed.value;
  }

  if (parsed.type === "handle") {
    const result = await youtubeFetch<{
      items?: YouTubeApiChannel[];
    }>("channels", {
      part: "snippet,statistics",
      forHandle: `@${parsed.value}`,
    });

    const channel = result.items?.[0];

    if (!channel?.id) {
      throw new Error(
        `Could not find a YouTube channel for @${parsed.value}.`,
      );
    }

    return channel.id;
  }

  if (parsed.type === "username") {
    const result = await youtubeFetch<{
      items?: YouTubeApiChannel[];
    }>("channels", {
      part: "snippet,statistics",
      forUsername: parsed.value,
    });

    const channel = result.items?.[0];

    if (!channel?.id) {
      throw new Error(
        `Could not find a YouTube channel for ${parsed.value}.`,
      );
    }

    return channel.id;
  }

  // /c/ custom URLs aren't directly supported by the current
  // YouTube Data API. Search for the channel instead.
  const result = await youtubeFetch<{
    items?: {
      id?: {
        channelId?: string;
      };
      snippet?: {
        channelId?: string;
        channelTitle?: string;
      };
    }[];
  }>("search", {
    part: "snippet",
    q: parsed.value,
    type: "channel",
    maxResults: "5",
  });

  const exactMatch = result.items?.find(
    (item) =>
      item.snippet?.channelTitle?.toLowerCase() ===
      parsed.value.toLowerCase(),
  );

  const channelId =
    exactMatch?.id?.channelId ||
    result.items?.[0]?.id?.channelId;

  if (!channelId) {
    throw new Error(
      `Could not find a YouTube channel for ${parsed.value}.`,
    );
  }

  return channelId;
}

function thumbnailUrl(
  thumbnails:
    | {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      }
    | undefined,
): string | null {
  return (
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    null
  );
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(
  value: string | undefined,
): number | null {
  if (!value) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Fetch channel metadata.
 */
export const getYouTubeChannel = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => channelUrlSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const parsed = parseYouTubeChannelUrl(data.url);
      const channelId = await resolveChannelId(parsed);

      const result = await youtubeFetch<{
        items?: YouTubeApiChannel[];
      }>("channels", {
        part: "snippet,statistics",
        id: channelId,
      });

      const raw = result.items?.[0];

      if (!raw) {
        return {
          error: "not_found",
          message: "YouTube channel not found.",
        } as const;
      }

      const channel: YouTubeChannel = {
        id: raw.id,
        title: raw.snippet?.title || "Untitled Channel",
        description: raw.snippet?.description || "",
        customUrl: raw.snippet?.customUrl || null,
        publishedAt: raw.snippet?.publishedAt || null,
        thumbnailUrl: thumbnailUrl(raw.snippet?.thumbnails),
        country: raw.snippet?.country || null,
        subscribers: toNullableNumber(
          raw.statistics?.subscriberCount,
        ),
        videoCount: toNumber(raw.statistics?.videoCount),
        viewCount: toNumber(raw.statistics?.viewCount),
      };

      return {
        channel,
      } as const;
    } catch (error) {
      console.error("YouTube channel fetch failed:", error);

      return {
        error: "youtube_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not fetch YouTube channel.",
      } as const;
    }
  });

/**
 * Fetch videos from a channel.
 *
 * We intentionally keep this bounded so a single analysis does
 * not burn through the YouTube API quota.
 */
export const getYouTubeChannelVideos = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      channelId: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().default(25),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const searchResult = await youtubeFetch<{
        items?: {
          id?: {
            videoId?: string;
          };
        }[];
      }>("search", {
        part: "snippet",
        channelId: data.channelId,
        type: "video",
        order: "date",
        maxResults: String(data.limit),
      });

      const videoIds = (searchResult.items ?? [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length === 0) {
        return {
          videos: [],
        } as const;
      }

      const details = await youtubeFetch<{
        items?: YouTubeApiVideo[];
      }>("videos", {
        part: "snippet,statistics,contentDetails",
        id: videoIds.join(","),
      });

      const videos: YouTubeVideo[] = (details.items ?? []).map(
        (video) => ({
          id: video.id,
          title: video.snippet?.title || "Untitled Video",
          description: video.snippet?.description || "",
          publishedAt: video.snippet?.publishedAt || null,
          thumbnailUrl: thumbnailUrl(
            video.snippet?.thumbnails,
          ),
          channelId:
            video.snippet?.channelId || data.channelId,
          channelTitle:
            video.snippet?.channelTitle || "",
          views: toNumber(video.statistics?.viewCount),
          likes: toNullableNumber(
            video.statistics?.likeCount,
          ),
          comments: toNullableNumber(
            video.statistics?.commentCount,
          ),
          duration:
            video.contentDetails?.duration || null,
        }),
      );

      videos.sort((a, b) => {
        const aDate = a.publishedAt
          ? new Date(a.publishedAt).getTime()
          : 0;

        const bDate = b.publishedAt
          ? new Date(b.publishedAt).getTime()
          : 0;

        return bDate - aDate;
      });

      return {
        videos,
      } as const;
    } catch (error) {
      console.error("YouTube videos fetch failed:", error);

      return {
        error: "youtube_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not fetch channel videos.",
      } as const;
    }
  });

/**
 * Fetch the channel plus its latest videos in one call.
 *
 * This is the function Channel Review used to call directly. Kept as-is
 * for any other caller that goes through TanStack's normal server-fn
 * dispatch (client components using useServerFn). Do NOT call this one
 * from a plain API route handler — its requireSupabaseAuth middleware
 * depends on TanStack's RPC dispatch context, which API routes don't
 * provide. Use fetchYouTubeChannelData below for that case instead.
 */
export const getYouTubeChannelData = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      url: z.string().min(1).max(500),
      videoLimit: z
        .number()
        .int()
        .min(5)
        .max(50)
        .optional()
        .default(25),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const parsed = parseYouTubeChannelUrl(data.url);
      const channelId = await resolveChannelId(parsed);

      const [channelResult, searchResult] = await Promise.all([
        youtubeFetch<{
          items?: YouTubeApiChannel[];
        }>("channels", {
          part: "snippet,statistics",
          id: channelId,
        }),

        youtubeFetch<{
          items?: {
            id?: {
              videoId?: string;
            };
          }[];
        }>("search", {
          part: "snippet",
          channelId,
          type: "video",
          order: "date",
          maxResults: String(data.videoLimit),
        }),
      ]);

      const rawChannel = channelResult.items?.[0];

      if (!rawChannel) {
        return {
          error: "not_found",
          message: "YouTube channel not found.",
        } as const;
      }

      const channel: YouTubeChannel = {
        id: rawChannel.id,
        title:
          rawChannel.snippet?.title || "Untitled Channel",
        description:
          rawChannel.snippet?.description || "",
        customUrl:
          rawChannel.snippet?.customUrl || null,
        publishedAt:
          rawChannel.snippet?.publishedAt || null,
        thumbnailUrl: thumbnailUrl(
          rawChannel.snippet?.thumbnails,
        ),
        country:
          rawChannel.snippet?.country || null,
        subscribers: toNullableNumber(
          rawChannel.statistics?.subscriberCount,
        ),
        videoCount: toNumber(
          rawChannel.statistics?.videoCount,
        ),
        viewCount: toNumber(
          rawChannel.statistics?.viewCount,
        ),
      };

      const videoIds = (searchResult.items ?? [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      let videos: YouTubeVideo[] = [];

      if (videoIds.length > 0) {
        const videoResult = await youtubeFetch<{
          items?: YouTubeApiVideo[];
        }>("videos", {
          part: "snippet,statistics,contentDetails",
          id: videoIds.join(","),
        });

        videos = (videoResult.items ?? []).map(
          (video) => ({
            id: video.id,
            title:
              video.snippet?.title ||
              "Untitled Video",
            description:
              video.snippet?.description || "",
            publishedAt:
              video.snippet?.publishedAt || null,
            thumbnailUrl: thumbnailUrl(
              video.snippet?.thumbnails,
            ),
            channelId:
              video.snippet?.channelId ||
              channelId,
            channelTitle:
              video.snippet?.channelTitle ||
              channel.title,
            views: toNumber(
              video.statistics?.viewCount,
            ),
            likes: toNullableNumber(
              video.statistics?.likeCount,
            ),
            comments: toNullableNumber(
              video.statistics?.commentCount,
            ),
            duration:
              video.contentDetails?.duration || null,
          }),
        );
      }

      videos.sort((a, b) => {
        const aDate = a.publishedAt
          ? new Date(a.publishedAt).getTime()
          : 0;

        const bDate = b.publishedAt
          ? new Date(b.publishedAt).getTime()
          : 0;

        return bDate - aDate;
      });

      return {
        channel,
        videos,
      } as const;
    } catch (error) {
      console.error(
        "YouTube channel analysis data fetch failed:",
        error,
      );

      return {
        error: "youtube_error",
        message:
          error instanceof Error
            ? error.message
            : "Could not fetch YouTube channel data.",
      } as const;
    }
  });

/**
 * Plain, middleware-free version of the channel+videos fetch — safe to call
 * from anywhere on the server (API routes, other plain functions) without
 * depending on TanStack's RPC dispatch context. This is what
 * /api/studio/channel-review uses.
 *
 * IMPORTANT: this function does NOT check authentication on its own.
 * Whatever calls it is responsible for verifying the user first.
 */
export async function fetchYouTubeChannelData(
  url: string,
  videoLimit = 25,
): Promise<
  | { channel: YouTubeChannel; videos: YouTubeVideo[] }
  | { error: string; message: string }
> {
  try {
    const parsed = parseYouTubeChannelUrl(url);
    const channelId = await resolveChannelId(parsed);

    const [channelResult, searchResult] = await Promise.all([
      youtubeFetch<{ items?: YouTubeApiChannel[] }>("channels", {
        part: "snippet,statistics",
        id: channelId,
      }),
      youtubeFetch<{ items?: { id?: { videoId?: string } }[] }>("search", {
        part: "snippet",
        channelId,
        type: "video",
        order: "date",
        maxResults: String(videoLimit),
      }),
    ]);

    const rawChannel = channelResult.items?.[0];
    if (!rawChannel) {
      return { error: "not_found", message: "YouTube channel not found." };
    }

    const channel: YouTubeChannel = {
      id: rawChannel.id,
      title: rawChannel.snippet?.title || "Untitled Channel",
      description: rawChannel.snippet?.description || "",
      customUrl: rawChannel.snippet?.customUrl || null,
      publishedAt: rawChannel.snippet?.publishedAt || null,
      thumbnailUrl: thumbnailUrl(rawChannel.snippet?.thumbnails),
      country: rawChannel.snippet?.country || null,
      subscribers: toNullableNumber(rawChannel.statistics?.subscriberCount),
      videoCount: toNumber(rawChannel.statistics?.videoCount),
      viewCount: toNumber(rawChannel.statistics?.viewCount),
    };

    const videoIds = (searchResult.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    let videos: YouTubeVideo[] = [];
    if (videoIds.length > 0) {
      const videoResult = await youtubeFetch<{ items?: YouTubeApiVideo[] }>(
        "videos",
        { part: "snippet,statistics,contentDetails", id: videoIds.join(",") },
      );
      videos = (videoResult.items ?? []).map((video) => ({
        id: video.id,
        title: video.snippet?.title || "Untitled Video",
        description: video.snippet?.description || "",
        publishedAt: video.snippet?.publishedAt || null,
        thumbnailUrl: thumbnailUrl(video.snippet?.thumbnails),
        channelId: video.snippet?.channelId || channelId,
        channelTitle: video.snippet?.channelTitle || channel.title,
        views: toNumber(video.statistics?.viewCount),
        likes: toNullableNumber(video.statistics?.likeCount),
        comments: toNullableNumber(video.statistics?.commentCount),
        duration: video.contentDetails?.duration || null,
      }));
    }

    videos.sort((a, b) => {
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });

    return { channel, videos };
  } catch (error) {
    console.error("fetchYouTubeChannelData failed:", error);
    return {
      error: "youtube_error",
      message: error instanceof Error ? error.message : "Could not fetch YouTube channel data.",
    };
  }
}
