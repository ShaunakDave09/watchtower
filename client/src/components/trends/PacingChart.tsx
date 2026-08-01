import type { TrendsData } from "../../api/types";

const W = 340;
const H = 150;

export default function PacingChart({ pacing }: { pacing: TrendsData["pacing"] }) {
  const { today, yesterday, projection, currentHour } = pacing;
  const n = 24;
  const step = W / (n - 1);

  const all = [...today, ...yesterday, ...projection];
  const min = Math.min(...all) - 1;
  const max = Math.max(...all) + 1;
  const range = max - min || 1;
  const y = (v: number) => H - ((v - min) / range) * H;

  const todayPoints = today.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const yestPoints = yesterday.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const projPoints = [today[today.length - 1], ...projection]
    .map((v, i) => `${(currentHour + i) * step},${y(v)}`)
    .join(" ");
  const nowX = currentHour * step;
  const nowY = y(today[today.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} width="100%" style={{ display: "block" }}>
      <line x1={nowX} y1={0} x2={nowX} y2={H} stroke="var(--color-border-strong)" strokeWidth={1} strokeDasharray="3,3" />
      <text x={nowX} y={-4} fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={8} fill="var(--color-faint)" textAnchor="middle">
        NOW
      </text>

      <polyline points={yestPoints} fill="none" stroke="var(--color-faint)" strokeWidth={1.4} strokeDasharray="2,3" />
      <polyline points={projPoints} fill="none" stroke="var(--color-accent)" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="4,3" />
      <polyline points={todayPoints} fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={nowX} cy={nowY} r={3.2} fill="var(--color-accent)" />
    </svg>
  );
}
