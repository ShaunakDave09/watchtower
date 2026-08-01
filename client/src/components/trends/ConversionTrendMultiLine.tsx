import { useState } from "react";
import type { TrendsData } from "../../api/types";
import ChartTooltip from "../ui/ChartTooltip";

const W = 760;
const H = 190;
const VB_W = W + 50;
const TOTAL_H = H + 22;

export default function ConversionTrendMultiLine({
  dates,
  series,
}: {
  dates: string[];
  series: TrendsData["conversionTrend"]["series"];
}) {
  const n = dates.length;
  const step = W / (n - 1);
  const [hover, setHover] = useState<number | null>(null);

  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(...allValues) - 3;
  const max = Math.max(...allValues) + 3;
  const range = max - min || 1;
  const y = (v: number) => H - ((v - min) / range) * H;

  const tickEvery = 5;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB_W} ${TOTAL_H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHover(null)}>
        {series.map((s) => {
          const points = s.values.map((v, i) => `${i * step},${y(v)}`).join(" ");
          return (
            <g key={s.key}>
              <polyline points={points} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinejoin="round" />
              {s.endLabel && (
                <text
                  x={(n - 1) * step + 6}
                  y={y(s.values[s.values.length - 1]) + 3}
                  fontFamily="'IBM Plex Mono',ui-monospace,monospace"
                  fontSize={9.5}
                  fontWeight={600}
                  fill={s.color}
                >
                  {s.endLabel}
                </text>
              )}
            </g>
          );
        })}

        {hover !== null && (
          <>
            <line x1={hover * step} y1={0} x2={hover * step} y2={H} stroke="var(--color-ink)" strokeOpacity={0.12} strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.key} cx={hover * step} cy={y(s.values[hover])} r={3} fill={s.color} />
            ))}
          </>
        )}

        <g fontFamily="'IBM Plex Mono',ui-monospace,monospace" fontSize={9.5} fill="var(--color-faint)">
          {dates.map((d, i) => {
            if (i % tickEvery !== 0 && i !== n - 1) return null;
            const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
            return (
              <text key={d} x={i * step} y={H + 16} textAnchor={anchor}>
                {d}
              </text>
            );
          })}
        </g>

        <g fill="transparent" style={{ pointerEvents: "all" }}>
          {dates.map((_, i) => (
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
        <ChartTooltip xPct={(hover * step / VB_W) * 100} yPct={(Math.min(...series.map((s) => y(s.values[hover]))) / TOTAL_H) * 100}>
          <div className="font-semibold">{dates[hover]}</div>
          {series.map((s) => (
            <div key={s.key} style={{ color: s.color }}>
              {s.label} {s.values[hover]}%
            </div>
          ))}
        </ChartTooltip>
      )}
    </div>
  );
}
