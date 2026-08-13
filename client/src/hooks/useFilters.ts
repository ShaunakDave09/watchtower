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
// journey/version default to ALL_FILTER_VALUE rather than a specific guess:
// unlike business/product/subProduct (which always need one real value to
// mean anything), these two are optional refinements the user picks
// manually — starting on "All" shows the aggregate across every journey/
// version rather than an arbitrarily-narrowed one.
const DEFAULTS: FilterState = {
  business: "Payments",
  product: "Checkout",
  subProduct: "Express Pay",
  journey: ALL_FILTER_VALUE,
  version: ALL_FILTER_VALUE,
  platform: "App",
  from: "2026-04-01",
  to: "2026-06-30",
};

export interface CalendarDay {
  date: number;
  iso: string;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  onClick: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toTime(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

export function useFilters() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULTS);
  const [pendingEnd, setPendingEnd] = useState(false);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(3); // 0-indexed: April

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function handleDay(iso: string) {
    const t = toTime(iso);
    const f = toTime(filters.from);
    if (!pendingEnd) {
      setFilters((s) => ({ ...s, from: iso, to: "" }));
      setPendingEnd(true);
    } else if (t >= f) {
      setFilters((s) => ({ ...s, to: iso }));
      setPendingEnd(false);
    } else {
      setFilters((s) => ({ ...s, from: iso, to: "" }));
      setPendingEnd(true);
    }
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

  function buildDays(year: number, month: number): (CalendarDay | null)[] {
    const startW = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const fT = toTime(filters.from);
    const tT = filters.to ? toTime(filters.to) : null;
    const cells: (CalendarDay | null)[] = [];
    for (let i = 0; i < startW; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cT = new Date(year, month, d).getTime();
      cells.push({
        date: d,
        iso,
        isStart: cT === fT,
        isEnd: tT !== null && cT === tT,
        inRange: tT !== null && cT > fT && cT < tT,
        onClick: () => handleDay(iso),
      });
    }
    while (cells.length < 42) cells.push(null);
    return cells;
  }

  const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYearForMonth = viewMonth === 11 ? viewYear + 1 : viewYear;

  const daysLeft = useMemo(
    () => buildDays(viewYear, viewMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewYear, viewMonth, filters.from, filters.to],
  );
  const daysRight = useMemo(
    () => buildDays(nextYearForMonth, nextMonthIdx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewYear, viewMonth, filters.from, filters.to],
  );

  const chips = [
    { cat: "Business", val: filters.business },
    { cat: "Product", val: filters.product },
    { cat: "Sub-product", val: filters.subProduct },
    { cat: "Journey", val: filters.journey },
    { cat: "Version", val: filters.version },
    { cat: "Platform", val: filters.platform },
    { cat: "Dates", val: `${fmtShort(filters.from)} – ${filters.to ? fmtShort(filters.to) : "…"}` },
  ];

  return {
    open,
    setOpen,
    filters,
    set,
    chips,
    fromLabel: fmtShort(filters.from),
    toLabel: filters.to ? fmtShort(filters.to) : "Select end date",
    monthLabelLeft: `${MONTHS[viewMonth]} ${viewYear}`,
    monthLabelRight: `${MONTHS[nextMonthIdx]} ${nextYearForMonth}`,
    daysLeft,
    daysRight,
    prevMonth: () => shiftMonth(-1),
    nextMonth: () => shiftMonth(1),
    reset: () => {
      setFilters(DEFAULTS);
      setPendingEnd(false);
      setViewYear(2026);
      setViewMonth(3);
    },
  };
}

export type UseFiltersReturn = ReturnType<typeof useFilters>;
