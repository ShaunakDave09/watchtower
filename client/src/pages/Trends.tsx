import { useCallback, useRef, useEffect, useState } from "react";
import { fetchTrends } from "../api/client";
import type { TrendsData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import { fmtShort, shiftIsoDate } from "../hooks/useFilters";
import Panel from "../components/ui/Panel";
import HourlyThroughputChart from "../components/trends/HourlyThroughputChart";
import PacingChart from "../components/trends/PacingChart";
import ConversionTrendMultiLine from "../components/trends/ConversionTrendMultiLine";
import DailyHourlyToggle from "../components/trends/DailyHourlyToggle";
import type { TrendGranularity } from "../components/trends/DailyHourlyToggle";
import SeriesMultiSelect from "../components/trends/SeriesMultiSelect";
import FiltersButton from "../components/filters/FiltersButton";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import LoadError from "../components/ui/LoadError";

// Measures an element's actual rendered height and keeps it in sync as the
// element resizes (e.g. the window narrowing, which changes the chart
// SVG's height since it scales with its container's width via viewBox).
// TrendPanel uses this on the chart wrapper so the legend column next to it
// can be pinned to that exact pixel height via `maxHeight` — a plain
// flexbox `items-stretch` isn't enough here: stretch derives the row's
// height from the *tallest* child's own natural content size, so a legend
// list with many rows would just grow the whole row (and the chart with
// it) to fit every label instead of ever actually engaging its
// `overflow-y-auto` scrollbar.
//
// A callback ref (not a plain useRef + a mount-only useEffect) is what
// makes this actually work: the chart wrapper this measures only exists in
// the DOM once at least one series is selected ("No series selected" renders
// in its place otherwise), and `selected` starts as an empty Set that a
// separate effect populates asynchronously right after data loads — so the
// chart div doesn't exist yet on TrendPanel's first mount. A plain ref's
// mount-only effect would see `ref.current === null` at that point and
// never re-run once the div actually appears a render later. A callback ref
// fires every time React attaches (or detaches) the DOM node, so it
// correctly (re)attaches the observer whenever the chart div comes and goes.
function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setHeight(h);
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);
  return [ref, height] as const;
}

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-[6px] font-mono text-[10px] text-[var(--color-faint)]">
      <span
        className="inline-block h-[2px] w-[12px]"
        style={{ background: dashed ? "none" : color, borderTop: dashed ? `2px dashed ${color}` : undefined }}
      />
      {label}
    </span>
  );
}

