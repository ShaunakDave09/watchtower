import type { TrendsData } from "../../api/types";

const W = 760;
const H = 190;

export default function ConversionTrendMultiLine({
  dates,
  series,
}: {
  dates: string[];
  series: TrendsData["conversionTrend"]["series"];
}) {
  const n = dates.length;
  const step = W / (n - 1);

  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(...allValues) - 3;
  const max = Math.max(...allValues) + 3;
  const range = max - min || 1;
  const y = (v: number) => H - ((v - min) / range) * H;

  const tickEvery = 5;

  return (
    <svg viewBox={`0 0 ${W + 50} ${H + 22}`} width="100%" style={{ display: "block" }}>
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
    </svg>
  );
}
