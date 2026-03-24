import clsx from 'clsx';
import type { ServiceStatus } from '@/types';

interface StatusDotProps {
  status: ServiceStatus;
  pulse?: boolean;
  className?: string;
}

const colorMap: Record<ServiceStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-amber-500',
  critical: 'bg-red-500',
};

export function StatusDot({ status, pulse, className }: StatusDotProps) {
  return (
    <span
      className={clsx(
        'relative inline-flex h-2.5 w-2.5 rounded-full',
        colorMap[status],
        className,
      )}
    >
      {pulse && (
        <span
          className={clsx(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            colorMap[status],
          )}
        />
      )}
    </span>
  );
}
