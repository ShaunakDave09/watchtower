import type { TrendsData } from "../../api/types";

const W = 760;
const H = 190;

export default function HourlyThroughputChart({ hourly }: { hourly: TrendsData["hourly"] }) {
  const { entrants, convRate, expectedLow, expectedHigh, tickLabels } = hourly;
  const n = entrants.length;
  const slot = W / n;

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
    <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" style={{ display: "block" }}>
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
