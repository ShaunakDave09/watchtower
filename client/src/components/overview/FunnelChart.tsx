import { useId } from "react";
import type { FunnelStep } from "../../api/types";

const TRACK_X = 120;
const TRACK_W = 440;
const ROW_H = 48;
const ROW_GAP = 30;
const TOP_PAD = 14;

interface Row {
  step: FunnelStep;
  y: number;
  barX: number;
  barW: number;
}

export default function FunnelChart({
  steps,
  tone = "accent",
  showDrop = true,
}: {
  steps: FunnelStep[];
  tone?: "accent" | "muted";
  showDrop?: boolean;
}) {
  const uid = useId();
  const gradFill = `fc-fill-${uid}`;
  const gradFinal = `fc-final-${uid}`;

  // A live query can legitimately match zero rows for a filter combination
  // (see the "steps is not None" handling in server/routers/overview.py) —
  // that's real information, not a loading/error state, so show it plainly
  // instead of dividing by steps.length below or indexing rows[-1].
  if (steps.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] font-mono text-[12px] text-[var(--color-muted)]">
        No data for this filter selection
      </div>
    );
  }

  const height = TOP_PAD * 2 + steps.length * ROW_H + (steps.length - 1) * ROW_GAP;

  const rows: Row[] = steps.map((step, i) => {
    const y = TOP_PAD + i * (ROW_H + ROW_GAP);
    const barW = (step.convPct / 100) * TRACK_W;
    const barX = TRACK_X + (TRACK_W - barW) / 2;
    return { step, y, barX, barW };
  });

  const mainTextFill = tone === "accent" ? "#fff" : "var(--color-ink)";
  const subTextFill = tone === "accent" ? "#ffe0cf" : "var(--color-ink-soft)";
  const ghostFill = tone === "accent" ? "var(--color-accent)" : "var(--color-ink)";
  const ghostOpacity = tone === "accent" ? 0.13 : 0.05;

  return (
    <svg viewBox={`0 0 620 ${height}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradFill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone === "accent" ? "var(--color-accent-light)" : "var(--color-quiet)"} />
          <stop offset="1" stopColor={tone === "accent" ? "var(--color-accent)" : "var(--color-border-strong)"} />
        </linearGradient>
        <linearGradient id={gradFinal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-dark-soft)" />
          <stop offset="1" stopColor="var(--color-dark)" />
        </linearGradient>
      </defs>

      <g fill="var(--color-border)">
        {rows.map((r) => (
          <rect key={r.step.step} x={TRACK_X} y={r.y} width={TRACK_W} height={ROW_H} rx={7} />
        ))}
      </g>

      <g fill={ghostFill} fillOpacity={ghostOpacity}>
        {rows.slice(0, -1).map((r, i) => {
          const next = rows[i + 1];
          const bottomY = r.y + ROW_H;
          return (
            <polygon
              key={r.step.step}
              points={`${r.barX},${bottomY} ${r.barX + r.barW},${bottomY} ${next.barX + next.barW},${next.y} ${next.barX},${next.y}`}
            />
          );
        })}
      </g>

      {rows.map((r, i) => (
        <rect
          key={r.step.step}
          x={r.barX}
          y={r.y}
          width={r.barW}
          height={ROW_H}
          rx={7}
          fill={i === rows.length - 1 ? `url(#${gradFinal})` : `url(#${gradFill})`}
        />
      ))}

      <g fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight={700} textAnchor="middle">
        {rows.map((r, i) => (
          <text
            key={r.step.step}
            x={340}
            y={r.y + 23}
            fontSize={r === rows[rows.length - 1] ? 14 : 16}
            fill={i === rows.length - 1 ? "#fff" : mainTextFill}
          >
            {r.step.convPct}%
          </text>
        ))}
      </g>
      <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={9.5} fill={subTextFill} textAnchor="middle">
        {rows.slice(0, -1).map((r) => (
          <text key={r.step.step} x={340} y={r.y + 38}>
            {r.step.users.toLocaleString()}
          </text>
        ))}
      </g>
      <text
        x={340}
        y={rows[rows.length - 1].y + 37}
        fontFamily="'IBM Plex Mono',ui-monospace,monospace"
        fontSize={8.5}
        fill="#e6dbcb"
        textAnchor="middle"
      >
        {rows[rows.length - 1].step.users.toLocaleString()}
      </text>

      <g fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontSize={11.5} fontWeight={500} fill="var(--color-ink-soft)" textAnchor="end">
        {rows.map((r) => (
          <text key={r.step.step} x={108} y={r.y + 27}>
            {r.step.label}
          </text>
        ))}
      </g>

      {showDrop && (
        <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={11.5} fontWeight={600} fill="var(--color-danger)" textAnchor="start">
          {rows.slice(1).map((r) => (
            <text key={r.step.step} x={574} y={r.y - ROW_GAP / 2 + 4}>
              ↓{r.step.dropPct}%
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
