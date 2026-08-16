import { useState } from "react";
import type { TrendsData } from "../../api/types";
import ChartTooltip from "../ui/ChartTooltip";

const W = 340;
const H = 150;
// +10 for the "NOW" label drawn above the plot (y=-4, outside the 0..H
// band — this is the outermost <svg> in the DOM, so it isn't covered by
// the UA stylesheet's overflow:hidden default the way a nested
// foreignObject/symbol/etc. would be); +24 more below for the new
// x-axis hour labels.
const TOTAL_H = H + 10 + 24;

function hourLabel(i: number, currentHour: number) {
  if (i === currentHour) return "Now";
  const h = i % 12 === 0 ? 12 : i % 12;
  const suffix = i < 12 ? "am" : "pm";
  return `${h}${suffix}`;
}

// Plain hour-of-day text, no "Now" special-casing — used for the fixed
// x-axis ticks below the chart, which label real hours regardless of
// where the "NOW" marker line happens to fall (unlike Hourly throughput's
// chart, this one's x-axis spans the full 24h day even though "today"'s
// actual line stops partway through it).
function axisHourLabel(i: number) {
  const h = i % 12 === 0 ? 12 : i % 12;
  return `${h}${i < 12 ? "am" : "pm"}`;
}

const AXIS_TICK_HOURS = [0, 4, 8, 12, 16, 20, 23];

export default function PacingChart({ pacing }: { pacing: TrendsData["pacing"] }) {
  const { today, yesterday, projection, currentHour } = pacing;
  const n = 24;
  const step = W / (n - 1);
  const [hover, setHover] = useState<number | null>(null);

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

  const todayValueAt = (i: number) => (i <= currentHour ? today[i] : projection[i - currentHour - 1]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${TOTAL_H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHover(null)}>
        <line x1={nowX} y1={0} x2={nowX} y2={H} stroke="var(--color-border-strong)" strokeWidth={1} strokeDasharray="3,3" />
        <text x={nowX} y={-4} fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={8} fill="var(--color-faint)" textAnchor="middle">
          NOW
        </text>

        <polyline points={yestPoints} fill="none" stroke="var(--color-faint)" strokeWidth={1.4} strokeDasharray="2,3" />
        <polyline points={projPoints} fill="none" stroke="var(--color-accent)" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="4,3" />
        <polyline points={todayPoints} fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinejoin="round" />
        <circle cx={nowX} cy={nowY} r={3.2} fill="var(--color-accent)" />

        {hover !== null && (
          <>
            <line x1={hover * step} y1={0} x2={hover * step} y2={H} stroke="var(--color-ink)" strokeOpacity={0.15} strokeWidth={1} />
            <circle cx={hover * step} cy={y(todayValueAt(hover))} r={3.2} fill="var(--color-accent)" />
            <circle cx={hover * step} cy={y(yesterday[hover])} r={3.2} fill="var(--color-faint)" />
          </>
        )}

        <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={9.5} fill="var(--color-faint)">
          {AXIS_TICK_HOURS.map((h) => (
            <text
              key={h}
              x={h * step}
              y={H + 16}
              textAnchor={h === 0 ? "start" : h === AXIS_TICK_HOURS[AXIS_TICK_HOURS.length - 1] ? "end" : "middle"}
            >
              {axisHourLabel(h)}
            </text>
          ))}
        </g>

        <g fill="transparent" style={{ pointerEvents: "all" }}>
          {Array.from({ length: n }, (_, i) => (
            <rect
              key={i}
              x={Math.max(0, i * step - step / 2)}
              y={0}
              width={step}
              height={H}
              style={{ pointerEvents: "all" }}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </g>
      </svg>

      {hover !== null && (
        <ChartTooltip xPct={(hover * step / W) * 100} yPct={(y(todayValueAt(hover)) / TOTAL_H) * 100}>
          <div className="font-semibold">{hourLabel(hover, currentHour)}</div>
          <div className="text-[#e8794f]">
            Today {hover > currentHour ? "(proj.) " : ""}
            {todayValueAt(hover)}%
          </div>
          <div className="text-[#c9a68a]">Yesterday {yesterday[hover]}%</div>
        </ChartTooltip>
      )}
    </div>
  );
}
