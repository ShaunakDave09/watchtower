import { useEffect, useState } from "react";
import { fetchTrends } from "../api/client";
import type { TrendsData } from "../api/types";
import Panel from "../components/ui/Panel";
import HourlyThroughputChart from "../components/trends/HourlyThroughputChart";
import PacingChart from "../components/trends/PacingChart";
import ConversionTrendMultiLine from "../components/trends/ConversionTrendMultiLine";
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

export default function Trends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchTrends()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reloadKey]);

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
        <div className="flex items-center gap-2">
          <FiltersButton />
          <div className="flex gap-[3px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
            {(
              [
                { key: "7d", label: "Last 7d" },
                { key: "30d", label: "Last 30d" },
                { key: "90d", label: "Last 90d" },
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

      <Panel className="p-[20px]">
        <div className="mb-1 flex items-baseline gap-3">
          <div className="text-[14px] font-semibold text-[var(--color-ink)]">Conversion rate trend</div>
          <div className="flex-1" />
          <div className="flex items-center gap-[12px]">
            {data.conversionTrend.series.map((s) => (
              <span key={s.key} className="flex items-center gap-[5px] font-mono text-[10px] text-[var(--color-faint)]">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mb-3 font-mono text-[10px] text-[var(--color-faint)]">% OF ENTRANTS REACHING EACH STAGE, DAILY</div>
        <ConversionTrendMultiLine dates={data.conversionTrend.dates} series={data.conversionTrend.series} />
      </Panel>
    </div>
  );
}
