import { createContext, useContext, useEffect, useState } from "react";
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
// selection in — see the effect below.
const CASCADE_KEYS: (keyof FilterOptions)[] = ["business", "product", "subProduct", "journey", "version"];

export function FiltersProvider({ children }: { children: ReactNode }) {
  const filters = useFilters();
  const [options, setOptions] = useState<FilterOptions | null>(null);

  // FiltersProvider is mounted once, above the router's <Outlet/> (see
  // AppShell), so `filters` and `options` here are a single shared instance
  // for the whole app — every page's FilterModal/FilterBar reads and writes
  // the same state, and client-side navigation between pages never remounts
  // this provider. That's what makes filters "carry forward" across pages
  // automatically: there's nothing page-specific to sync.
  useEffect(() => {
    fetchFilterOptions({
      business: filters.filters.business,
      product: filters.filters.product,
      subProduct: filters.filters.subProduct,
      journey: filters.filters.journey,
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
      // deliberate: correcting `product` changes `filters.filters.product`,
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
        const current = filters.filters[key as keyof FilterState];
        if (validValues.length > 0 && !validValues.includes(current)) {
          filters.set(key as keyof FilterState, validValues[0]);
          break;
        }
      }
    });
    // Only the four fields that actually drive the cascade belong here.
    // `filters.set` and `filters.filters` (whole object) are intentionally
    // excluded — including them would refetch on every keystroke-equivalent
    // change (platform, date range) that the cascade doesn't care about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filters.business, filters.filters.product, filters.filters.subProduct, filters.filters.journey]);

  return <FiltersContext.Provider value={{ ...filters, options }}>{children}</FiltersContext.Provider>;
}

export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return ctx;
}
