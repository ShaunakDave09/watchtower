import type { DropoffReason } from "../../api/types";

const toneColor: Record<DropoffReason["tone"], string> = {
  danger: "var(--color-danger)",
  accent: "var(--color-accent-light)",
  muted: "var(--color-muted)",
  faint: "var(--color-quiet)",
};

const toneText: Record<DropoffReason["tone"], string> = {
  danger: "text-[var(--color-danger)]",
  accent: "text-[var(--color-accent-light)]",
  muted: "text-[var(--color-muted)]",
  faint: "text-[var(--color-faint)]",
};

export default function DropoffReasons({
  stageLabel,
  reasons,
}: {
  stageLabel: string;
  reasons: DropoffReason[];
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-[22px] px-[22px]">
      <div className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">Top drop-off reasons</div>
      <div className="mb-[14px] font-mono text-[10px] text-[var(--color-faint)]">{stageLabel}</div>
      <div className="flex flex-col gap-[10px]">
        {reasons.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[12px] text-[var(--color-ink)]">{r.label}</span>
              <span className={`font-mono text-[11px] font-semibold ${toneText[r.tone]}`}>{r.pct}%</span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-[3px] bg-[var(--color-hairline)]">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${r.pct}%`, background: toneColor[r.tone] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
