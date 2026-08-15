import { Fragment } from "react";
import type { ComparisonStageRow } from "../../api/types";

// Generic left-vs-right comparison: Funnel Detail uses it for App vs Web
// (the defaults below), Overview reuses it for Best vs Worst entry point by
// passing different labels/colors/subtitle — the shape of the comparison
// (two summary values + a per-stage breakdown) is identical either way.
// `rows[].app`/`rows[].web` keep those names regardless of what's actually
// being compared (they're pre-formatted strings — see
// FunnelDetailData.comparison.rows) rather than renaming the shared type
// just for this.
export default function ComparisonPanel({
  leftLabel = "App",
  rightLabel = "Web",
  leftShortLabel,
  rightShortLabel,
  leftValue,
  rightValue,
  leftColor = "var(--color-accent)",
  rightColor = "var(--color-body)",
  subtitle = "APP vs WEB",
  calloutHtml,
  rows,
  onClick,
}: {
  leftLabel?: string;
  rightLabel?: string;
  // Column headers in the per-stage grid below are cramped (54px), so a
  // long real label (an entry point's name, say) gets a short stand-in
  // there — e.g. "BEST" — while the legend row above still shows the full
  // name. Defaults to leftLabel/rightLabel, which is already short for the
  // App/Web case.
  leftShortLabel?: string;
  rightShortLabel?: string;
  leftValue: number;
  rightValue: number;
  leftColor?: string;
  rightColor?: string;
  subtitle?: string;
  calloutHtml: string;
  rows: ComparisonStageRow[];
  onClick?: () => void;
}) {
  const max = Math.max(leftValue, rightValue) * 1.5;
  const leftHeader = leftShortLabel ?? leftLabel;
  const rightHeader = rightShortLabel ?? rightLabel;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-[22px] ${
        onClick ? "cursor-pointer transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(58,47,38,0.25)]" : ""
      }`}
    >
      <div className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">Comparison</div>
      <div className="mb-[14px] font-mono text-[10px] text-[var(--color-faint)]">{subtitle}</div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 flex-none rounded-full" style={{ background: leftColor }} />
          <span className="w-[84px] flex-none truncate text-[12px] text-[var(--color-ink)]" title={leftLabel}>
            {leftLabel}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-hairline)]">
            <div className="h-full rounded-[4px]" style={{ width: `${(leftValue / max) * 100}%`, background: leftColor }} />
          </div>
          <span className="w-9 flex-none text-right font-mono text-[11px] font-semibold text-[var(--color-ink)]">
            {leftValue}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 flex-none rounded-full" style={{ background: rightColor }} />
          <span className="w-[84px] flex-none truncate text-[12px] text-[var(--color-ink)]" title={rightLabel}>
            {rightLabel}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-hairline)]">
            <div className="h-full rounded-[4px]" style={{ width: `${(rightValue / max) * 100}%`, background: rightColor }} />
          </div>
          <span className="w-9 flex-none text-right font-mono text-[11px] font-semibold text-[var(--color-ink)]">
            {rightValue}%
          </span>
        </div>
      </div>

      <div className="mt-3 font-mono text-[10px] text-[var(--color-success)]">{calloutHtml}</div>

      <div className="mt-[14px] border-t border-[var(--color-border)] pt-3">
        <div className="grid grid-cols-[1fr_54px_54px] gap-x-2 gap-y-1 font-mono text-[10px]">
          <div className="text-[var(--color-faint)]">STAGE</div>
          <div className="truncate text-right" style={{ color: leftColor }} title={leftLabel}>
            {leftHeader.toUpperCase()}
          </div>
          <div className="truncate text-right" style={{ color: rightColor }} title={rightLabel}>
            {rightHeader.toUpperCase()}
          </div>
          {rows.map((row) => (
            <Fragment key={row.stage}>
              <div className="text-[var(--color-ink-soft)]">{row.stage}</div>
              <div className={`text-right ${row.danger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
                {row.app}
              </div>
              <div className={`text-right ${row.danger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
                {row.web}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
