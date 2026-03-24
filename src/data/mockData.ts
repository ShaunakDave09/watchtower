import type {
  DashboardData,
  EventFlowPoint,
  LogEntry,
} from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toTimeString().slice(0, 8);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmtLatency(ms: number): string {
  return `${ms}ms`;
}

const ENDPOINTS: { path: string; method: LogEntry['method'] }[] = [
  { path: '/v1/checkout/complete', method: 'POST' },
  { path: '/v1/user/profile', method: 'GET' },
  { path: '/v1/cart/items', method: 'PUT' },
  { path: '/v1/inventory/search', method: 'GET' },
  { path: '/v1/payments/intent', method: 'POST' },
  { path: '/v1/auth/refresh', method: 'POST' },
  { path: '/v1/orders/history', method: 'GET' },
  { path: '/v1/products/recommended', method: 'GET' },
  { path: '/v1/wishlist/add', method: 'POST' },
  { path: '/v1/reviews/submit', method: 'POST' },
];

/** Generate a single realistic log entry */
export function generateLogEntry(): LogEntry {
  const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const rand = Math.random();

  // 70% success, 15% error, 15% warning
  let statusCode: number;
  let latencyMs: number;
  let status: LogEntry['status'];

  if (rand < 0.70) {
    statusCode = 200;
    latencyMs = Math.floor(20 + Math.random() * 180);
    status = 'success';
  } else if (rand < 0.85) {
    statusCode = 500;
    latencyMs = Math.floor(1200 + Math.random() * 2500);
    status = 'error';
  } else {
    statusCode = 429;
    latencyMs = Math.floor(500 + Math.random() * 600);
    status = 'warning';
  }

  const ts = new Date();
  const timestamp = `${ts.getHours().toString().padStart(2, '0')}:${ts
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}.${ts
    .getMilliseconds()
    .toString()
    .padStart(3, '0')
    .slice(0, 2)}`;

  return {
    id: uid(),
    timestamp,
    endpoint: ep.path,
    method: ep.method,
    statusCode,
    latency: fmtLatency(latencyMs),
    traceId: `tr_${uid()}...`,
    status,
  };
}

/** Generate a time-series point for the event flow chart */
export function generateEventFlowPoint(prev?: number): EventFlowPoint {
  const base = prev ?? 12000;
  // random walk ±8%
  const delta = base * (Math.random() * 0.16 - 0.08);
  const v = Math.round(Math.max(7000, Math.min(16000, base + delta)));
  const ts = new Date();
  const t = `${ts.getHours().toString().padStart(2, '0')}:${ts
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  return { t, v };
}

/** Build the last N event flow history points leading up to now */
function buildInitialHistory(count = 10): EventFlowPoint[] {
  const points: EventFlowPoint[] = [];
  let v = 11000;
  const base = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 60_000);
    const t = `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const delta = v * (Math.random() * 0.12 - 0.06);
    v = Math.round(Math.max(8000, Math.min(15000, v + delta)));
    points.push({ t, v });
  }
  return points;
}

// ─── Initial dataset ────────────────────────────────────────────────────────

const initialHistory = buildInitialHistory(10);
const initialLogs: LogEntry[] = Array.from({ length: 8 }, generateLogEntry).sort(
  (a, b) => b.timestamp.localeCompare(a.timestamp),
);

export const INITIAL_DATA: DashboardData = {
  funnel: {
    conversionRate: 4.2,
    wow: 0.2,
    wowDirection: 'up',
    stages: [
      { label: 'Impression', value: 1_200_000, formatted: '1.2M' },
      { label: 'Visit', value: 780_000, formatted: '780k' },
      { label: 'Action', value: 48_000, formatted: '48k' },
      { label: 'Convert', value: 5_040, formatted: '5.04k' },
    ],
  },
  eventFlow: {
    current: initialHistory[initialHistory.length - 1].v,
    peak: Math.max(...initialHistory.map((p) => p.v)),
    history: initialHistory,
  },
  outage: {
    active: true,
    failureCount: 3,
    description:
      'Regional latency spike in US-East-1 affecting 12% of checkout workflows.',
    startedAt: Date.now() - 4 * 60_000, // started 4 minutes ago
  },
  services: [
    { name: 'Auth API', uptime: '99.98%', status: 'healthy' },
    { name: 'Data Mesh', uptime: '99.95%', status: 'healthy' },
    { name: 'Search Index', uptime: null, status: 'degraded' },
    { name: 'Checkout Flow', uptime: null, status: 'critical' },
  ],
  attribution: [
    { channel: 'Search', value: 38 },
    { channel: 'Direct', value: 28 },
    { channel: 'Social', value: 18 },
    { channel: 'Referral', value: 12 },
    { channel: 'Others', value: 4 },
  ],
  logs: initialLogs,
};

/** Format elapsed ms → "T-4m 12s" */
export function formatElapsed(startedAt: number): string {
  const ms = Date.now() - startedAt;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `T-${sec}s`;
  if (sec === 0) return `T-${min}m`;
  return `T-${min}m ${sec}s`;
}
