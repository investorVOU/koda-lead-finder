import { useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_CATEGORIES } from "@/lib/constants";

export function SearchForm({
  onSearch,
  loading,
  defaultCategory,
  defaultLocation,
}: {
  onSearch: (category: string, location: string) => void;
  loading: boolean;
  defaultCategory?: string;
  defaultLocation?: string;
}) {
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [location, setLocation] = useState(defaultLocation ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!category || !location.trim()) return;
    onSearch(category, location.trim());
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Business category" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="h-11"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, Country or ZIP — e.g. Lagos, Nigeria"
        />

        <Button type="submit" variant="hero" size="lg" className="h-11" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Search className="size-4" /> Find Leads
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
