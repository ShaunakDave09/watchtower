import { Card, CardHeader } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import type { ServiceHealth } from '@/types';

interface ServiceHealthPanelProps {
  services: ServiceHealth[];
}

const statusLabel: Record<string, string> = {
  healthy: '',
  degraded: 'Degraded',
  critical: 'Critical',
};

const statusColor: Record<string, string> = {
  healthy: 'text-green-600 dark:text-green-400 font-semibold text-xs',
  degraded: 'text-amber-500 dark:text-amber-400 font-semibold text-xs',
  critical: 'text-red-500 dark:text-red-400 font-semibold text-xs',
};

export function ServiceHealthPanel({ services }: ServiceHealthPanelProps) {
  return (
    <Card>
      <CardHeader label="Service Health" title="" />
      <ul className="space-y-3">
        {services.map((svc) => (
          <li key={svc.name} className="flex items-center gap-3">
            <StatusDot status={svc.status} pulse={svc.status === 'critical'} />
            <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-slate-200">
              {svc.name}
            </span>
            <span className={statusColor[svc.status]}>
              {svc.uptime ?? statusLabel[svc.status]}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
