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
export function useFilters(dateRange?: DateRange) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULTS);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(3); // 0-indexed: April

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function selectDate(iso: string) {
    set("date", iso);
  }

  // Sets the selected date *and* moves the calendar view to that date's
  // month — used when a filter change (e.g. narrower business/product)
  // pushes the previously-selected date outside the new range, so the
  // corrected date and the open calendar never disagree about which month
  // is showing.
  function jumpToDate(iso: string) {
    const [y, m] = iso.split("-").map(Number);
    setFilters((f) => ({ ...f, date: iso }));
    setViewYear(y);
    setViewMonth(m - 1);
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
        isSelected: iso === filters.date,
        disabled,
        onClick: () => {
          if (!disabled) selectDate(iso);
        },
      });
    }
    while (cells.length < 42) cells.push(null);
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, filters.date, dateRange?.min, dateRange?.max]);

  // Month and Date are mutually exclusive, not just visually redundant —
  // picking a real month switches the backend to the monthly-summary query
  // path entirely (see fetch_month_funnel_steps/fetch_funnel_steps in
  // server/queries.py), which never looks at `date` at all. So once a
  // month is selected, the Date chip isn't just extra noise, it's actively
  // misleading (implying a day-level filter that no longer applies) —
  // drop it from the active-filters list rather than show a value that
  // doesn't do anything.
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
  const appliedCount =
    4 + // business, product, subProduct, platform
    (filters.journey !== ALL_FILTER_VALUE ? 1 : 0) +
    (filters.version !== ALL_FILTER_VALUE ? 1 : 0) +
    1; // month (if real) or date (if month is "All") — always exactly one

  return {
    open,
    setOpen,
    filters,
    set,
    jumpToDate,
    chips,
    appliedCount,
    dateLabel: fmtShort(filters.date),
    monthLabel: `${MONTHS[viewMonth]} ${viewYear}`,
    days,
    canGoPrev,
    canGoNext,
    prevMonth: () => canGoPrev && shiftMonth(-1),
    nextMonth: () => canGoNext && shiftMonth(1),
    reset: () => {
      setFilters(DEFAULTS);
      setViewYear(2026);
      setViewMonth(3);
    },
  };
}

export type UseFiltersReturn = ReturnType<typeof useFilters>;
