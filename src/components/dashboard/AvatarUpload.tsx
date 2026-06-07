import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface AvatarUploadProps {
  avatarUrl: string | null;
  name: string;
  onUpload: (url: string) => void;
  size?: number;
}

export function AvatarUpload({ avatarUrl, name, onUpload, size = 36 }: AvatarUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl + `?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (dbErr) {
      toast.error("Failed to save avatar");
      setUploading(false);
      return;
    }

    onUpload(publicUrl);
    toast.success("Avatar updated");
    setUploading(false);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ width: size, height: size }}
      aria-label="Change avatar"
      title="Click to change avatar"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="size-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center bg-accent text-accent-foreground font-semibold"
          style={{ fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}

      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="animate-spin text-white" style={{ width: size * 0.4, height: size * 0.4 }} />
        ) : (
          <Camera className="text-white" style={{ width: size * 0.4, height: size * 0.4 }} />
        )}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