// Shared by both trend panels below: a title/subtitle on the left, the
// series multi-select + Daily|Hourly toggle on the right, then the chart
// itself — the only thing that differs between "Conversion rate trend" and
// "Stage-wise trends" is which series set feeds it and what the lines
// represent (a %, vs. a raw user count). Daily vs. Hourly is resolved by
// the caller (Trends picks conversionTrend vs. hourlyConversionTrend, etc.
// — both already came down in the same response, so switching modes here
// is instant, no refetch).
function TrendPanel({
  title,
  subtitleBase,
  granularity,
  onGranularityChange,
  dates,
  allSeries,
  selected,
  onSelectedChange,
}: {
  title: string;
  subtitleBase: string;
  granularity: TrendGranularity;
  onGranularityChange: (v: TrendGranularity) => void;
  dates: string[];
  allSeries: TrendsData["conversionTrend"]["series"];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const visibleSeries = allSeries.filter((s) => selected.has(s.key));
  const [chartRef, chartHeight] = useElementHeight<HTMLDivElement>();
  return (
    <Panel className="p-[20px]">
      <div className="mb-1 flex items-baseline gap-3">
        <div className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <SeriesMultiSelect options={allSeries} selected={selected} onChange={onSelectedChange} />
          <DailyHourlyToggle value={granularity} onChange={onGranularityChange} />
        </div>
      </div>
      <div className="mb-3 font-mono text-[10px] text-[var(--color-faint)]">
        {subtitleBase}, {granularity.toUpperCase()}
      </div>
      {visibleSeries.length > 0 ? (
        // Series labels live in their own scrollable column to the right
        // of the chart instead of a row above it — with up to ~13 series
        // for a deep funnel, a wrapping row above the chart either grew
        // tall enough to push the chart down or ran off the edge; a fixed-
        // width column that scrolls its own overflow keeps the chart's
        // height stable regardless of how many series are showing.
        // The legend's `maxHeight` is pinned to the chart's own measured
        // height (via useElementHeight + ResizeObserver on the chart
        // wrapper) rather than left to `items-stretch`: stretch alone would
        // just grow the whole row — chart included — to fit every label
        // instead of ever letting the legend's overflow-y-auto actually
        // scroll. `items-start` keeps the chart from being stretched to
        // match the (now independently capped) legend column.
        <div className="flex items-start gap-4">
          <div ref={chartRef} className="min-w-0 flex-1">
            <ConversionTrendMultiLine dates={dates} series={visibleSeries} />
          </div>
          <div className="w-[170px] flex-none overflow-y-auto" style={{ maxHeight: chartHeight ?? 200 }}>
            <div className="flex flex-col gap-[8px]">
              {visibleSeries.map((s) => (
                <div key={s.key} className="flex items-center gap-[6px] font-mono text-[10px] text-[var(--color-faint)]">
                  <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: s.color }} />
                  <span className="truncate" title={s.label}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[140px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] font-mono text-[12px] text-[var(--color-muted)]">
          No series selected
        </div>
      )}
    </Panel>
  );
}

export default function Trends() {
  const filters = useFiltersContext();
  const todayLabel = fmtShort(filters.filters.date);
  const yesterdayLabel = fmtShort(shiftIsoDate(filters.filters.date, -1));
  const [data, setData] = useState<TrendsData | null>(null);
  const [conversionMode, setConversionMode] = useState<TrendGranularity>("daily");
  const [stageMode, setStageMode] = useState<TrendGranularity>("daily");
  const [conversionSelected, setConversionSelected] = useState<Set<string>>(new Set());
  const [stageSelected, setStageSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Hold off until the filter cascade has validated the selection —
    // fetching for the provisional DEFAULTS and then again for the
    // corrected values doubled every cold load's requests (see
    // FiltersContext's `ready`).
    if (!filters.ready) return;
    setError(null);
    fetchTrends(filters.filters)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Refetch whenever any active filter or the selected date changes —
    // same dependency shape as the other filter-driven pages (see
    // FunnelDetail.tsx). The trend windows themselves are fixed server-side
    // (see get_trends), not user-picked ranges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.ready, filters.filters, reloadKey]);

  const conversionTrend = conversionMode === "daily" ? data?.conversionTrend : data?.hourlyConversionTrend;
  const stageTrend = stageMode === "daily" ? data?.stageTrend : data?.hourlyStageTrend;

  // Default to showing every series — the multi-select narrows from there.
  // Reseeded whenever new data arrives (a filter/date change can return an
  // entirely different stage set) or the Daily|Hourly toggle flips (the
  // two modes' series aren't the same set, e.g. a 13-stage daily funnel vs.
  // whatever stages actually have hourly rows for just the selected date).
  useEffect(() => {
    if (conversionTrend) setConversionSelected(new Set(conversionTrend.series.map((s) => s.key)));
  }, [conversionTrend]);
  useEffect(() => {
    if (stageTrend) setStageSelected(new Set(stageTrend.series.map((s) => s.key)));
  }, [stageTrend]);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data || !conversionTrend || !stageTrend) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <div className="px-7 py-[22px]">
      <div className="mb-1 flex items-start gap-4">
        <div className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">Trends</div>
        <div className="flex-1" />
        <FiltersButton />
      </div>

      <FilterBar />
      <FilterModal />

      <div className="mb-5 mt-3 font-mono text-[11px] text-[var(--color-faint)]">{data.subtitle}</div>

      <div className="mb-3 flex items-center gap-[8px]">
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-danger)]" />
        <span className="text-[14px] font-semibold text-[var(--color-ink)]">Today, hour by hour</span>
        <span className="font-mono text-[10px] text-[var(--color-faint)]">{data.hourly.liveLabel}</span>
      </div>

      <div className="mb-4 grid grid-cols-[1.4fr_1fr] gap-3">
        <Panel className="p-[20px]">
          <div className="mb-1 flex items-baseline gap-3">
            <div className="text-[14px] font-semibold text-[var(--color-ink)]">Hourly throughput &amp; conversion</div>
            <div className="flex-1" />
            <div className="flex items-center gap-[12px]">
              <LegendDot color="var(--color-accent-light)" label="Entrants" />
              <LegendDot color="var(--color-ink)" label="Curr. conv." />
              <LegendDot color="var(--color-quiet)" label="Last 7d avg" />
            </div>
          </div>
          <div className="mb-3 font-mono text-[10px] text-[var(--color-faint)]">
            LAST 24H · CONV. RATE VS. TRAILING 7-DAY SAME-HOUR AVERAGE
          </div>
          <HourlyThroughputChart hourly={data.hourly} />
          {data.hourly.alertHtml && (
            <div className="mt-3 rounded-[8px] bg-[var(--color-danger-soft)] px-[14px] py-[10px] font-mono text-[11.5px] leading-[1.45] text-[var(--color-danger)]">
              <span dangerouslySetInnerHTML={{ __html: data.hourly.alertHtml }} />
            </div>
          )}
        </Panel>

        <Panel className="p-[20px]">
          <div className="text-[14px] font-semibold text-[var(--color-ink)]">Today's pacing</div>
          <div className="mb-3 font-mono text-[10px] text-[var(--color-faint)]">CONVERSION RATE THROUGH CURRENT HOUR</div>
          <PacingChart pacing={data.pacing} />
          <div className="mt-2 flex items-center gap-[14px]">
            <LegendDot color="var(--color-accent)" label={todayLabel} />
            <LegendDot color="var(--color-faint)" label={`Same time ${yesterdayLabel}`} dashed />
          </div>
          <div className="mt-4 flex items-baseline gap-[9px]">
            <span className="text-[26px] font-bold text-[var(--color-ink)]">{data.pacing.nowValue}%</span>
            <span className="font-mono text-[12px] text-[var(--color-success)]">{data.pacing.nowDelta}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">{data.pacing.projectionText}</div>
        </Panel>
      </div>

      <div className="flex flex-col gap-3">
        <TrendPanel
          title="Conversion rate trend"
          subtitleBase="% OF ENTRANTS REACHING EACH STAGE"
          granularity={conversionMode}
          onGranularityChange={setConversionMode}
          dates={conversionTrend.dates}
          allSeries={conversionTrend.series}
          selected={conversionSelected}
          onSelectedChange={setConversionSelected}
        />
        <TrendPanel
          title="Stage-wise trends"
          subtitleBase="USERS REACHING EACH STAGE"
          granularity={stageMode}
          onGranularityChange={setStageMode}
          dates={stageTrend.dates}
          allSeries={stageTrend.series}
          selected={stageSelected}
          onSelectedChange={setStageSelected}
        />
      </div>
    </div>
  );
}
