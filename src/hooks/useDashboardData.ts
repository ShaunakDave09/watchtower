import { useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/types';
import {
  INITIAL_DATA,
  generateEventFlowPoint,
  generateLogEntry,
} from '@/data/mockData';

const MAX_HISTORY = 12;
const MAX_LOGS = 50;

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);

  // Keep a ref to latest event flow tail value for the random walk
  const lastEventValue = useRef(
    INITIAL_DATA.eventFlow.history[INITIAL_DATA.eventFlow.history.length - 1].v,
  );

  // ── Event flow: new bar every 2s ─────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const point = generateEventFlowPoint(lastEventValue.current);
      lastEventValue.current = point.v;

      setData((prev) => {
        const history = [...prev.eventFlow.history.slice(-(MAX_HISTORY - 1)), point];
        const peak = Math.max(...history.map((p) => p.v));
        return {
          ...prev,
          eventFlow: { current: point.v, peak, history },
        };
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // ── New log entry every 4s ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const entry = generateLogEntry();
      setData((prev) => ({
        ...prev,
        logs: [entry, ...prev.logs].slice(0, MAX_LOGS),
      }));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // ── Funnel: small conversion rate drift every 30s ────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const delta = +(Math.random() * 0.2 - 0.1).toFixed(2); // ±0.1%
        const rate = +(prev.funnel.conversionRate + delta).toFixed(2);
        const wow = +Math.abs(delta).toFixed(2);
        return {
          ...prev,
          funnel: {
            ...prev.funnel,
            conversionRate: Math.max(3.0, Math.min(6.0, rate)),
            wow,
            wowDirection: delta >= 0 ? 'up' : 'down',
          },
        };
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Service health: occasional status flips every 45s ────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const services = prev.services.map((svc) => {
          // Only flip degraded/critical services with 30% chance
          if (svc.status === 'healthy') return svc;
          if (Math.random() > 0.3) return svc;
          // degraded → healthy, critical → degraded
          if (svc.status === 'critical') return { ...svc, status: 'degraded' as const };
          return { ...svc, status: 'healthy' as const, uptime: '99.90%' };
        });
        return { ...prev, services };
      });
    }, 45_000);
    return () => clearInterval(id);
  }, []);

  // ── Outage elapsed: re-render every 10s so elapsed string updates ─────────
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => ({ ...prev })); // shallow clone triggers re-render
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  return data;
}
