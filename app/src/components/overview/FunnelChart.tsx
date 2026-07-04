import type { FunnelStep } from "../../api/types";

const TRACK_X = 120;
const TRACK_W = 440;
const ROW_H = 60;
const ROW_GAP = 44;
const TOP_PAD = 20;

interface Row {
  step: FunnelStep;
  y: number;
  barX: number;
  barW: number;
}

export default function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const height = TOP_PAD * 2 + steps.length * ROW_H + (steps.length - 1) * ROW_GAP;

  const rows: Row[] = steps.map((step, i) => {
    const y = TOP_PAD + i * (ROW_H + ROW_GAP);
    const barW = (step.convPct / 100) * TRACK_W;
    const barX = TRACK_X + (TRACK_W - barW) / 2;
    return { step, y, barX, barW };
  });

  return (
    <svg viewBox={`0 0 620 ${height}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="fc-accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-accent-light)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
        <linearGradient id="fc-final" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-dark-soft)" />
          <stop offset="1" stopColor="var(--color-dark)" />
        </linearGradient>
      </defs>

      <g fill="var(--color-border)">
        {rows.map((r) => (
          <rect key={r.step.step} x={TRACK_X} y={r.y} width={TRACK_W} height={ROW_H} rx={7} />
        ))}
      </g>

      <g fill="var(--color-accent)" fillOpacity={0.13}>
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
          fill={i === rows.length - 1 ? "url(#fc-final)" : "url(#fc-accent)"}
        />
      ))}

      <g fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight={700} fill="#fff" textAnchor="middle">
        {rows.map((r) => (
          <text key={r.step.step} x={340} y={r.y + 29} fontSize={r === rows[rows.length - 1] ? 16 : 19}>
            {r.step.convPct}%
          </text>
        ))}
      </g>
      <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={10.5} fill="#ffe0cf" textAnchor="middle">
        {rows.slice(0, -1).map((r) => (
          <text key={r.step.step} x={340} y={r.y + 47}>
            {r.step.users.toLocaleString()}
          </text>
        ))}
      </g>
      <text
        x={340}
        y={rows[rows.length - 1].y + 46}
        fontFamily="'IBM Plex Mono',ui-monospace,monospace"
        fontSize={9.5}
        fill="#e6dbcb"
        textAnchor="middle"
      >
        {rows[rows.length - 1].step.users.toLocaleString()}
      </text>

      <g fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontSize={12.5} fontWeight={500} fill="var(--color-ink-soft)" textAnchor="end">
        {rows.map((r) => (
          <text key={r.step.step} x={108} y={r.y + 34}>
            {r.step.label}
          </text>
        ))}
      </g>

      <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={11.5} fontWeight={600} fill="var(--color-danger)" textAnchor="start">
        {rows.slice(1).map((r) => (
          <text key={r.step.step} x={574} y={r.y - ROW_GAP / 2 + 4}>
            ↓{r.step.dropPct}%
          </text>
        ))}
      </g>
    </svg>
  );
}
