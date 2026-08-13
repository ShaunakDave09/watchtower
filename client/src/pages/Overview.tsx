import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOverview } from "../api/client";
import type { OverviewData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import KpiCard from "../components/overview/KpiCard";
import FunnelChart from "../components/overview/FunnelChart";
// import RetentionHeatmap from "../components/overview/RetentionHeatmap";
import TimeToConvertPanel from "../components/overview/TimeToConvertPanel";
import OpportunityCard from "../components/overview/OpportunityCard";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import FiltersButton from "../components/filters/FiltersButton";
import Panel from "../components/ui/Panel";
import LoadError from "../components/ui/LoadError";

export default function Overview() {
  const navigate = useNavigate();
  const filters = useFiltersContext();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // The date-range calendar sets `to` to "" as a deliberate intermediate
    // state between clicking the start date and clicking the end date (see
    // useFilters' handleDay/pendingEnd) — FiltersContext is one shared
    // instance for the whole app, so that intermediate state is visible
    // here too, not just on whatever page opened the calendar. Skipping the
    // fetch until `to` is real avoids sending a blank date param the
    // backend can't run a real query against (it 500s server-side on a
    // live table and falls back to placeholder fixture data, which looks
    // exactly like "my real funnel disappeared").
    if (!filters.filters.to) return;
    setError(null);
    fetchOverview(filters.filters)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filters, reloadKey]);

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
            Growth overview
          </div>
          <div className="font-mono text-[12px] text-[var(--color-muted)]">{data.updatedLabel}</div>
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
          className="cursor-pointer overflow-hidden p-4 px-[18px] transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(58,47,38,0.25)]"
          onClick={() => navigate("/funnels/guest-checkout")}
        >
          <div className="mb-2 flex items-baseline gap-[10px]">
            <div className="text-[15px] font-semibold text-[var(--color-ink)]">{data.funnel.title}</div>
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-[var(--color-muted)]">conv</div>
            <div className="text-[16px] font-bold text-[var(--color-accent)]">{data.funnel.convPct}</div>
          </div>
          <FunnelChart steps={data.funnel.steps} />
          <div className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">Click to view full 13-stage breakdown →</div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3">
          {/* <Panel className="overflow-hidden p-4 px-[18px]">
            <div className="mb-2 text-[15px] font-semibold text-[var(--color-ink)]">Weekly retention</div>
            <RetentionHeatmap
              weekLabels={data.retention.weekLabels}
              cohorts={data.retention.cohorts}
              callout={data.retention.callout}
            />
          </Panel> */}

          <Panel className="overflow-hidden p-4 px-[18px]">
            <div className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">Time to convert</div>
            <div className="mb-2 font-mono text-[10px] text-[var(--color-faint)]">MEDIAN · P50 / P90</div>
            <TimeToConvertPanel
              steps={data.timeToConvert.steps}
              totalLabel={data.timeToConvert.totalLabel}
              totalDelta={data.timeToConvert.totalDelta}
            />
          </Panel>

          <OpportunityCard label={data.opportunity.label} html={data.opportunity.html} />
        </div>
      </div>
    </div>
  );
}
