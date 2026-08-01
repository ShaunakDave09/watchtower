import { useState } from "react";
import type { TrendsData } from "../../api/types";
import ChartTooltip from "../ui/ChartTooltip";

const W = 760;
const H = 190;
const TOTAL_H = H + 22;

function hourLabel(i: number, n: number) {
  if (i === n - 1) return "Now";
  const h = i % 12 === 0 ? 12 : i % 12;
  const suffix = i < 12 ? "am" : "pm";
  return `${h}${suffix}`;
}

export default function HourlyThroughputChart({ hourly }: { hourly: TrendsData["hourly"] }) {
  const { entrants, convRate, expectedLow, expectedHigh, tickLabels } = hourly;
  const n = entrants.length;
  const slot = W / n;
  const [hover, setHover] = useState<number | null>(null);

  const maxEntrants = Math.max(...entrants) * 1.15;
  const barY = (v: number) => H - (v / maxEntrants) * H;

  const lineMin = Math.min(...convRate, ...expectedLow) - 1.5;
  const lineMax = Math.max(...convRate, ...expectedHigh) + 1.5;
  const range = lineMax - lineMin || 1;
  const lineY = (v: number) => H - ((v - lineMin) / range) * H;
  const cx = (i: number) => i * slot + slot / 2;

  const bandTop = expectedHigh.map((v, i) => `${cx(i)},${lineY(v)}`).join(" ");
  const bandBottom = expectedLow
    .map((v, i) => `${cx(i)},${lineY(v)}`)
    .reverse()
    .join(" ");

  const linePoints = convRate.map((v, i) => `${cx(i)},${lineY(v)}`).join(" ");

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        width="100%"
        style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}
      >
        <polygon points={`${bandTop} ${bandBottom}`} fill="var(--color-quiet)" fillOpacity={0.35} />

        <g fill="var(--color-accent-light)" fillOpacity={0.55}>
          {entrants.map((v, i) => (
            <rect
              key={i}
              x={cx(i) - slot * 0.28}
              y={barY(v)}
              width={slot * 0.56}
              height={H - barY(v)}
              rx={2}
            />
          ))}
        </g>

        <polyline points={linePoints} fill="none" stroke="var(--color-ink)" strokeWidth={1.6} />

        {hover !== null && (
          <>
            <line x1={cx(hover)} y1={0} x2={cx(hover)} y2={H} stroke="var(--color-ink)" strokeOpacity={0.15} strokeWidth={1} />
            <circle cx={cx(hover)} cy={lineY(convRate[hover])} r={3.5} fill="var(--color-ink)" />
          </>
        )}

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

        <g fill="transparent" style={{ pointerEvents: "all" }}>
          {entrants.map((_, i) => (
            <rect
              key={i}
              x={i * slot}
              y={0}
              width={slot}
              height={H}
              style={{ pointerEvents: "all" }}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </g>
      </svg>

      {hover !== null && (
        <ChartTooltip xPct={(cx(hover) / W) * 100} yPct={(barY(entrants[hover]) / TOTAL_H) * 100}>
          <div className="font-semibold">{hourLabel(hover, n)}</div>
          <div className="text-[#c9a68a]">
            {entrants[hover].toLocaleString()} entrants · {convRate[hover]}% curr. conv.
          </div>
          <div className="text-[#a99a86]">
            {expectedLow[hover]}–{expectedHigh[hover]}% last 7d avg
          </div>
          {convRate[hover] < expectedLow[hover] && <div className="text-[#ff8a80]">Below last 7d avg</div>}
        </ChartTooltip>
      )}
    </div>
  );
}
