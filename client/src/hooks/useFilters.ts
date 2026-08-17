import { useMemo, useState } from "react";
import { ALL_FILTER_VALUE } from "../api/types";
import type { DateRange, FilterState } from "../api/types";

// Just a starting guess, shown before the real filter options have loaded
// (and used as-is if the backend ever has to fall back to the static
// fixture, whose values match these). Once FiltersContext fetches the real
// business/product/subProduct/journey/version lists from Postgres, it
// snaps any of these that don't actually exist in the live data to the
// first real option for that field — see the cascade-correction effect
// there. So these don't need to be "correct" for any particular warehouse,
// only a reasonable placeholder.
//
// journey/version/month default to ALL_FILTER_VALUE rather than a specific
// guess: unlike business/product/subProduct (which always need one real
// value to mean anything), these are optional refinements the user picks
// manually — starting on "All" shows the aggregate across every journey/
// version/month rather than an arbitrarily-narrowed one.
const DEFAULTS: FilterState = {
  business: "Payments",
  product: "Checkout",
  subProduct: "Express Pay",
  journey: ALL_FILTER_VALUE,
  version: ALL_FILTER_VALUE,
  month: ALL_FILTER_VALUE,
  platform: "App",
  date: "2026-04-01",
};

export interface CalendarDay {
  date: number;
  iso: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "YYYY-MM-DD" -> "Mon D" (e.g. "2026-04-01" -> "Apr 1") — exported so
// Today's-pacing-style "Today"/"Same time {date}" legends can format the
// selected filter date the same way the date chip/picker already do.
export function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

// Calendar-correct day offset on an ISO "YYYY-MM-DD" string (handles
// month/year boundaries, e.g. "2026-04-01" with days=-1 -> "2026-03-31") —
// used to derive "yesterday" from the selected filter date. Local-time
// Date arithmetic is fine here: these are calendar dates with no time-of-
// day component to get confused by a timezone offset.
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// "YYYY-MM" -> "Mon YYYY" (e.g. "2026-08" -> "Aug 2026") for display —
// exported so the filter modal's MONTH dropdown can format its options the
// same way. ALL_FILTER_VALUE ("All") isn't a "YYYY-MM" string, so it just
// passes through unchanged rather than matching and producing garbage.
export function fmtMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, y, m] = match;
  return `${MONTHS[Number(m) - 1].slice(0, 3)} ${y}`;
}

// Plain string comparison is correct here — "YYYY-MM-DD" sorts identically
// whether compared as strings or as dates, so no need to parse either side.
function isOutsideRange(iso: string, range?: DateRange): boolean {
  if (range?.min && iso < range.min) return true;
  if (range?.max && iso > range.max) return true;
  return false;
}

