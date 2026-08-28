import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Check,
  Copy,
  Hash,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { generateSocialContent } from "@/lib/social-content.functions";

export const Route = createFileRoute("/_authenticated/social-content")({
  head: () => ({
    meta: [{ title: "Social Content — Kodarai" }],
  }),
  component: SocialContentPage,
});

type Platform =
  | "Instagram"
  | "TikTok"
  | "Facebook"
  | "X"
  | "LinkedIn";

type Goal =
  | "Grow my audience"
  | "Get more engagement"
  | "Generate leads"
  | "Drive sales"
  | "Build brand awareness";

type Style =
  | "Educational"
  | "Professional"
  | "Funny"
  | "Inspirational"
  | "Conversational"
  | "Bold";

interface SocialPost {
  day: string;
  format: string;
  idea: string;
  caption: string;
  hashtags: string[];
}

function SocialContentPage() {
  const generateContent = useServerFn(generateSocialContent);

  const [business, setBusiness] = useState("");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [goal, setGoal] = useState<Goal>("Grow my audience");
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [style, setStyle] = useState<Style>("Conversational");

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!business.trim()) {
      toast.error("Tell us what your business is about first.");
      return;
    }

    setLoading(true);

    try {
      const result = await generateContent({
        data: {
          business: business.trim(),
          platform,
          goal,
          postsPerWeek,
          style,
        },
      });

      if ("error" in result) {
        toast.error(result.message);
        return;
      }

      setPosts(result.posts);
      toast.success(`${result.posts.length} posts generated.`);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied to clipboard.");

      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const copyPost = async (post: SocialPost, index: number) => {
    const text = `${post.idea}

${post.caption}

${post.hashtags.join(" ")}`;

    await copyText(text, `post-${index}`);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-sm font-semibold">
              Kodarai AI
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Social Content
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create social media ideas, captions, hashtags and a
            ready-to-use content plan with AI.
          </p>
        </div>

        {/* Generator */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lightbulb className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Create your content plan
              </h2>
              <p className="text-sm text-muted-foreground">
                Tell Kodarai about your business.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Business */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                What is your business or niche?
              </label>

              <textarea
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Example: I run a sneaker store in Lagos selling affordable premium sneakers to young adults."
                rows={3}
                maxLength={160}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <p className="mt-1 text-right text-xs text-muted-foreground">
                {business.length}/160
              </p>
            </div>

            {/* Platform */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Platform
              </label>

              <select
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as Platform)
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option>Instagram</option>
                <option>TikTok</option>
                <option>Facebook</option>
                <option>X</option>
                <option>LinkedIn</option>
              </select>
            </div>

            {/* Goal */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Main goal
              </label>

              <select
                value={goal}
                onChange={(e) =>
                  setGoal(e.target.value as Goal)
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option>Grow my audience</option>
                <option>Get more engagement</option>
                <option>Generate leads</option>
                <option>Drive sales</option>
                <option>Build brand awareness</option>
              </select>
            </div>

            {/* Posts */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Posts per week
              </label>

              <select
                value={postsPerWeek}
                onChange={(e) =>
                  setPostsPerWeek(Number(e.target.value))
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value={1}>1 post</option>
                <option value={2}>2 posts</option>
                <option value={3}>3 posts</option>
                <option value={4}>4 posts</option>
                <option value={5}>5 posts</option>
                <option value={6}>6 posts</option>
                <option value={7}>7 posts</option>
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Content style
              </label>

              <select
                value={style}
                onChange={(e) =>
                  setStyle(e.target.value as Style)
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option>Educational</option>
                <option>Professional</option>
                <option>Funny</option>
                <option>Inspirational</option>
                <option>Conversational</option>
                <option>Bold</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !business.trim()}
            className="mt-6 h-11 w-full rounded-xl sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating content...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Generate Content Plan
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {posts.length > 0 && (
          <div className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Your Content Plan
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {posts.length} posts for {platform}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading}
              >
                <RefreshCw className="mr-2 size-4" />
                Regenerate
              </Button>
            </div>

            <div className="grid gap-4">
              {posts.map((post, index) => (
                <article
                  key={`${post.day}-${index}`}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  {/* Post header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent/30 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarDays className="size-4" />
                      </div>

                      <div>
                        <p className="font-semibold">
                          {post.day}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {post.format}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPost(post, index)}
                    >
                      {copied === `post-${index}` ? (
                        <>
                          <Check className="mr-1.5 size-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 size-3.5" />
                          Copy Post
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_1.4fr]">
                    {/* Idea */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Lightbulb className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          Content Idea
                        </h3>
                      </div>

                      <p className="text-sm leading-6 text-muted-foreground">
                        {post.idea}
                      </p>
                    </div>

                    {/* Caption */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          Caption
                        </h3>
                      </div>

                      <div className="rounded-xl bg-accent/40 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {post.caption}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            post.caption,
                            `caption-${index}`,
                          )
                        }
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {copied === `caption-${index}` ? (
                          <>
                            <Check className="size-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            Copy caption
                          </>
                        )}
                      </button>
                    </div>

                    {/* Hashtags */}
                    <div className="lg:col-span-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Hash className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          Hashtags
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag, tagIndex) => (
                          <button
                            key={`${tag}-${tagIndex}`}
                            type="button"
                            onClick={() =>
                              copyText(
                                tag,
                                `tag-${index}-${tagIndex}`,
                              )
                            }
                            className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent/80 hover:text-foreground"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
