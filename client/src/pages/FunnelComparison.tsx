import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchFunnelComparison } from "../api/client";
import type { ComparisonData } from "../api/types";
import Panel from "../components/ui/Panel";
import FunnelChart from "../components/overview/FunnelChart";
import FiltersButton from "../components/filters/FiltersButton";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import LoadError from "../components/ui/LoadError";

function ComparisonKpiCard({
  label,
  value,
  delta,
  deltaTone,
  sub,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: ComparisonData["kpis"][number]["deltaTone"];
  sub: string;
}) {
  const deltaColor =
    deltaTone === "up-good"
      ? "text-[var(--color-success)]"
      : deltaTone === "up-bad"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-muted)]";
  return (
    <Panel className="p-[14px] px-[16px]">
      <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-muted)]">{label}</div>
      <div className="mt-[5px] flex items-baseline gap-[9px]">
        <span className="text-[20px] font-bold text-[var(--color-ink)]">{value}</span>
        <span className={`font-mono text-[12px] ${deltaColor}`}>{delta}</span>
      </div>
      <div className="mt-[3px] font-mono text-[10px] text-[var(--color-faint)]">{sub}</div>
    </Panel>
  );
}

export default function FunnelComparison() {
  const { funnelId = "guest-checkout" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [activeQuickCompare, setActiveQuickCompare] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchFunnelComparison(funnelId)
      .then((d) => {
        setData(d);
        setActiveQuickCompare(d.activeQuickCompare);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [funnelId, reloadKey]);

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
        <div className="font-mono text-[11px] text-[var(--color-faint)]">Overview / Funnels / Compare</div>
      </div>

      <div className="mb-4 flex items-start gap-4">
        <div className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Funnel comparison
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <FiltersButton />
          <div className="rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px]">
            <div className="flex items-center gap-[6px] font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">
              <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-accent)]" />
              DATE A
            </div>
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">{data.dateA.label}</div>
          </div>
          <div className="font-mono text-[11px] text-[var(--color-faint)]">vs</div>
          <div className="rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px]">
            <div className="flex items-center gap-[6px] font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">
              <span className="h-[7px] w-[7px] rounded-full border border-[var(--color-faint)]" />
              DATE B
            </div>
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">{data.dateB.label}</div>
          </div>
        </div>
      </div>

      <FilterBar />
      <FilterModal />

      <div className="mb-5 mt-3 flex items-center gap-[10px]">
        <span className="font-mono text-[10px] tracking-[0.06em] text-[var(--color-faint)]">QUICK COMPARE</span>
        {data.quickCompare.map((opt) => (
          <button
            key={opt}
            onClick={() => setActiveQuickCompare(opt)}
            className={`rounded-full px-[13px] py-[6px] text-[12px] font-medium transition-colors ${
              opt === activeQuickCompare
                ? "bg-[var(--color-accent)] text-white"
                : "border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {data.kpis.map((kpi) => (
          <ComparisonKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mb-2 flex items-center gap-[18px] font-mono text-[11px] text-[var(--color-ink-soft)]">
        <span className="flex items-center gap-[6px]">
          <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-accent)]" />
          {data.funnelA.dateLabel}
        </span>
        <span className="flex items-center gap-[6px]">
          <span className="h-[7px] w-[7px] rounded-sm border border-[var(--color-faint)]" />
          {data.funnelB.dateLabel}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Panel className="p-[18px]">
          <div className="mb-2 flex items-baseline gap-[10px]">
            <div className="text-[14px] font-semibold text-[var(--color-ink)]">{data.funnelA.dateLabel}</div>
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-[var(--color-muted)]">conv</div>
            <div className="text-[15px] font-bold text-[var(--color-accent)]">{data.funnelA.convPct}</div>
          </div>
          <FunnelChart steps={data.funnelA.steps} tone="accent" showDrop={false} />
        </Panel>
        <Panel className="p-[18px]">
          <div className="mb-2 flex items-baseline gap-[10px]">
            <div className="text-[14px] font-semibold text-[var(--color-ink)]">{data.funnelB.dateLabel}</div>
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-[var(--color-muted)]">conv</div>
            <div className="text-[15px] font-bold text-[var(--color-ink-soft)]">{data.funnelB.convPct}</div>
          </div>
          <FunnelChart steps={data.funnelB.steps} tone="muted" showDrop={false} />
        </Panel>
      </div>

      <div className="rounded-xl bg-[var(--color-callout)] px-5 py-[14px]">
        <div
          className="text-[13px] leading-[1.35] text-white"
          dangerouslySetInnerHTML={{ __html: data.calloutHtml }}
        />
      </div>
    </div>
  );
}