// `dateRange` bounds the calendar to whatever business/product/subProduct
// combination is currently selected (see FiltersContext, which passes
// options.dateRange in once it's loaded) — both the individual days and
// month navigation respect it, so there's no way to land on or even
// scroll to a day this combination has no data for at all.
//
// `filters` (returned below) and everything derived from it (chips,
// appliedCount) is deliberately a *separate* piece of state from what the
// modal's fields edit (`draft`): every page's fetch effect depends on
// `filters`, so if the modal wrote there directly, each individual field
// tweak — even reselecting the exact same date, which still produces a new
// object reference — would fire its own round of page-data requests.
// Instead, FilterModal's fields (and CalendarMonth's day cells) all read
// and write `draft`; nothing propagates to `filters` (and so to any page's
// fetch) until `applyFilters()` runs, which is only ever called from the
// "Apply filters" button. `cancelEdits()` (Cancel/✕/backdrop) discards
// whatever's in `draft` by resetting it back to `filters`.
//
// `correctField`/`correctDate` are a second, narrower write path used only
// by FiltersContext's cascade-correction (auto-fixing a stale/invalid
// default, or re-defaulting the date for a newly-selected business/product/
// subProduct combo). Whether that also reaches `filters` immediately
// (instead of waiting on Apply, like every other draft edit) depends on
// whether the modal is currently open: closed means there's no in-progress
// edit to protect — most commonly the very first correction pass right
// after mount, fixing a hardcoded default that doesn't exist in the real
// data — so writing straight to `filters` there is what makes the app
// self-heal without the user ever having to open the modal. Open means the
// user is actively mid-edit, and a downstream field this cascade also
// needs to correct (e.g. Product after a Business change invalidates it)
// should stay just as deferred as every other field they're touching —
// otherwise a single cascade-triggered correction would sneak a page-data
// refetch in ahead of Apply, the exact thing this draft/applied split
// exists to prevent.
export function useFilters(dateRange?: DateRange) {
  const [open, setOpenState] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULTS);
  const [draft, setDraft] = useState<FilterState>(DEFAULTS);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(3); // 0-indexed: April

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setDraft((f) => ({ ...f, [key]: value }));
  }

  function selectDate(iso: string) {
    set("date", iso);
  }

  function jumpToViewMonth(iso: string) {
    const [y, m] = iso.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  }

  // Opening the modal re-seeds the draft from whatever's currently applied
  // (normally a no-op — cancelEdits already keeps them in sync whenever the
  // modal is closed — but cheap insurance against drift) and snaps the
  // calendar view to that date's month, so it never opens showing a month
  // left over from a previous, cancelled browse-around.
  function setOpen(next: boolean) {
    if (next) {
      setDraft(filters);
      jumpToViewMonth(filters.date);
    }
    setOpenState(next);
  }

  function applyFilters() {
    setFilters(draft);
    setOpenState(false);
  }

  function cancelEdits() {
    setDraft(filters);
    setOpenState(false);
  }

  // System-driven correction, not a user edit in progress — see the block
  // comment above. Only reaches `filters` immediately while the modal is
  // closed (nothing pending to protect); while it's open, this stays
  // draft-only just like every other field edit, so it still needs Apply.
  function correctField<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setDraft((f) => ({ ...f, [key]: value }));
    if (!open) {
      setFilters((f) => ({ ...f, [key]: value }));
    }
  }

  // Same reasoning as correctField, plus moving the calendar view to the
  // corrected date's month so the (if open) modal and the corrected date
  // never disagree about which month is showing.
  function correctDate(iso: string) {
    setDraft((f) => ({ ...f, date: iso }));
    if (!open) {
      setFilters((f) => ({ ...f, date: iso }));
    }
    jumpToViewMonth(iso);
  }

  function shiftMonth(n: number) {
    let m = viewMonth + n;
    let y = viewYear;
    while (m < 0) {
      m += 12;
      y--;
    }
    while (m > 11) {
      m -= 12;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const viewYearMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const canGoPrev = !dateRange?.min || viewYearMonth > dateRange.min.slice(0, 7);
  const canGoNext = !dateRange?.max || viewYearMonth < dateRange.max.slice(0, 7);

  const days = useMemo((): (CalendarDay | null)[] => {
    const startW = new Date(viewYear, viewMonth, 1).getDay();
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (CalendarDay | null)[] = [];
    for (let i = 0; i < startW; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const disabled = isOutsideRange(iso, dateRange);
      cells.push({
        date: d,
        iso,
        isSelected: iso === draft.date,
        disabled,
        onClick: () => {
          if (!disabled) selectDate(iso);
        },
      });
    }
    while (cells.length < 42) cells.push(null);
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, draft.date, dateRange?.min, dateRange?.max]);

  // Month and Date are mutually exclusive, not just visually redundant —
  // picking a real month switches the backend to the monthly-summary query
  // path entirely (see fetch_month_funnel_steps/fetch_funnel_steps in
  // server/queries.py), which never looks at `date` at all. So once a
  // month is selected, the Date chip isn't just extra noise, it's actively
  // misleading (implying a day-level filter that no longer applies) —
  // drop it from the active-filters list rather than show a value that
  // doesn't do anything. Built from `filters` (applied), not `draft` — the
  // always-visible chip row should only ever reflect what's actually
  // driving the page's data, not an unsaved in-progress edit.
  const chips = [
    { cat: "Business", val: filters.business },
    { cat: "Product", val: filters.product },
    { cat: "Sub-product", val: filters.subProduct },
    { cat: "Journey", val: filters.journey },
    { cat: "Version", val: filters.version },
    { cat: "Month", val: fmtMonth(filters.month) },
    { cat: "Platform", val: filters.platform },
    ...(filters.month === ALL_FILTER_VALUE ? [{ cat: "Date", val: fmtShort(filters.date) }] : []),
  ];

  // How many filters are actually narrowing the data, for the Filters
  // button's badge — deliberately not chips.length. Business/Product/
  // Sub-product/Platform always count: none of them has an "All"/neutral
  // option, so whatever value they hold is always constraining the query.
  // Journey/Version only count when picked away from ALL_FILTER_VALUE,
  // their explicit "not filtering on this" state. The time dimension
  // (Month vs. Date) always contributes exactly one: a real Month replaces
  // Date as the active day-level constraint (see the chips list above), so
  // there's always exactly one "when" filter in effect, never zero or two.
  // Same as `chips`: counts `filters` (applied), not `draft`.
  const appliedCount =
    4 + // business, product, subProduct, platform
    (filters.journey !== ALL_FILTER_VALUE ? 1 : 0) +
    (filters.version !== ALL_FILTER_VALUE ? 1 : 0) +
    1; // month (if real) or date (if month is "All") — always exactly one

  return {
    open,
    setOpen,
    filters,
    draft,
    set,
    applyFilters,
    cancelEdits,
    correctField,
    correctDate,
    chips,
    appliedCount,
    // The modal's own DATE readout and month header — both reflect the
    // in-progress `draft`, not yet-applied `filters`.
    dateLabel: fmtShort(draft.date),
    monthLabel: `${MONTHS[viewMonth]} ${viewYear}`,
    days,
    canGoPrev,
    canGoNext,
    prevMonth: () => canGoPrev && shiftMonth(-1),
    nextMonth: () => canGoNext && shiftMonth(1),
    // "Reset all" is a deliberate, explicit action (not a per-field tweak),
    // so — like correctField/correctDate — it takes effect immediately
    // rather than waiting on a separate Apply click, matching what this
    // button already did before draft/applied were split.
    reset: () => {
      setDraft(DEFAULTS);
      setFilters(DEFAULTS);
      setViewYear(2026);
      setViewMonth(3);
    },
  };
}

export type UseFiltersReturn = ReturnType<typeof useFilters>;
