import { Download, Share2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { FunnelHealthCard } from '@/components/dashboard/FunnelHealthCard';
import { EventFlowCard } from '@/components/dashboard/EventFlowCard';
import { CriticalOutagePanel } from '@/components/dashboard/CriticalOutagePanel';
import { ServiceHealthPanel } from '@/components/dashboard/ServiceHealthPanel';
import { GlobalTrafficMap } from '@/components/dashboard/GlobalTrafficMap';
import { AttributionMixCard } from '@/components/dashboard/AttributionMixCard';
import { PerformanceLogs } from '@/components/dashboard/PerformanceLogs';

export function Overview() {
  const data = useDashboardData();

  return (
    <div className="min-h-full space-y-5 p-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
            System Status
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Executive Overview
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-600 dark:border-dark-border dark:hover:text-slate-200">
            <Download size={15} />
          </button>
          <button className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-600 dark:border-dark-border dark:hover:text-slate-200">
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_1fr_280px] gap-4 items-start">
        {/* Left: Funnel + Event Flow */}
        <div className="space-y-4">
          <FunnelHealthCard data={data.funnel} />
          <EventFlowCard data={data.eventFlow} />
        </div>

        {/* Center: Attribution Mix */}
        <div>
          <AttributionMixCard data={data.attribution} />
        </div>

        {/* Right: Outage + Service Health + Map */}
        <div className="space-y-3">
          {data.outage.active && (
            <CriticalOutagePanel data={data.outage} />
          )}
          <ServiceHealthPanel services={data.services} />
          <GlobalTrafficMap />
        </div>
      </div>

      {/* Performance Logs */}
      <PerformanceLogs logs={data.logs} />
    </div>
  );
}
