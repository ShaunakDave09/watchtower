import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchFilterOptions } from "../api/client";
import type { FilterOptions, FilterState } from "../api/types";
import { useFilters } from "../hooks/useFilters";
import type { UseFiltersReturn } from "../hooks/useFilters";

interface FiltersContextValue extends UseFiltersReturn {
  options: FilterOptions | null;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

// Cascade order: business -> product -> subProduct -> journey -> version.
// Each field's real options only make sense given whatever's picked above
// it, so this is also the order we check for (and correct) an invalid
// selection in — see the effect below. `month` is appended even though it
// isn't part of this cascade (nothing narrows it, and it narrows nothing
// downstream) purely so a stale/removed month selection still gets snapped
// back to a real option whenever this correction pass happens to run.
const CASCADE_KEYS: (keyof Omit<FilterOptions, "dateRange">)[] = [
  "business",
  "product",
  "subProduct",
  "journey",
  "version",
  "month",
];

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const filters = useFilters(options?.dateRange);

  // Tracks the business/product/subProduct combo the date default was last
  // computed for — fetch_date_range (server/queries.py) only narrows by
  // those three, so a pure journey change re-runs this effect (it's in the
  // dependency array below) without actually changing the valid date span,
  // and shouldn't yank a manually-picked date back to "max" just because
  // journey changed. `null` initially so the very first resolution (app
  // load, still on the hardcoded DEFAULTS date) counts as "changed" too —
  // see the effect below.
  const comboKeyRef = useRef<string | null>(null);

  // FiltersProvider is mounted once, above the router's <Outlet/> (see
  // AppShell), so `filters` and `options` here are a single shared instance
  // for the whole app — every page's FilterModal/FilterBar reads and writes
  // the same state, and client-side navigation between pages never remounts
  // this provider. That's what makes filters "carry forward" across pages
  // automatically: there's nothing page-specific to sync.
  useEffect(() => {
    // Reads `draft`, not `filters` (applied): this cascade needs to track
    // whatever's currently being edited in the modal — Product's option
    // list should narrow the moment Business is changed there, not only
    // after Apply is clicked — while the corrections it computes still
    // write through to *both* draft and applied immediately (correctField/
    // correctDate) rather than waiting on Apply, since a stale/invalid
    // default is the app fixing itself, not a pending user edit. Before
    // the modal's ever been opened, draft and filters are the same object
    // anyway (see useFilters), so this behaves identically to reading
    // `filters` at mount time / everywhere outside the modal.
    fetchFilterOptions({
      business: filters.draft.business,
      product: filters.draft.product,
      subProduct: filters.draft.subProduct,
      journey: filters.draft.journey,
    }).then((opts) => {
      setOptions(opts);

      // Cascading correction: business/product/subProduct/journey/version
      // were all picked before we knew what the real data actually
      // contains (either the hardcoded starting DEFAULTS, or a value that
      // was valid under a since-changed upstream field — e.g. switching
      // business away from the one a previously-picked product belonged
      // to). Walk the cascade top-down and snap the *first* field whose
      // current value isn't among its freshly-fetched options to that
      // field's first real option, then stop.
      //
      // Only fixing one level per pass (instead of all of them at once) is
      // deliberate: correcting `product` changes `filters.draft.product`,
      // which re-triggers this same effect (it's in the dependency array
      // below) with the corrected upstream value — and *that* re-fetch is
      // what produces a trustworthy subProduct list to validate against
      // next. Correcting subProduct in this same pass would validate it
      // against a list that was fetched using the *old*, since-replaced
      // product, which could easily approve a combination that doesn't
      // actually exist. Re-running the effect per level is an extra
      // request or two, but it's the only way each correction is checked
      // against options that reflect the correction before it.
      for (const key of CASCADE_KEYS) {
        const validValues = opts[key];
        const current = filters.draft[key as keyof FilterState];
        if (validValues.length > 0 && !validValues.includes(current)) {
          filters.correctField(key as keyof FilterState, validValues[0]);
          break;
        }
      }

      // business/product/subProduct narrow opts.dateRange (see
      // FilterOptions.dateRange). When that combo actually changes, default
      // the date to its most recent real day — "show me what's happening
      // now" for whatever's newly selected, rather than leaving behind
      // whatever date the previous combo happened to be looking at just
      // because it's still technically in range. A pure journey/version/
      // platform/month change (combo unchanged) leaves a manually-picked
      // date alone, only clamping it if it's now genuinely out of bounds
      // (e.g. the combo's own range shifted under it).
      const { min, max } = opts.dateRange;
      const comboKey = `${filters.draft.business}|${filters.draft.product}|${filters.draft.subProduct}`;
      if (comboKeyRef.current !== comboKey) {
        comboKeyRef.current = comboKey;
        if (max) filters.correctDate(max);
      } else {
        const currentDate = filters.draft.date;
        if (min && currentDate < min) {
          filters.correctDate(min);
        } else if (max && currentDate > max) {
          filters.correctDate(max);
        }
      }
    });
    // Only the four fields that actually drive the cascade belong here.
    // `filters.set`/`filters.correctField` and the whole `draft`/`filters`
    // objects are intentionally excluded — including them would refetch on
    // every keystroke-equivalent change (platform, date range) that the
    // cascade doesn't care about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.draft.business, filters.draft.product, filters.draft.subProduct, filters.draft.journey]);

  return <FiltersContext.Provider value={{ ...filters, options }}>{children}</FiltersContext.Provider>;
}

export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return ctx;
}
