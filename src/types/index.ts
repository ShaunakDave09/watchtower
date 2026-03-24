export type Theme = 'light' | 'dark';

export type ServiceStatus = 'healthy' | 'degraded' | 'critical';

export type LogStatus = 'success' | 'error' | 'warning';

export interface ServiceHealth {
  name: string;
  uptime: string | null;
  status: ServiceStatus;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  statusCode: number;
  latency: string;
  traceId: string;
  status: LogStatus;
}

export interface FunnelStage {
  label: string;
  value: number;
  formatted: string;
}

export interface EventFlowPoint {
  t: string;
  v: number;
}

export interface AttributionPoint {
  channel: string;
  value: number;
}

export interface FunnelData {
  conversionRate: number;
  wow: number;
  wowDirection: 'up' | 'down';
  stages: FunnelStage[];
}

export interface EventFlowData {
  current: number;
  peak: number;
  history: EventFlowPoint[];
}

export interface OutageData {
  active: boolean;
  failureCount: number;
  description: string;
  startedAt: number; // epoch ms
}

export interface DashboardData {
  funnel: FunnelData;
  eventFlow: EventFlowData;
  outage: OutageData;
  services: ServiceHealth[];
  attribution: AttributionPoint[];
  logs: LogEntry[];
}

export type NavItem =
  | 'overview'
  | 'funnels'
  | 'clickstream'
  | 'incidents'
  | 'alerts'
  | 'settings';

export type LogFilter = 'all' | 'alerts' | 'logs';
