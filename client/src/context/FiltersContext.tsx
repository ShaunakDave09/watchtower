import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchFilterOptions } from "../api/client";
import type { FilterOptions, FilterSelection, FilterState } from "../api/types";
import { useFilters } from "../hooks/useFilters";
import type { UseFiltersReturn } from "../hooks/useFilters";

interface FiltersContextValue extends UseFiltersReturn {
  options: FilterOptions | null;
  // False until the cascade has resolved once, i.e. until `filters` has been
  // validated against the warehouse rather than being the hardcoded DEFAULTS.
  // Pages gate their own fetches on this so they don't request data for a
  // provisional selection and then immediately request it again for the
  // corrected one — on a cold load that was two or three rounds of every
  // page endpoint, all racing the cascade for the browser's handful of
  // per-origin connections. Set even when the cascade *fails* (fixture
  // fallback), so a backend problem degrades to "pages load with defaults"
  // rather than "pages never load".
  ready: boolean;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

// Identity of a cascade request: two drafts with the same key resolve to the
// same options and the same corrected selection, so there's no reason to ask
// the server twice. Used both to skip redundant fetches and — once a response
// comes back — to recognize that the corrected selection it carries is
// already fully resolved and must not trigger a follow-up request.
function cascadeKey(selection: Partial<FilterSelection>): string {
  return [
    selection.business,
    selection.product,
    selection.subProduct,
    selection.journey,
    selection.version,
    selection.month,
  ].join("|");
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [ready, setReady] = useState(false);
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

  // The cascade key we've already fully resolved. Set from the *corrected*
  // selection in each response, which is what stops the effect from chasing
  // its own tail: applying a correction changes `draft`, which re-runs this
  // effect, and without this the re-run would fire a second request whose
  // answer we already have.
  const resolvedKeyRef = useRef<string | null>(null);

  // Monotonic request id. Only the newest request is allowed to write state —
  // an older reply that lands late must not call setOptions()/apply a
  // selection derived from a business the user has since moved off, which
  // would "correct" the current draft against the wrong option lists and
  // kick off yet another request.
  const requestSeqRef = useRef(0);

  // FiltersProvider is mounted once, above the router's <Outlet/> (see
  // AppShell), so `filters` and `options` here are a single shared instance
  // for the whole app — every page's FilterModal/FilterBar reads and writes
  // the same state, and client-side navigation between pages never remounts
  // this provider. That's what makes filters "carry forward" across pages
  // automatically: there's nothing page-specific to sync.
  useEffect(() => {
    // Reads `draft`, not `filters` (applied): the cascade has to track
    // whatever's being edited in the modal — Product's option list should
    // narrow the moment Business changes there, not only after Apply. Before
    // the modal's ever been opened the two are identical (see useFilters),
    // so this behaves the same as reading `filters` everywhere else.
    const requested: FilterSelection = {
      business: filters.draft.business,
      product: filters.draft.product,
      subProduct: filters.draft.subProduct,
      journey: filters.draft.journey,
      version: filters.draft.version,
      month: filters.draft.month,
    };
    const requestedKey = cascadeKey(requested);
    // Already resolved — this run is the echo of our own correction landing
    // in `draft`, not a new user selection.
    if (resolvedKeyRef.current === requestedKey) return;

    const controller = new AbortController();
    const seq = ++requestSeqRef.current;

    fetchFilterOptions(requested, controller.signal)
      .then((opts) => {
        if (seq !== requestSeqRef.current) return; // superseded mid-flight
        setOptions(opts);

        // The server resolved the whole cascade in this one response:
        // business/product/subProduct/journey/version/month each validated
        // against options computed from the already-corrected fields above
        // it (see fetch_filter_options). Previously the client did that
        // itself, one field per response, re-requesting after each fix — so
        // changing a business meant a serial chain of round trips and the
        // product list stayed wrong until the second reply came back.
        //
        // `selection` is null only when the cascade query failed and `opts`
        // is the fixture fallback; that has no authority to correct
        // anything, so the draft is left exactly as the user had it.
        const corrected: Partial<FilterState> = { ...(opts.selection ?? {}) };

        // business/product/subProduct narrow opts.dateRange (see
        // FilterOptions.dateRange). When that combo actually changes,
        // default the date to its most recent real day — "show me what's
        // happening now" for whatever's newly selected, rather than keeping
        // whatever date the previous combo happened to be on just because
        // it's still technically in range. A pure journey/version/platform/
        // month change (combo unchanged) leaves a manually-picked date
        // alone, only clamping it if it's now genuinely out of bounds.
        const { min, max } = opts.dateRange;
        const settled = { ...requested, ...corrected };
        const comboKey = `${settled.business}|${settled.product}|${settled.subProduct}`;
        if (comboKeyRef.current !== comboKey) {
          comboKeyRef.current = comboKey;
          if (max) corrected.date = max;
        } else {
          const currentDate = filters.draft.date;
          if (min && currentDate < min) corrected.date = min;
          else if (max && currentDate > max) corrected.date = max;
        }

        // Mark the corrected selection resolved *before* applying it, so the
        // re-run this triggers sees a matching key and returns immediately
        // instead of issuing a redundant request. One user action, one
        // request — that's what keeps clicks from stacking up.
        resolvedKeyRef.current = cascadeKey(settled);
        filters.applyResolvedSelection(corrected);
        setReady(true);
      })
      .catch((e) => {
        // An abort is this effect doing its job (a newer selection replaced
        // this request), not a failure worth reporting — and crucially not a
        // reason to unblock the pages, since a newer request is already in
        // flight and will do it.
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Failed to load filter options", e);
        // Couldn't validate the selection at all. Let the pages fetch with
        // what they have rather than leaving the whole app on "Loading…".
        setReady(true);
      });

    return () => controller.abort();
    // Only the fields the cascade actually resolves belong here. `platform`
    // and `date` are excluded on purpose — neither narrows any dropdown, so
    // including them would refetch the whole cascade for a change it can't
    // affect. The `filters` helpers are excluded because they're recreated
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.draft.business,
    filters.draft.product,
    filters.draft.subProduct,
    filters.draft.journey,
    filters.draft.version,
    filters.draft.month,
  ]);

  return <FiltersContext.Provider value={{ ...filters, options, ready }}>{children}</FiltersContext.Provider>;
}

export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return ctx;
}
