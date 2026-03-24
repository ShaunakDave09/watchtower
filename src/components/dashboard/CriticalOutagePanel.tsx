import { BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatElapsed } from '@/data/mockData';
import type { OutageData } from '@/types';

interface CriticalOutagePanelProps {
  data: OutageData;
  onInvestigate?: () => void;
  onSilence?: () => void;
}

export function CriticalOutagePanel({
  data,
  onInvestigate,
  onSilence,
}: CriticalOutagePanelProps) {
  const { failureCount, description, startedAt } = data;
  const elapsed = formatElapsed(startedAt);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Critical Active
        </span>
        <span className="text-[11px] font-semibold text-red-400">{elapsed}</span>
      </div>

      <h2 className="mb-1.5 text-lg font-bold leading-tight text-red-900 dark:text-red-100">
        {failureCount} Active Critical{' '}
        {failureCount === 1 ? 'Failure' : 'Failures'}
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-red-700 dark:text-red-300">
        {description}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          variant="danger"
          icon={<BarChart2 size={14} />}
          fullWidth
          onClick={onInvestigate}
        >
          View RCA Report
        </Button>
        <button
          onClick={onSilence}
          className="w-full rounded-lg py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          Silence All
        </button>
      </div>
    </div>
  );
}
