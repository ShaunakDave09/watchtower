import type { TrendPoint } from "../../api/types";

const W = 300;
const H = 100;

export default function ConversionTrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const pad = (max - min) * 0.3 || 1;
  const top = max + pad;
  const bottom = min - pad;
  const range = top - bottom || 1;
  const step = W / (points.length - 1);

  const toXY = (i: number, v: number) => {
    const x = i * step;
    const y = 88 - ((v - bottom) / range) * 78;
    return [x, y] as const;
  };

  const linePoints = points.map((p, i) => toXY(i, p.value).join(",")).join(" ");

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-[22px]">
      <div className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">Conversion trend</div>
      <div className="mb-[14px] font-mono text-[10px] text-[var(--color-faint)]">END-TO-END · LAST 8 WEEKS</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <g stroke="var(--color-border)" strokeWidth={0.5}>
          <line x1={0} y1={25} x2={W} y2={25} />
          <line x1={0} y1={50} x2={W} y2={50} />
          <line x1={0} y1={75} x2={W} y2={75} />
        </g>
        <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" />
        <g fill="var(--color-accent)">
          {points.map((p, i) => {
            const [x, y] = toXY(i, p.value);
            return <circle key={p.week} cx={x} cy={y} r={3} />;
          })}
        </g>
        <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={8} fill="var(--color-faint)">
          {points.map((p, i) => {
            const x = i === points.length - 1 ? i * step - 4 : i * step;
            return (
              <text key={p.week} x={x} y={96}>
                {p.week}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
