import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { FunnelData } from '@/types';

interface FunnelHealthCardProps {
  data: FunnelData;
}

const BAR_COLORS = [
  'bg-slate-300 dark:bg-slate-600',
  'bg-slate-400 dark:bg-slate-500',
  'bg-blue-300 dark:bg-blue-700',
  'bg-blue-600 dark:bg-blue-500',
];

export function FunnelHealthCard({ data }: FunnelHealthCardProps) {
  const { conversionRate, wow, wowDirection, stages } = data;
  const max = stages[0]?.value ?? 1;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
          Global Funnel Health
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">
            {conversionRate.toFixed(1)}%
          </span>
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${
              wowDirection === 'up'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500 dark:text-red-400'
            }`}
          >
            {wowDirection === 'up' ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            {wow.toFixed(2)}% WoW
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        {stages.map((stage, i) => {
          const heightPct = (stage.value / max) * 100;
          return (
            <div
              key={stage.label}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {stage.formatted}
              </span>
              <div className="w-full" style={{ height: 80 }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-700 ${BAR_COLORS[i]}`}
                  style={{
                    height: `${heightPct}%`,
                    marginTop: `${100 - heightPct}%`,
                  }}
                />
              </div>
              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-dark-muted">
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
