import { useNavigate } from "react-router-dom";
import type { EntrypointBySource } from "../../api/types";

const tierColorByQuality = (quality: number) =>
  quality >= 10 ? "var(--color-success)" : quality >= 5 ? "var(--color-warning)" : "var(--color-danger)";

export default function SourceFunnelCard({ funnelId, source }: { funnelId: string; source: EntrypointBySource }) {
  const navigate = useNavigate();
  const color = tierColorByQuality(source.quality);
  const base = source.stages[0]?.users || 1;

  return (
    <button
      onClick={() => navigate(`/funnels/${funnelId}/entrypoints/${source.id}`)}
      className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-[14px] text-left transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(58,47,38,0.25)]"
    >
      <div className="text-[13px] font-semibold text-[var(--color-ink)]">{source.name}</div>
      <div className="mb-[10px] font-mono text-[10.5px] font-semibold" style={{ color }}>
        {source.quality.toFixed(1)}% quality
      </div>
      <div className="flex flex-col gap-[7px]">
        {source.stages.map((stage) => (
          <div key={stage.label}>
            <div className="mb-[2px] flex items-baseline justify-between">
              <span className="font-mono text-[10px] text-[var(--color-faint)]">{stage.label}</span>
              <span className="font-mono text-[11px] font-semibold text-[var(--color-ink)]">
                {stage.users.toLocaleString()}
              </span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-[3px] bg-[var(--color-hairline)]">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${(stage.users / base) * 100}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[10px] font-mono text-[9.5px] text-[var(--color-faint)]">View funnel →</div>
    </button>
  );
}
