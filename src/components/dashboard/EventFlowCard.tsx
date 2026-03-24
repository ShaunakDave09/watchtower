import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/context/ThemeContext';
import type { EventFlowData } from '@/types';

interface EventFlowCardProps {
  data: EventFlowData;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-dark-border dark:bg-dark-card">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-white">
        {payload[0].value.toLocaleString()} ev/min
      </p>
    </div>
  );
}

export function EventFlowCard({ data }: EventFlowCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { current, peak, history } = data;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
            Event Flow
          </p>
          <Badge variant="live" dot>
            LIVE
          </Badge>
        </div>
        <span className="text-[10px] font-medium text-slate-400 dark:text-dark-muted">
          Events/Min
        </span>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history} barCategoryGap="30%">
            <XAxis
              dataKey="t"
              tick={{ fontSize: 9, fill: isDark ? '#8b9ab5' : '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              }}
            />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>
              {history.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.v === peak
                      ? '#3b82f6'
                      : isDark
                        ? '#2a3347'
                        : '#e2e8f0'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {current >= 1000
            ? `${(current / 1000).toFixed(1)}k`
            : current.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 dark:text-dark-muted">
          Peak {(peak / 1000).toFixed(1)}k
        </span>
      </div>
    </Card>
  );
}
