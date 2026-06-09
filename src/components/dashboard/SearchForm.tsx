import { useState, useRef, type FormEvent } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_CATEGORY_GROUPS } from "@/lib/constants";

const CUSTOM_SENTINEL = "__custom__";

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
  // If defaultCategory isn't in any group, start in custom mode
  const allItems = LEAD_CATEGORY_GROUPS.flatMap((g) => g.items);
  const isKnown = !defaultCategory || allItems.includes(defaultCategory);

  const [selectValue, setSelectValue] = useState(
    defaultCategory
      ? isKnown
        ? defaultCategory
        : CUSTOM_SENTINEL
      : "",
  );
  const [customText, setCustomText] = useState(
    defaultCategory && !isKnown ? defaultCategory : "",
  );
  const [location, setLocation] = useState(defaultLocation ?? "");
  const customRef = useRef<HTMLInputElement>(null);

  const isCustom = selectValue === CUSTOM_SENTINEL;

  // The real category value to send
  const resolvedCategory = isCustom ? customText.trim() : selectValue;

  const handleSelectChange = (val: string) => {
    setSelectValue(val);
    if (val === CUSTOM_SENTINEL) {
      // Focus the custom input on next tick
      setTimeout(() => customRef.current?.focus(), 60);
    }
  };

  const clearCustom = () => {
    setSelectValue("");
    setCustomText("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!resolvedCategory || !location.trim()) return;
    onSearch(resolvedCategory, location.trim());
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
        {/* Category picker */}
        {!isCustom ? (
          <Select value={selectValue} onValueChange={handleSelectChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Business category" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {LEAD_CATEGORY_GROUPS.map((group) => (
                <SelectGroup key={group.group}>
                  <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.group}
                  </SelectLabel>
                  {group.items.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              {/* Custom option pinned at the bottom */}
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Other
                </SelectLabel>
                <SelectItem value={CUSTOM_SENTINEL}>
                  Custom category…
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          /* Custom text input — shows when "Custom category…" is picked */
          <div className="relative">
            <Input
              ref={customRef}
              className="h-11 pr-8"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type any business type…"
            />
            <button
              type="button"
              onClick={clearCustom}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Back to category list"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <Input
          className="h-11"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, Country or ZIP — e.g. Lagos, Nigeria"
        />

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="h-11"
          disabled={loading || !resolvedCategory || !location.trim()}
        >
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
