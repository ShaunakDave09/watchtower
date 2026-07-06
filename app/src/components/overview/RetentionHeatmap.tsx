import { Fragment } from "react";
import type { RetentionCohort } from "../../api/types";

function cellStyle(value: number | null): { background: string; color: string } {
  if (value === null) return { background: "var(--color-hairline)", color: "transparent" };
  if (value === 100) return { background: "var(--color-accent)", color: "#fff" };
  const opacity = Math.min(1, value / 100 + 0.14);
  return {
    background: `rgba(193,80,46,${opacity.toFixed(2)})`,
    color: opacity >= 0.5 ? "#fff" : "var(--color-ink-soft)",
  };
}

interface RetentionHeatmapProps {
  weekLabels: string[];
  cohorts: RetentionCohort[];
  callout: string;
}

export default function RetentionHeatmap({ weekLabels, cohorts, callout }: RetentionHeatmapProps) {
  return (
    <div>
      <div
        className="grid items-center gap-1"
        style={{ gridTemplateColumns: `auto repeat(${weekLabels.length}, 1fr)` }}
      >
        <div />
        {weekLabels.map((w) => (
          <div key={w} className="text-center font-mono text-[9px] text-[var(--color-faint)]">
            {w}
          </div>
        ))}
        {cohorts.map((cohort) => (
          <Fragment key={cohort.cohortLabel}>
            <div className="font-mono text-[9px] text-[var(--color-faint)]">{cohort.cohortLabel}</div>
            {cohort.values.map((v, i) => (
              <div
                key={i}
                className="flex h-6 items-center justify-center rounded-[5px] font-mono text-[9px]"
                style={cellStyle(v)}
              >
                {v ?? ""}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 text-[12px] text-[var(--color-muted)]">{callout}</div>
    </div>
  );
}
