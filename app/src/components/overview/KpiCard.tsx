import Panel from "../ui/Panel";
import Sparkline from "../ui/Sparkline";
import type { Kpi } from "../../api/types";

const deltaColor: Record<Kpi["deltaTone"], string> = {
  "up-good": "text-[var(--color-success)]",
  "up-bad": "text-[var(--color-danger)]",
  flat: "text-[var(--color-muted)]",
};

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Panel className="p-4 px-[18px]">
      <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-muted)]">
        {kpi.label}
      </div>
      <div className="mt-[7px] mb-[3px] flex items-baseline gap-[9px]">
        <span className="text-[26px] font-bold text-[var(--color-ink)]">{kpi.value}</span>
        <span className={`font-mono text-[12px] ${deltaColor[kpi.deltaTone]}`}>{kpi.delta}</span>
      </div>
      <div className="mb-[9px] font-mono text-[10px] text-[var(--color-faint)]">
        {kpi.baselineLabel}
      </div>
      <Sparkline values={kpi.sparkline} color={kpi.sparklineColor} />
    </Panel>
  );
}
