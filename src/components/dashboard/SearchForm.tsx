import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Loader2,
  Search,
  X,
} from "lucide-react";

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

import {
  LEAD_CATEGORY_GROUPS,
} from "@/lib/constants";

import {
  UNIQUE_COUNTRIES,
  getStates,
  buildLocationString,
} from "@/lib/locations";

const CUSTOM_SENTINEL = "__custom__";

export function SearchForm({
  onSearch,
  loading,
  defaultCategory,
  defaultLocation,
}: {
  onSearch: (
    category: string,
    location: string,
  ) => void;
  loading: boolean;
  defaultCategory?: string;
  defaultLocation?: string;
}) {
  const allItems =
    LEAD_CATEGORY_GROUPS.flatMap(
      (group) => group.items,
    );

  const isKnown =
    !defaultCategory ||
    allItems.includes(defaultCategory);

  const [
    selectValue,
    setSelectValue,
  ] = useState(
    defaultCategory
      ? isKnown
        ? defaultCategory
        : CUSTOM_SENTINEL
      : "",
  );

  const [
    customText,
    setCustomText,
  ] = useState(
    defaultCategory && !isKnown
      ? defaultCategory
      : "",
  );

  const [
    countryCode,
    setCountryCode,
  ] = useState("");

  const [state, setState] =
    useState("");

  const [city, setCity] =
    useState("");

  const [
    cityInput,
    setCityInput,
  ] = useState("");

  const customRef =
    useRef<HTMLInputElement>(null);

  const isCustom =
    selectValue === CUSTOM_SENTINEL;

  const resolvedCategory =
    isCustom
      ? customText.trim()
      : selectValue;

  const states =
    getStates(countryCode);

  const hasStates =
    states.length > 0;

  const selectedState =
    states.find(
      (item) =>
        item.name === state,
    );

  const cities =
    selectedState?.cities ?? [];

  const selectedCountry =
    UNIQUE_COUNTRIES.find(
      (country) =>
        country.code === countryCode,
    );

  const handleCountryChange = (
    value: string,
  ) => {
    setCountryCode(value);
    setState("");
    setCity("");
    setCityInput("");
  };

  const handleStateChange = (
    value: string,
  ) => {
    setState(value);
    setCity("");
    setCityInput("");
  };

  const handleSelectChange = (
    value: string,
  ) => {
    setSelectValue(value);

    if (
      value === CUSTOM_SENTINEL
    ) {
      setTimeout(() => {
        customRef.current?.focus();
      }, 60);
    }
  };

  const clearCustom = () => {
    setSelectValue("");
    setCustomText("");
  };

  const resolvedLocation =
    buildLocationString(
      selectedCountry?.name ?? "",
      state,
      city || cityInput,
    );

  const canSearch =
    !!resolvedCategory &&
    !!selectedCountry;

  const submit = (
    e: FormEvent,
  ) => {
    e.preventDefault();

    if (!canSearch) {
      return;
    }

    onSearch(
      resolvedCategory,
      resolvedLocation ||
        selectedCountry!.name,
    );
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4"
    >
      {/* CATEGORY */}

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Business category
        </label>

        {!isCustom ? (
          <Select
            value={selectValue}
            onValueChange={
              handleSelectChange
            }
          >
            <SelectTrigger
              className="
                h-12
                rounded-xl
                border-border
                bg-background
                px-4
              "
            >
              <SelectValue placeholder="e.g. Plumbers" />
            </SelectTrigger>

            <SelectContent className="max-h-80">
              {LEAD_CATEGORY_GROUPS.map(
                (group) => (
                  <SelectGroup
                    key={
                      group.group
                    }
                  >
                    <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.group}
                    </SelectLabel>

                    {group.items.map(
                      (category) => (
                        <SelectItem
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {category}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                ),
              )}

              <SelectGroup>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Other
                </SelectLabel>

                <SelectItem
                  value={
                    CUSTOM_SENTINEL
                  }
                >
                  Custom category…
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <div className="relative">
            <Input
              ref={customRef}
              value={customText}
              onChange={(e) =>
                setCustomText(
                  e.target.value,
                )
              }
              placeholder="Type any business type…"
              className="
                h-12
                rounded-xl
                bg-background
                pr-10
              "
            />

            <button
              type="button"
              onClick={clearCustom}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                text-muted-foreground
                transition
                hover:text-foreground
              "
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* COUNTRY */}

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Country
        </label>

        <Select
          value={countryCode}
          onValueChange={
            handleCountryChange
          }
        >
          <SelectTrigger
            className="
              h-12
              rounded-xl
              border-border
              bg-background
              px-4
            "
          >
            <SelectValue placeholder="Choose country" />
          </SelectTrigger>

          <SelectContent className="max-h-72">
            {UNIQUE_COUNTRIES.map(
              (country) => (
                <SelectItem
                  key={
                    country.code
                  }
                  value={
                    country.code
                  }
                >
                  {country.flag}{" "}
                  {country.name}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {/* STATE + CITY */}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            State / Region
          </label>

          {hasStates ? (
            <Select
              value={state}
              onValueChange={
                handleStateChange
              }
              disabled={
                !countryCode
              }
            >
              <SelectTrigger
                className="
                  h-12
                  rounded-xl
                  border-border
                  bg-background
                  px-3
                "
              >
                <SelectValue placeholder="State" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {states.map(
                  (item) => (
                    <SelectItem
                      key={
                        item.name
                      }
                      value={
                        item.name
                      }
                    >
                      {item.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={state}
              onChange={(e) =>
                setState(
                  e.target.value,
                )
              }
              placeholder="Optional"
              disabled={
                !countryCode
              }
              className="
                h-12
                rounded-xl
                bg-background
              "
            />
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            City
          </label>

          {cities.length > 0 ? (
            <Select
              value={city}
              onValueChange={
                setCity
              }
              disabled={!state}
            >
              <SelectTrigger
                className="
                  h-12
                  rounded-xl
                  border-border
                  bg-background
                  px-3
                "
              >
                <SelectValue placeholder="City" />
              </SelectTrigger>

              <SelectContent className="max-h-64">
                {cities.map(
                  (item) => (
                    <SelectItem
                      key={item}
                      value={item}
                    >
                      {item}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={cityInput}
              onChange={(e) =>
                setCityInput(
                  e.target.value,
                )
              }
              placeholder="Optional"
              disabled={
                !countryCode
              }
              className="
                h-12
                rounded-xl
                bg-background
              "
            />
          )}
        </div>
      </div>

      {/* LOCATION PREVIEW */}

      {resolvedLocation && (
        <p className="text-xs text-muted-foreground">
          Searching in{" "}
          <span className="font-medium text-foreground">
            {resolvedLocation}
          </span>
        </p>
      )}

      {/* CTA */}

      <Button
        type="submit"
        variant="hero"
        size="lg"
        disabled={
          loading ||
          !canSearch
        }
        className="
          h-12
          w-full
          rounded-xl
          text-sm
          font-semibold
        "
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Searching
          </>
        ) : (
          <>
            <Search className="size-4" />
            Find Leads
          </>
        )}
      </Button>
    </form>
  );
}
