import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';

// Simplified world map path (continent outlines as basic shapes)
// Dots represent active traffic hotspots
const HOTSPOTS = [
  { cx: 200, cy: 110, r: 5, label: 'US-East' },
  { cx: 155, cy: 118, r: 3.5, label: 'US-West' },
  { cx: 310, cy: 95, r: 3, label: 'EU-West' },
  { cx: 390, cy: 110, r: 2.5, label: 'Asia-South' },
  { cx: 430, cy: 100, r: 2, label: 'Asia-East' },
];

// Very simplified continent silhouettes as polygons
const CONTINENTS = [
  // North America
  'M 120,70 L 170,65 L 220,75 L 230,130 L 200,145 L 160,140 L 130,120 Z',
  // South America
  'M 175,150 L 200,148 L 215,160 L 210,210 L 185,218 L 165,200 L 165,165 Z',
  // Europe
  'M 290,60 L 335,55 L 345,75 L 330,100 L 295,100 L 285,80 Z',
  // Africa
  'M 295,108 L 340,105 L 350,170 L 320,200 L 290,185 L 280,140 Z',
  // Asia
  'M 345,55 L 460,50 L 470,110 L 420,130 L 360,120 L 340,90 Z',
  // Oceania
  'M 420,155 L 460,150 L 465,175 L 435,182 L 415,172 Z',
];

export function GlobalTrafficMap() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="relative">
        <svg
          viewBox="0 0 580 240"
          className="w-full"
          style={{ background: isDark ? '#161b27' : '#f8fafc' }}
        >
          {/* Ocean grid lines */}
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 40}
              x2={580}
              y2={i * 40}
              stroke={isDark ? '#2a3347' : '#e2e8f0'}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 40}
              y1={0}
              x2={i * 40}
              y2={240}
              stroke={isDark ? '#2a3347' : '#e2e8f0'}
              strokeWidth={0.5}
            />
          ))}

          {/* Continents */}
          {CONTINENTS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={isDark ? '#2a3347' : '#e2e8f0'}
              stroke={isDark ? '#3a4a60' : '#cbd5e1'}
              strokeWidth={0.5}
            />
          ))}

          {/* Traffic hotspots */}
          {HOTSPOTS.map((dot) => (
            <g key={dot.label}>
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={dot.r * 2.5}
                fill="#3b82f6"
                opacity={0.15}
              />
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={dot.r}
                fill="#3b82f6"
                opacity={0.9}
              />
            </g>
          ))}
        </svg>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-dark-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
            Global Traffic
          </span>
          <button className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400">
            Live Map
          </button>
        </div>
      </div>
    </Card>
  );
}
