import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import type { AttributionPoint } from '@/types';

interface AttributionMixCardProps {
  data: AttributionPoint[];
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
      <p className="text-slate-500 dark:text-dark-muted">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-white">
        {payload[0].value}%
      </p>
    </div>
  );
}

export function AttributionMixCard({ data }: AttributionMixCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Card>
      <CardHeader label="Attribution Mix" title="" />
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="35%">
            <XAxis
              dataKey="channel"
              tick={{ fontSize: 10, fill: isDark ? '#8b9ab5' : '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="value"
              fill={isDark ? '#3b82f6' : '#bfdbfe'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
