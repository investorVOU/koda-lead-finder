import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMarketingSocialProof,
  listMarketingSocialProof,
  saveMarketingProof,
  saveMarketingReview,
  updateMarketingSocialProofState,
  uploadSocialProofAsset,
} from "@/lib/social-proof.functions";

type Review = {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
  photo_path: string | null;
  photoUrl: string | null;
  review_text: string;
  rating: number;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
};
type Proof = {
  id: string;
  name: string;
  location: string | null;
  avatar_path: string | null;
  avatarUrl: string | null;
  headline: string;
  description: string | null;
  proof_image_path: string;
  proofImageUrl: string | null;
  secondary_image_path: string | null;
  secondaryImageUrl: string | null;
  proof_alt: string | null;
  result_type:
    | "client_won"
    | "payment_received"
    | "website_sold"
    | "positive_reply"
    | "recurring_client"
    | "other";
  result_amount: number | null;
  currency: string | null;
  quote: string | null;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
};
type UploadKind = "review-photo" | "proof-image" | "proof-secondary" | "proof-avatar";

const freshReview = () => ({
  name: "",
  role: "",
  location: "",
  photoPath: "",
  photoUrl: "",
  reviewText: "",
  rating: 5,
  isPublished: false,
  isFeatured: false,
  displayOrder: 0,
});
const freshProof = () => ({
  name: "",
  location: "",
  avatarPath: "",
  avatarUrl: "",
  headline: "",
  description: "",
  proofImagePath: "",
  proofImageUrl: "",
  secondaryImagePath: "",
  secondaryImageUrl: "",
  proofAlt: "",
  resultType: "other" as Proof["result_type"],
  resultAmount: "",
  currency: "NGN",
  quote: "",
  isPublished: false,
  isFeatured: false,
  displayOrder: 0,
});

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function SocialProofManager({ passcode }: { passcode: string }) {
  const list = useServerFn(listMarketingSocialProof);
  const saveReview = useServerFn(saveMarketingReview);
  const saveProof = useServerFn(saveMarketingProof);
  const updateState = useServerFn(updateMarketingSocialProofState);
  const deleteItem = useServerFn(deleteMarketingSocialProof);
  const upload = useServerFn(uploadSocialProofAsset);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);
  const [review, setReview] = useState(freshReview);
  const [proof, setProof] = useState(freshProof);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const inputRefs = useRef<Record<UploadKind, HTMLInputElement | null>>({
    "review-photo": null,
    "proof-image": null,
    "proof-secondary": null,
    "proof-avatar": null,
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await list({ data: { passcode } });
      setReviews(data.reviews as Review[]);
      setProofs(data.proofs as Proof[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load social proof.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const uploadImage = async (file: File, kind: UploadKind) => {
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/))
      return toast.error("Use a JPG, PNG, WebP, or GIF image.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be 10 MB or smaller.");
    setUploading(kind);
    try {
      const contentBase64 = await fileToBase64(file);
      const result = await upload({
        data: {
          passcode,
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          contentBase64,
          kind,
        },
      });
      if (kind === "review-photo")
        setReview((current) => ({
          ...current,
          photoPath: result.path,
          photoUrl: result.signedUrl ?? "",
        }));
      if (kind === "proof-image")
        setProof((current) => ({
          ...current,
          proofImagePath: result.path,
          proofImageUrl: result.signedUrl ?? "",
        }));
      if (kind === "proof-secondary")
        setProof((current) => ({
          ...current,
          secondaryImagePath: result.path,
          secondaryImageUrl: result.signedUrl ?? "",
        }));
      if (kind === "proof-avatar")
        setProof((current) => ({
          ...current,
          avatarPath: result.path,
          avatarUrl: result.signedUrl ?? "",
        }));
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploading(null);
    }
  };

  const openReview = (item?: Review) => {
    setReviewId(item?.id ?? null);
    setReview(
      item
        ? {
            name: item.name,
            role: item.role ?? "",
            location: item.location ?? "",
            photoPath: item.photo_path ?? "",
            photoUrl: item.photoUrl ?? "",
            reviewText: item.review_text,
            rating: item.rating,
            isPublished: item.is_published,
            isFeatured: item.is_featured,
            displayOrder: item.display_order,
          }
        : freshReview(),
    );
    setReviewOpen(true);
  };
  const openProof = (item?: Proof) => {
    setProofId(item?.id ?? null);
    setProof(
      item
        ? {
            name: item.name,
            location: item.location ?? "",
            avatarPath: item.avatar_path ?? "",
            avatarUrl: item.avatarUrl ?? "",
            headline: item.headline,
            description: item.description ?? "",
            proofImagePath: item.proof_image_path,
            proofImageUrl: item.proofImageUrl ?? "",
            secondaryImagePath: item.secondary_image_path ?? "",
            secondaryImageUrl: item.secondaryImageUrl ?? "",
            proofAlt: item.proof_alt ?? "",
            resultType: item.result_type,
            resultAmount: item.result_amount?.toString() ?? "",
            currency: item.currency ?? "NGN",
            quote: item.quote ?? "",
            isPublished: item.is_published,
            isFeatured: item.is_featured,
            displayOrder: item.display_order,
          }
        : freshProof(),
    );
    setProofOpen(true);
  };
  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveReview({ data: { passcode, id: reviewId ?? undefined, ...review } });
      setReviewOpen(false);
      toast.success("Review saved.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setSaving(false);
    }
  };
  const submitProof = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveProof({
        data: {
          passcode,
          id: proofId ?? undefined,
          ...proof,
          resultAmount: proof.resultAmount === "" ? null : Number(proof.resultAmount),
        },
      });
      setProofOpen(false);
      toast.success("Proof saved.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save proof.");
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (
    kind: "review" | "proof",
    id: string,
    field: "isPublished" | "isFeatured",
    value: boolean,
  ) => {
    try {
      await updateState({ data: { passcode, kind, id, field, value } });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item.");
    }
  };
  const remove = async (kind: "review" | "proof", id: string) => {
    if (!window.confirm("Delete this item and its uploaded images? This cannot be undone.")) return;
    try {
      await deleteItem({ data: { passcode, kind, id } });
      toast.success("Item deleted.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Reviews and proof of work</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Only items you publish are shown on the start page. Upload redacted screenshots only.
          </p>
        </div>
      </div>
      <Tabs defaultValue="reviews" className="mt-5">
        <TabsList>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="proofs">Proof of Work</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-5">
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => openReview()}>
              <Plus className="size-4" /> Add review
            </Button>
          </div>
          {loading ? (
            <Loading />
          ) : reviews.length ? (
            <div className="space-y-3">
              {reviews.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
                >
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(item.name)}
                    </span>
                  )}
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{item.review_text}</p>
                  </div>
                  <span className="flex items-center gap-0.5 text-xs text-amber-600">
                    {Array.from({ length: item.rating }).map((_, index) => (
                      <Star key={index} className="size-3 fill-current" />
                    ))}
                  </span>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={item.is_featured}
                      onCheckedChange={(value) =>
                        void toggle("review", item.id, "isFeatured", value)
                      }
                    />{" "}
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={item.is_published}
                      onCheckedChange={(value) =>
                        void toggle("review", item.id, "isPublished", value)
                      }
                    />{" "}
                    Published
                  </label>
                  <span className="text-xs text-muted-foreground">Order {item.display_order}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openReview(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove("review", item.id)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty label="No reviews yet." />
          )}
        </TabsContent>
        <TabsContent value="proofs" className="mt-5">
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => openProof()}>
              <Plus className="size-4" /> Add proof
            </Button>
          </div>
          {loading ? (
            <Loading />
          ) : proofs.length ? (
            <div className="space-y-3">
              {proofs.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
                >
                  {item.proofImageUrl ? (
                    <img
                      src={item.proofImageUrl}
                      alt=""
                      className="size-12 rounded-lg border object-contain"
                    />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
                      <ImagePlus className="size-4" />
                    </span>
                  )}
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium">{item.headline}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.name}
                      {item.result_amount != null
                        ? ` · ${item.currency ?? ""} ${item.result_amount.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={item.is_featured}
                      onCheckedChange={(value) =>
                        void toggle("proof", item.id, "isFeatured", value)
                      }
                    />{" "}
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={item.is_published}
                      onCheckedChange={(value) =>
                        void toggle("proof", item.id, "isPublished", value)
                      }
                    />{" "}
                    Published
                  </label>
                  <span className="text-xs text-muted-foreground">Order {item.display_order}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openProof(item)}
                      aria-label={`Edit ${item.headline}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove("proof", item.id)}
                      aria-label={`Delete ${item.headline}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty label="No proof of work yet." />
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewId ? "Edit review" : "Add review"}</DialogTitle>
            <DialogDescription>
              Use only a real customer review approved for marketing.
            </DialogDescription>
          </DialogHeader>
          <form className="min-h-0 space-y-4 overflow-y-auto pr-1" onSubmit={submitReview}>
            <ImageField
              label="Photo (optional)"
              kind="review-photo"
              url={review.photoUrl}
              inputRef={(node) => {
                inputRefs.current["review-photo"] = node;
              }}
              uploading={uploading === "review-photo"}
              onPick={(file) => void uploadImage(file, "review-photo")}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  required
                  value={review.name}
                  onChange={(e) => setReview({ ...review, name: e.target.value })}
                />
              </Field>
              <Field label="Rating">
                <Input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={review.rating}
                  onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
                />
              </Field>
              <Field label="Role (optional)">
                <Input
                  value={review.role}
                  onChange={(e) => setReview({ ...review, role: e.target.value })}
                />
              </Field>
              <Field label="Location (optional)">
                <Input
                  value={review.location}
                  onChange={(e) => setReview({ ...review, location: e.target.value })}
                />
              </Field>
              <Field label="Display order">
                <Input
                  type="number"
                  value={review.displayOrder}
                  onChange={(e) => setReview({ ...review, displayOrder: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Review">
              <Textarea
                required
                rows={4}
                value={review.reviewText}
                onChange={(e) => setReview({ ...review, reviewText: e.target.value })}
              />
            </Field>
            <Toggles
              published={review.isPublished}
              featured={review.isFeatured}
              onPublished={(isPublished) => setReview({ ...review, isPublished })}
              onFeatured={(isFeatured) => setReview({ ...review, isFeatured })}
            />
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{proofId ? "Edit proof of work" : "Add proof of work"}</DialogTitle>
            <DialogDescription>
              Upload an already-redacted screenshot. Only published proof appears publicly.
            </DialogDescription>
          </DialogHeader>
          <form className="min-h-0 space-y-4 overflow-y-auto pr-1" onSubmit={submitProof}>
            <ImageField
              label="Avatar (optional)"
              kind="proof-avatar"
              url={proof.avatarUrl}
              inputRef={(node) => {
                inputRefs.current["proof-avatar"] = node;
              }}
              uploading={uploading === "proof-avatar"}
              onPick={(file) => void uploadImage(file, "proof-avatar")}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageField
                label="Proof screenshot"
                required
                kind="proof-image"
                url={proof.proofImageUrl}
                inputRef={(node) => {
                  inputRefs.current["proof-image"] = node;
                }}
                uploading={uploading === "proof-image"}
                onPick={(file) => void uploadImage(file, "proof-image")}
              />
              <ImageField
                label="Second screenshot (optional)"
                kind="proof-secondary"
                url={proof.secondaryImageUrl}
                inputRef={(node) => {
                  inputRefs.current["proof-secondary"] = node;
                }}
                uploading={uploading === "proof-secondary"}
                onPick={(file) => void uploadImage(file, "proof-secondary")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  required
                  value={proof.name}
                  onChange={(e) => setProof({ ...proof, name: e.target.value })}
                />
              </Field>
              <Field label="Location (optional)">
                <Input
                  value={proof.location}
                  onChange={(e) => setProof({ ...proof, location: e.target.value })}
                />
              </Field>
              <Field label="Headline">
                <Input
                  required
                  value={proof.headline}
                  onChange={(e) => setProof({ ...proof, headline: e.target.value })}
                />
              </Field>
              <Field label="Result type">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={proof.resultType}
                  onChange={(e) =>
                    setProof({ ...proof, resultType: e.target.value as Proof["result_type"] })
                  }
                >
                  <option value="client_won">Client won</option>
                  <option value="payment_received">Payment received</option>
                  <option value="website_sold">Website sold</option>
                  <option value="positive_reply">Positive reply</option>
                  <option value="recurring_client">Recurring client</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Real amount (optional)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={proof.resultAmount}
                  onChange={(e) => setProof({ ...proof, resultAmount: e.target.value })}
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={proof.currency}
                  onChange={(e) => setProof({ ...proof, currency: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Display order">
                <Input
                  type="number"
                  value={proof.displayOrder}
                  onChange={(e) => setProof({ ...proof, displayOrder: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="What happened (optional)">
              <Textarea
                rows={3}
                value={proof.description}
                onChange={(e) => setProof({ ...proof, description: e.target.value })}
              />
            </Field>
            <Field label="Quote (optional)">
              <Textarea
                rows={2}
                value={proof.quote}
                onChange={(e) => setProof({ ...proof, quote: e.target.value })}
              />
            </Field>
            <Field label="Screenshot alt text (optional)">
              <Input
                value={proof.proofAlt}
                onChange={(e) => setProof({ ...proof, proofAlt: e.target.value })}
                placeholder="Redacted customer payment confirmation"
              />
            </Field>
            <Toggles
              published={proof.isPublished}
              featured={proof.isFeatured}
              onPublished={(isPublished) => setProof({ ...proof, isPublished })}
              onFeatured={(isFeatured) => setProof({ ...proof, isFeatured })}
            />
            <DialogFooter>
              <Button type="submit" disabled={saving || !proof.proofImagePath}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save proof
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Loading() {
  return (
    <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Loading
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}
function Toggles({
  published,
  featured,
  onPublished,
  onFeatured,
}: {
  published: boolean;
  featured: boolean;
  onPublished: (value: boolean) => void;
  onFeatured: (value: boolean) => void;
}) {
  return (
    <div className="flex gap-5">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={featured} onCheckedChange={onFeatured} /> Featured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={published} onCheckedChange={onPublished} /> Published
      </label>
    </div>
  );
}
function ImageField({
  label,
  required,
  kind,
  url,
  uploading,
  onPick,
  inputRef,
}: {
  label: string;
  required?: boolean;
  kind: UploadKind;
  url: string;
  uploading: boolean;
  onPick: (file: File) => void;
  inputRef: (node: HTMLInputElement | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <input
        ref={(node) => {
          ref.current = node;
          inputRef(node);
        }}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        {url && (
          <img
            src={url}
            alt="Selected upload"
            className="size-12 rounded-lg border object-contain"
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => ref.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}{" "}
          {url ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
