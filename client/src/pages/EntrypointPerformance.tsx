import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchFunnelEntrypoints } from "../api/client";
import type { EntrypointData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import Panel from "../components/ui/Panel";
import ConvergenceDiagram from "../components/entrypoints/ConvergenceDiagram";
import SourceFunnelCard from "../components/entrypoints/SourceFunnelCard";
import FiltersButton from "../components/filters/FiltersButton";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import LoadError from "../components/ui/LoadError";

function ExtremeCard({
  label,
  source,
  quality,
  note,
  color,
}: {
  label: string;
  source: string;
  quality: number;
  note: string;
  color: string;
}) {
  return (
    <Panel className="p-[18px]">
      <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 text-[20px] font-bold" style={{ color }}>
        {source}
      </div>
      <div className="mt-1 font-mono text-[11.5px] text-[var(--color-faint)]">
        {quality.toFixed(1)}% quality · {note}
      </div>
    </Panel>
  );
}

export default function EntrypointPerformance() {
  const { funnelId = "guest-checkout" } = useParams();
  const navigate = useNavigate();
  const filters = useFiltersContext();
  const [data, setData] = useState<EntrypointData | null>(null);
  const [range, setRange] = useState<"30d" | "7d">("30d");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Hold off until the filter cascade has validated the selection —
    // fetching for the provisional DEFAULTS and then again for the
    // corrected values doubled every cold load's requests (see
    // FiltersContext's `ready`).
    if (!filters.ready) return;
    setError(null);
    fetchFunnelEntrypoints(funnelId, filters.filters)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Refetch whenever any active filter or the selected date changes —
    // same dependency shape as Funnel Detail. Previously this page's fetch
    // ignored the Filters button/bar entirely, so it always showed
    // whichever fixture entrypoints.json happened to have for `funnelId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelId, filters.ready, filters.filters, reloadKey]);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <div className="px-7 py-[22px]">
      <div className="mb-5 flex items-center gap-[10px]">
        <button
          onClick={() => navigate(`/funnels/${funnelId}`)}
          className="inline-flex items-center gap-[6px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-3 py-[6px] text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="var(--color-body)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to funnel
        </button>
        <div className="font-mono text-[11px] text-[var(--color-faint)]">
          Overview / Funnels / {data.funnelName} / Entry points
        </div>
      </div>

      <div className="mb-5 flex items-start gap-4">
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
            Entrypoint Performance
          </div>
          <div className="mt-1 font-mono text-[12px] text-[var(--color-muted)]">
            {data.funnelName} funnel · {data.meta}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <FiltersButton />
          <div className="flex gap-[3px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
            {(
              [
                { key: "30d", label: "Last 30 days" },
                { key: "7d", label: "Last 7 days" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-[7px] px-[14px] py-[7px] text-[12px] font-semibold transition-colors ${
                  range === opt.key ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)] hover:bg-[var(--color-border)]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FilterBar />
      <FilterModal />

      <div className="mb-5 mt-3 grid grid-cols-2 gap-3">
        <ExtremeCard
          label="BEST ENTRY POINT"
          source={data.best.source}
          quality={data.best.quality}
          note={data.best.note}
          color="var(--color-success)"
        />
        <ExtremeCard
          label="WORST ENTRY POINT"
          source={data.worst.source}
          quality={data.worst.quality}
          note={data.worst.note}
          color="var(--color-danger)"
        />
      </div>

      <Panel className="mb-4 overflow-x-auto p-[22px]">
        <div className="mb-4 flex items-baseline gap-3">
          <div className="text-[15px] font-semibold text-[var(--color-ink)]">Where sessions come from</div>
          <div className="flex-1" />
          <div className="flex items-center gap-[14px] font-mono text-[10px] text-[var(--color-faint)]">
            <span className="flex items-center gap-[5px]">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-success)" }} />
              HIGH QUALITY
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-warning)" }} />
              MID
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-danger)" }} />
              LOW
            </span>
          </div>
        </div>
        <div className="mb-4 font-mono text-[10px] text-[var(--color-faint)]">LINE THICKNESS = VOLUME · COLOR = QUALITY</div>
        <ConvergenceDiagram
          sources={data.sources}
          funnelEntry={data.funnelEntry}
          funnelEntryLabel={data.funnelEntryLabel}
        />
      </Panel>

      <Panel className="p-[22px]">
        <div className="text-[15px] font-semibold text-[var(--color-ink)]">Funnel by entry point</div>
        <div className="mb-4 font-mono text-[10px] text-[var(--color-faint)]">STAGE-BY-STAGE CONVERSION, PER SOURCE</div>
        <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
          {data.bySource.map((source) => (
            <SourceFunnelCard key={source.id} funnelId={funnelId} source={source} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
