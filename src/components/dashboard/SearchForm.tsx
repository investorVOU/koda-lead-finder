import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LEAD_CATEGORY_GROUPS } from "@/lib/constants";
import {
  UNIQUE_COUNTRIES,
  getStates,
  buildLocationString,
} from "@/lib/locations";

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
  const allCategories = useMemo(
    () =>
      LEAD_CATEGORY_GROUPS.flatMap(
        (group) => group.items,
      ),
    [],
  );

  const [category, setCategory] =
    useState(defaultCategory ?? "");

  const [categoryOpen, setCategoryOpen] =
    useState(false);

  const [countryCode, setCountryCode] =
    useState("");

  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [cityInput, setCityInput] =
    useState("");

  const categoryRef =
    useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const query = category
      .trim()
      .toLowerCase();

    if (!query) {
      return allCategories.slice(0, 18);
    }

    return allCategories
      .filter((item) =>
        item
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 18);
  }, [allCategories, category]);

  const states = getStates(countryCode);

  const selectedState = states.find(
    (item) => item.name === state,
  );

  const cities =
    selectedState?.cities ?? [];

  const selectedCountry =
    UNIQUE_COUNTRIES.find(
      (country) =>
        country.code === countryCode,
    );

  const resolvedLocation =
    buildLocationString(
      selectedCountry?.name ?? "",
      state,
      city || cityInput,
    );

  const canSearch =
    category.trim().length > 0 &&
    !!selectedCountry;

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

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!canSearch) return;

    onSearch(
      category.trim(),
      resolvedLocation ||
        selectedCountry!.name,
    );

    setCategoryOpen(false);
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3.5"
    >
      {/* CATEGORY */}

      <div
        ref={categoryRef}
        className="relative"
      >
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Business category
        </label>

        <div className="relative">
          <Search
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              size-4
              -translate-y-1/2
              text-muted-foreground
            "
          />

          <Input
            value={category}
            onChange={(event) => {
              setCategory(
                event.target.value,
              );
              setCategoryOpen(true);
            }}
            onFocus={() =>
              setCategoryOpen(true)
            }
            onBlur={() => {
              window.setTimeout(() => {
                setCategoryOpen(false);
              }, 150);
            }}
            placeholder="Search business types..."
            autoComplete="off"
            className="
              h-11
              rounded-xl
              border-border
              bg-background
              pl-10
              pr-10
            "
          />

          {category ? (
            <button
              type="button"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() => {
                setCategory("");
                setCategoryOpen(true);
              }}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                rounded-md
                p-1
                text-muted-foreground
                transition
                hover:text-foreground
              "
              aria-label="Clear category"
            >
              <X className="size-4" />
            </button>
          ) : (
            <ChevronDown
              className="
                pointer-events-none
                absolute
                right-3.5
                top-1/2
                size-4
                -translate-y-1/2
                text-muted-foreground
              "
            />
          )}
        </div>

        {categoryOpen && (
          <div
            className="
              absolute
              left-0
              right-0
              top-full
              z-50
              mt-1.5
              max-h-64
              overflow-y-auto
              rounded-xl
              border
              border-border
              bg-popover
              p-1.5
              shadow-xl
            "
          >
            {filteredCategories.length >
            0 ? (
              filteredCategories.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={(
                      event,
                    ) =>
                      event.preventDefault()
                    }
                    onClick={() => {
                      setCategory(item);
                      setCategoryOpen(
                        false,
                      );
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-left
                      text-sm
                      text-foreground
                      transition
                      hover:bg-muted
                    "
                  >
                    <span className="truncate">
                      {item}
                    </span>

                    {category === item && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                ),
              )
            ) : (
              <button
                type="button"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={() =>
                  setCategoryOpen(false)
                }
                className="
                  w-full
                  rounded-lg
                  px-3
                  py-3
                  text-left
                  text-sm
                "
              >
                <span className="font-medium text-foreground">
                  Use “{category}”
                </span>

                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Search using your custom
                  business category.
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* COUNTRY */}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
              h-11
              rounded-xl
              border-border
              bg-background
              px-3.5
            "
          >
            <SelectValue placeholder="Select country" />
          </SelectTrigger>

          <SelectContent className="max-h-72">
            {UNIQUE_COUNTRIES.map(
              (country) => (
                <SelectItem
                  key={country.code}
                  value={country.code}
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

      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0">
          <label className="mb-1.5 block truncate text-xs font-medium text-muted-foreground">
            State / Region
          </label>

          {states.length > 0 ? (
            <Select
              value={state}
              onValueChange={
                handleStateChange
              }
              disabled={!countryCode}
            >
              <SelectTrigger
                className="
                  h-11
                  rounded-xl
                  border-border
                  bg-background
                  px-3
                "
              >
                <SelectValue placeholder="State" />
              </SelectTrigger>

              <SelectContent className="max-h-72">
                {states.map((item) => (
                  <SelectItem
                    key={item.name}
                    value={item.name}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={state}
              onChange={(event) =>
                setState(
                  event.target.value,
                )
              }
              placeholder="State"
              disabled={!countryCode}
              className="
                h-11
                rounded-xl
                bg-background
              "
            />
          )}
        </div>

        <div className="min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            City
          </label>

          {cities.length > 0 ? (
            <Select
              value={city}
              onValueChange={setCity}
              disabled={!state}
            >
              <SelectTrigger
                className="
                  h-11
                  rounded-xl
                  border-border
                  bg-background
                  px-3
                "
              >
                <SelectValue placeholder="City" />
              </SelectTrigger>

              <SelectContent className="max-h-64">
                {cities.map((item) => (
                  <SelectItem
                    key={item}
                    value={item}
                  >
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={cityInput}
              onChange={(event) =>
                setCityInput(
                  event.target.value,
                )
              }
              placeholder="City"
              disabled={!countryCode}
              className="
                h-11
                rounded-xl
                bg-background
              "
            />
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="hero"
        size="lg"
        disabled={
          loading || !canSearch
        }
        className="
          h-11
          w-full
          rounded-xl
          text-sm
          font-semibold
        "
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Searching...
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
