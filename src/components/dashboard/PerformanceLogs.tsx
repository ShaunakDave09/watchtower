import { useState } from 'react';
import clsx from 'clsx';
import { Download, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { LogEntry, LogFilter } from '@/types';

interface PerformanceLogsProps {
  logs: LogEntry[];
}

const STATUS_BADGE: Record<LogEntry['status'], { label: string; className: string }> = {
  success: {
    label: 'SUCCESS',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  error: {
    label: 'ERROR 500',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  warning: {
    label: 'WARN 429',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

const LATENCY_COLOR: Record<LogEntry['status'], string> = {
  success: 'text-slate-600 dark:text-slate-300',
  error: 'text-red-600 dark:text-red-400 font-semibold',
  warning: 'text-amber-600 dark:text-amber-400 font-semibold',
};

const FILTERS: { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'logs', label: 'Logs' },
];

export function PerformanceLogs({ logs }: PerformanceLogsProps) {
  const [filter, setFilter] = useState<LogFilter>('all');

  const filtered = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return log.status !== 'success';
    return log.status === 'success';
  });

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-dark-border">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Performance Logs
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-dark-muted">
            Last {logs.length} recorded anomalies and state changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-dark-border">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f.id
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted dark:hover:text-slate-300',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 dark:border-dark-border dark:hover:text-slate-200">
            <Download size={14} />
          </button>
          <button className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 dark:border-dark-border dark:hover:text-slate-200">
            <Share2 size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-dark-border">
              {['Timestamp', 'Endpoint', 'Status', 'Latency', 'Trace ID'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-dark-muted"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr
                key={log.id}
                className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-dark-border dark:hover:bg-dark-card"
              >
                <td className="px-5 py-3 font-mono text-[11px] text-slate-500 dark:text-dark-muted">
                  {log.timestamp}
                </td>
                <td className="px-5 py-3 text-[13px] font-medium text-slate-800 dark:text-slate-200">
                  <span className="mr-1.5 text-[10px] font-bold text-slate-400 dark:text-dark-muted">
                    {log.method}
                  </span>
                  {log.endpoint}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={clsx(
                      'inline-flex rounded px-2 py-0.5 text-[10px] font-bold',
                      STATUS_BADGE[log.status].className,
                    )}
                  >
                    {STATUS_BADGE[log.status].label}
                  </span>
                </td>
                <td
                  className={clsx(
                    'px-5 py-3 font-mono text-[12px]',
                    LATENCY_COLOR[log.status],
                  )}
                >
                  {log.latency}
                </td>
                <td className="px-5 py-3 font-mono text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  <button>{log.traceId}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
