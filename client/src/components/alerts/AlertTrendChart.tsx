import type { AlertTrend } from "../../api/types";

const W = 900;
const H = 150;

export default function AlertTrendChart({ trend }: { trend: AlertTrend }) {
  const { points, threshold, tickLabels } = trend;
  const n = points.length;
  const step = W / (n - 1);

  const min = Math.min(...points, threshold) - 3;
  const max = Math.max(...points, threshold) + 3;
  const range = max - min || 1;
  const y = (v: number) => H - ((v - min) / range) * H;

  const linePoints = points.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const thresholdY = y(threshold);

  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" style={{ display: "block" }}>
      <line
        x1={0}
        y1={thresholdY}
        x2={W}
        y2={thresholdY}
        stroke="var(--color-faint)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <polyline points={linePoints} fill="none" stroke="var(--color-danger)" strokeWidth={2} strokeLinejoin="round" />

      <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={9.5} fill="var(--color-faint)">
        {tickLabels.map((label, i) => {
          const frac = i / (tickLabels.length - 1);
          const x = frac * W;
          const anchor = i === 0 ? "start" : i === tickLabels.length - 1 ? "end" : "middle";
          return (
            <text key={label} x={x} y={H + 16} textAnchor={anchor}>
              {label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
