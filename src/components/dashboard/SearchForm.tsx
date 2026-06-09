import { useState, useRef, type FormEvent } from "react";
import { Search, Loader2, X, ChevronDown } from "lucide-react";
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
import { UNIQUE_COUNTRIES, getStates, buildLocationString } from "@/lib/locations";

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
  const allItems = LEAD_CATEGORY_GROUPS.flatMap((g) => g.items);
  const isKnown  = !defaultCategory || allItems.includes(defaultCategory);

  const [selectValue, setSelectValue] = useState(
    defaultCategory ? (isKnown ? defaultCategory : CUSTOM_SENTINEL) : "",
  );
  const [customText, setCustomText] = useState(
    defaultCategory && !isKnown ? defaultCategory : "",
  );

  const [countryCode, setCountryCode] = useState("");
  const [state,       setState]       = useState("");
  const [city,        setCity]        = useState("");
  const [cityInput,   setCityInput]   = useState("");

  const customRef = useRef<HTMLInputElement>(null);

  const isCustom        = selectValue === CUSTOM_SENTINEL;
  const resolvedCategory = isCustom ? customText.trim() : selectValue;
  const states          = getStates(countryCode);
  const hasStates       = states.length > 0;
  const selectedState   = states.find((s) => s.name === state);
  const cities          = selectedState?.cities ?? [];

  const selectedCountry = UNIQUE_COUNTRIES.find((c) => c.code === countryCode);

  const handleCountryChange = (val: string) => {
    setCountryCode(val);
    setState("");
    setCity("");
    setCityInput("");
  };

  const handleStateChange = (val: string) => {
    setState(val);
    setCity("");
    setCityInput("");
  };

  const handleSelectChange = (val: string) => {
    setSelectValue(val);
    if (val === CUSTOM_SENTINEL) setTimeout(() => customRef.current?.focus(), 60);
  };

  const clearCustom = () => { setSelectValue(""); setCustomText(""); };

  const resolvedLocation = buildLocationString(
    selectedCountry?.name ?? "",
    state,
    city || cityInput,
  );

  const canSearch = !!resolvedCategory && !!selectedCountry;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    onSearch(resolvedCategory, resolvedLocation || selectedCountry!.name);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">

        {/* ── Category ── */}
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
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Other
                </SelectLabel>
                <SelectItem value={CUSTOM_SENTINEL}>Custom category…</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
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
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* ── Country ── */}
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {UNIQUE_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── State / Region ── */}
        {hasStates ? (
          <Select value={state} onValueChange={handleStateChange} disabled={!countryCode}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="State / Region" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {states.map((s) => (
                <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-11"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State / Region (optional)"
            disabled={!countryCode}
          />
        )}

        {/* ── City ── */}
        {cities.length > 0 ? (
          <Select value={city} onValueChange={setCity} disabled={!state}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="City (optional)" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-11"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City (optional)"
            disabled={!countryCode}
          />
        )}

        {/* ── Search button ── */}
        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="h-11 sm:col-span-2 lg:col-span-1"
          disabled={loading || !canSearch}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <><Search className="size-4" /> Find Leads</>
          )}
        </Button>
      </div>

      {/* Location preview */}
      {resolvedLocation && (
        <p className="mt-2 text-xs text-muted-foreground">
          Searching in: <span className="font-medium text-foreground">{resolvedLocation}</span>
        </p>
      )}
    </form>
  );
}
