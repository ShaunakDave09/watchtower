import { useEffect, useState } from "react";
import { fetchTrends } from "../api/client";
import type { TrendsData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import Panel from "../components/ui/Panel";
import HourlyThroughputChart from "../components/trends/HourlyThroughputChart";
import PacingChart from "../components/trends/PacingChart";
import ConversionTrendMultiLine from "../components/trends/ConversionTrendMultiLine";
import DailyHourlyToggle from "../components/trends/DailyHourlyToggle";
import SeriesMultiSelect from "../components/trends/SeriesMultiSelect";
import FiltersButton from "../components/filters/FiltersButton";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import LoadError from "../components/ui/LoadError";

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

// Shared by both daily trend panels below: a title/subtitle on the left,
// the series multi-select + Daily|Hourly toggle on the right, then the
// chart itself — the only thing that differs between "Conversion rate
// trend" and "Stage-wise trends" is which series set feeds it and what the
// lines represent (a %, vs. a raw user count).
function TrendPanel({
  title,
  subtitle,
  dates,
  allSeries,
  selected,
  onSelectedChange,
}: {
  title: string;
  subtitle: string;
  dates: string[];
  allSeries: TrendsData["conversionTrend"]["series"];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const visibleSeries = allSeries.filter((s) => selected.has(s.key));
  return (
    <Panel className="p-[20px]">
      <div className="mb-1 flex items-baseline gap-3">
        <div className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <SeriesMultiSelect options={allSeries} selected={selected} onChange={onSelectedChange} />
          <DailyHourlyToggle />
        </div>
      </div>
      <div className="mb-3 flex items-center gap-[12px] font-mono text-[10px] text-[var(--color-faint)]">
        <span>{subtitle}</span>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center justify-end gap-[10px]">
          {visibleSeries.map((s) => (
            <span key={s.key} className="flex items-center gap-[5px]">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      {visibleSeries.length > 0 ? (
        <ConversionTrendMultiLine dates={dates} series={visibleSeries} />
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
  const [data, setData] = useState<TrendsData | null>(null);
  const [conversionSelected, setConversionSelected] = useState<Set<string>>(new Set());
  const [stageSelected, setStageSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchTrends(filters.filters)
      .then((d) => {
        setData(d);
        // Default to showing every series — the multi-select narrows from
        // there. Reseeded on every fetch since a filter/date change can
        // return a different stage set entirely (see get_trends).
        setConversionSelected(new Set(d.conversionTrend.series.map((s) => s.key)));
        setStageSelected(new Set(d.stageTrend.series.map((s) => s.key)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Refetch whenever any active filter or the selected date changes —
    // same dependency shape as the other filter-driven pages (see
    // FunnelDetail.tsx). The trend window itself is fixed (selected date
    // +/- 15 days, see get_trends), not a user-picked range anymore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filters, reloadKey]);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data) {
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
          <div className="mt-3 rounded-[8px] bg-[var(--color-danger-soft)] px-[14px] py-[10px] font-mono text-[11.5px] leading-[1.45] text-[var(--color-danger)]">
            <span dangerouslySetInnerHTML={{ __html: data.hourly.alertHtml }} />
          </div>
        </Panel>

        <Panel className="p-[20px]">
          <div className="text-[14px] font-semibold text-[var(--color-ink)]">Today's pacing</div>
          <div className="mb-3 font-mono text-[10px] text-[var(--color-faint)]">CONVERSION RATE THROUGH CURRENT HOUR</div>
          <PacingChart pacing={data.pacing} />
          <div className="mt-2 flex items-center gap-[14px]">
            <LegendDot color="var(--color-accent)" label="Today" />
            <LegendDot color="var(--color-faint)" label="Same time yesterday" dashed />
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
          subtitle="% OF ENTRANTS REACHING EACH STAGE, DAILY"
          dates={data.conversionTrend.dates}
          allSeries={data.conversionTrend.series}
          selected={conversionSelected}
          onSelectedChange={setConversionSelected}
        />
        <TrendPanel
          title="Stage-wise trends"
          subtitle="USERS REACHING EACH STAGE, DAILY"
          dates={data.stageTrend.dates}
          allSeries={data.stageTrend.series}
          selected={stageSelected}
          onSelectedChange={setStageSelected}
        />
      </div>
    </div>
  );
}
