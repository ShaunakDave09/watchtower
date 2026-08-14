import { useMemo, useState } from "react";
import { ALL_FILTER_VALUE } from "../api/types";
import type { FilterState } from "../api/types";

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
  onClick: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

export function useFilters() {
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

  const days = useMemo((): (CalendarDay | null)[] => {
    const startW = new Date(viewYear, viewMonth, 1).getDay();
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (CalendarDay | null)[] = [];
    for (let i = 0; i < startW; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        date: d,
        iso,
        isSelected: iso === filters.date,
        onClick: () => selectDate(iso),
      });
    }
    while (cells.length < 42) cells.push(null);
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, filters.date]);

  const chips = [
    { cat: "Business", val: filters.business },
    { cat: "Product", val: filters.product },
    { cat: "Sub-product", val: filters.subProduct },
    { cat: "Journey", val: filters.journey },
    { cat: "Version", val: filters.version },
    { cat: "Month", val: filters.month },
    { cat: "Platform", val: filters.platform },
    { cat: "Date", val: fmtShort(filters.date) },
  ];

  return {
    open,
    setOpen,
    filters,
    set,
    chips,
    dateLabel: fmtShort(filters.date),
    monthLabel: `${MONTHS[viewMonth]} ${viewYear}`,
    days,
    prevMonth: () => shiftMonth(-1),
    nextMonth: () => shiftMonth(1),
    reset: () => {
      setFilters(DEFAULTS);
      setViewYear(2026);
      setViewMonth(3);
    },
  };
}

export type UseFiltersReturn = ReturnType<typeof useFilters>;
