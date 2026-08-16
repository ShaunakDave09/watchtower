import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOverview, fetchTrends, fetchFunnelEntrypoints } from "../api/client";
import type { ComparisonStageRow, EntrypointData, OverviewData, TrendsData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import { fmtShort, shiftIsoDate } from "../hooks/useFilters";
import KpiCard from "../components/overview/KpiCard";
import FunnelChart from "../components/overview/FunnelChart";
// import RetentionHeatmap from "../components/overview/RetentionHeatmap";
import PacingChart from "../components/trends/PacingChart";
import ComparisonPanel from "../components/funnelDetail/ComparisonPanel";
import OpportunityCard from "../components/overview/OpportunityCard";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import FiltersButton from "../components/filters/FiltersButton";
import Panel from "../components/ui/Panel";
import LoadError from "../components/ui/LoadError";

// Same funnel this page's Signup -> Paid panel already hardcodes (see the
// FunnelChart panel's onClick below) — there's no per-funnel picker on this
// page yet, so both the pacing and entry-point data reuse it too.
const OVERVIEW_FUNNEL_ID = "guest-checkout";

// bySource's stage-by-stage counts (see EntrypointData) are raw users, not
// the conversion percentages ComparisonPanel's rows expect — the same
// stage.users/stages[0].users ratio SourceFunnelCard already uses to draw
// its own per-source bars. Matching best.source/worst.source by name (not
// index) since bySource isn't sorted by quality.
function buildEntrypointComparisonRows(entrypoints: EntrypointData): ComparisonStageRow[] {
  const best = entrypoints.bySource.find((s) => s.name === entrypoints.best.source);
  const worst = entrypoints.bySource.find((s) => s.name === entrypoints.worst.source);
  if (!best || !worst) return [];
  const bestBase = best.stages[0]?.users || 1;
  const worstBase = worst.stages[0]?.users || 1;
  const n = Math.min(best.stages.length, worst.stages.length);
  const rows: ComparisonStageRow[] = [];
  for (let i = 0; i < n; i++) {
    // toFixed(1) then back through Number() so e.g. 100.0 -> "100%" but
    // 9.14 -> "9.1%" — matches the fixture's own (hand-authored) rounding,
    // which drops the decimal only when it's a flat zero.
    const bestPct = Number(((best.stages[i].users / bestBase) * 100).toFixed(1));
    const worstPct = Number(((worst.stages[i].users / worstBase) * 100).toFixed(1));
    rows.push({ stage: best.stages[i].label, app: `${bestPct}%`, web: `${worstPct}%` });
  }
  return rows;
}

function buildEntrypointCallout(entrypoints: EntrypointData): string {
  const { best, worst } = entrypoints;
  if (!worst.quality) return `${best.source} is the only entry point converting at all.`;
  const ratio = (best.quality / worst.quality).toFixed(1);
  return `${best.source} converts ${ratio}× better than ${worst.source}`;
}

export default function Overview() {
  const navigate = useNavigate();
  const filters = useFiltersContext();
  const todayLabel = fmtShort(filters.filters.date);
  const yesterdayLabel = fmtShort(shiftIsoDate(filters.filters.date, -1));
  const [data, setData] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [entrypoints, setEntrypoints] = useState<EntrypointData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchOverview(filters.filters)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filters, reloadKey]);

  // /api/trends takes the same filters as everywhere else, but this panel
  // only ever reads `pacing` off the response — hourly/pacing have no
  // hour-of-day data to query yet (see get_trends), so they're always the
  // same fixture values regardless of what's passed here. Still refetching
  // on filter change for consistency with every other filter-driven call
  // in the app, and in case pacing gets wired to something real later.
  // Entrypoints are looked up by funnel id only (see EntrypointPerformance),
  // so that one has nothing to depend on beyond mount. Both are kept as a
  // soft failure (logged, not surfaced via the page's LoadError): these two
  // panels are a bonus on top of the main Overview data, not load-bearing
  // for the page the way `data` is.
  useEffect(() => {
    fetchTrends(filters.filters)
      .then(setTrends)
      .catch((e) => console.error("Failed to load trends for Today's pacing panel", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filters]);

  useEffect(() => {
    fetchFunnelEntrypoints(OVERVIEW_FUNNEL_ID)
      .then(setEntrypoints)
      .catch((e) => console.error("Failed to load entrypoints for comparison panel", e));
  }, []);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="px-7 pb-[4px] pt-[14px]">
        <div className="flex items-center gap-3">
          <div className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
            Digital360
          </div>
          <div className="flex-1" />
          <FiltersButton />
        </div>
        <FilterBar />
        <FilterModal />
      </div>

      <div className="grid grid-cols-4 gap-3 px-7 pb-2 pt-2">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] gap-3 px-7 pb-4 pt-2">
        <Panel
          className="cursor-pointer overflow-y-auto p-4 px-[18px] transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(58,47,38,0.25)]"
          onClick={() => navigate("/funnels/guest-checkout")}
        >
          <div className="mb-2 flex items-baseline gap-[10px]">
            <div className="text-[15px] font-semibold text-[var(--color-ink)]">{data.funnel.title}</div>
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-[var(--color-muted)]">conv</div>
            <div className="text-[16px] font-bold text-[var(--color-accent)]">{data.funnel.convPct}</div>
          </div>
          {/* overflow-y-auto (not -hidden) on the Panel above: this funnel's
              stage count is data-driven and can run well past the handful
              the fixed-height left column was originally sized for (up to
              13 stages for some filter combos) — FunnelChart's SVG grows
              taller with each stage, and clipping it via overflow-hidden
              silently hid the bottom of the funnel instead of letting the
              panel scroll to it. */}
          <FunnelChart steps={data.funnel.steps} />
          <div className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">
            Click to view full {data.funnel.totalStages}-stage breakdown →
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {/* <Panel className="overflow-hidden p-4 px-[18px]">
            <div className="mb-2 text-[15px] font-semibold text-[var(--color-ink)]">Weekly retention</div>
            <RetentionHeatmap
              weekLabels={data.retention.weekLabels}
              cohorts={data.retention.cohorts}
              callout={data.retention.callout}
            />
          </Panel> */}

          <Panel
            className="flex-none cursor-pointer overflow-hidden p-4 px-[18px] transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(58,47,38,0.25)]"
            onClick={() => navigate("/trends")}
          >
            <div className="text-[15px] font-semibold text-[var(--color-ink)]">Today's pacing</div>
            <div className="mb-2 font-mono text-[10px] text-[var(--color-faint)]">CONVERSION RATE THROUGH CURRENT HOUR</div>
            {trends ? (
              <>
                <PacingChart pacing={trends.pacing} />
                <div className="mt-2 flex items-center gap-[14px]">
                  <span className="flex items-center gap-[6px] font-mono text-[10px] text-[var(--color-faint)]">
                    <span className="inline-block h-[2px] w-[12px]" style={{ background: "var(--color-accent)" }} />
                    {todayLabel}
                  </span>
                  <span className="flex items-center gap-[6px] font-mono text-[10px] text-[var(--color-faint)]">
                    <span className="inline-block h-[2px] w-[12px]" style={{ borderTop: "2px dashed var(--color-faint)" }} />
                    Same time {yesterdayLabel}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-[9px]">
                  <span className="text-[22px] font-bold text-[var(--color-ink)]">{trends.pacing.nowValue}%</span>
                  <span className="font-mono text-[11px] text-[var(--color-success)]">{trends.pacing.nowDelta}</span>
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-[var(--color-faint)]">{trends.pacing.projectionText}</div>
              </>
            ) : (
              <div className="py-6 text-center font-mono text-[11px] text-[var(--color-muted)]">Loading…</div>
            )}
            <div className="mt-2 font-mono text-[10.5px] text-[var(--color-faint)]">Click to view trends →</div>
          </Panel>

          {entrypoints && (
            <div className="flex-none">
              <ComparisonPanel
                leftLabel={entrypoints.best.source}
                rightLabel={entrypoints.worst.source}
                leftShortLabel="BEST"
                rightShortLabel="WORST"
                leftValue={entrypoints.best.quality}
                rightValue={entrypoints.worst.quality}
                leftColor="var(--color-success)"
                rightColor="var(--color-danger)"
                subtitle="BEST vs WORST ENTRY POINT"
                calloutHtml={buildEntrypointCallout(entrypoints)}
                rows={buildEntrypointComparisonRows(entrypoints)}
                onClick={() => navigate(`/funnels/${OVERVIEW_FUNNEL_ID}/entrypoints`)}
              />
            </div>
          )}

          <OpportunityCard label={data.opportunity.label} html={data.opportunity.html} />
        </div>
      </div>
    </div>
  );
}
