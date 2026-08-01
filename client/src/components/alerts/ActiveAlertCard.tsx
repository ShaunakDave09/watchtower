import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActiveAlert } from "../../api/types";
import AlertTrendChart from "./AlertTrendChart";

const severityBadge: Record<ActiveAlert["severity"], string> = {
  critical: "bg-[var(--color-danger)] text-white",
  warning: "bg-[var(--color-warning)] text-white",
};

const severityDot: Record<ActiveAlert["severity"], string> = {
  critical: "bg-[var(--color-danger)]",
  warning: "bg-[var(--color-warning)]",
};

const causeTone: Record<"danger" | "warning", string> = {
  danger: "var(--color-danger)",
  warning: "var(--color-warning)",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={`flex-none transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M4 6l4 4 4-4" stroke="var(--color-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ActiveAlertCard({ alert }: { alert: ActiveAlert }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(alert.expanded);

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        alert.severity === "critical"
          ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]"
          : "border-[var(--color-warning-border)] bg-[var(--color-warning-soft)]"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <span className={`mt-[6px] h-2 w-2 flex-none rounded-full ${severityDot[alert.severity]}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[var(--color-ink)]">{alert.title}</div>
          <div className="mt-[2px] font-mono text-[11.5px] text-[var(--color-muted)]">{alert.subtitle}</div>
        </div>
        <span className={`flex-none rounded-full px-[10px] py-[3px] font-mono text-[10px] font-semibold ${severityBadge[alert.severity]}`}>
          {alert.severity.toUpperCase()}
        </span>
        <span className="flex-none whitespace-nowrap font-mono text-[11px] text-[var(--color-faint)]">{alert.timeAgo}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="border-t border-[var(--color-danger-border)] bg-[var(--color-card)] px-5 py-5">
          {alert.metrics && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              {alert.metrics.map((m) => (
                <div key={m.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                  <div className="font-mono text-[9.5px] tracking-[0.06em] text-[var(--color-muted)]">{m.label}</div>
                  <div
                    className="mt-1 text-[20px] font-bold"
                    style={{ color: m.valueTone === "danger" ? "var(--color-danger)" : "var(--color-ink)" }}
                  >
                    {m.value}
                  </div>
                  <div className="font-mono text-[10.5px] text-[var(--color-faint)]">{m.sub}</div>
                </div>
              ))}
            </div>
          )}

          {alert.trend && (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="mb-2 font-mono text-[10px] tracking-[0.06em] text-[var(--color-faint)]">{alert.trend.label}</div>
              <AlertTrendChart trend={alert.trend} />
            </div>
          )}

          {alert.probableCauses && (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="mb-3 font-mono text-[10px] tracking-[0.06em] text-[var(--color-faint)]">PROBABLE CAUSES</div>
              <div className="flex flex-col gap-3">
                {alert.probableCauses.map((c) => (
                  <div key={c.label} className="flex items-stretch gap-[10px]">
                    <span className="w-[3px] flex-none rounded-full" style={{ background: causeTone[c.tone] }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[var(--color-ink)]">{c.label}</div>
                      <div className="font-mono text-[11px] text-[var(--color-faint)]">{c.sub}</div>
                    </div>
                    <div className="flex-none self-center font-mono text-[13px] font-semibold" style={{ color: causeTone[c.tone] }}>
                      {c.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {alert.funnelId && (
              <button
                onClick={() => navigate(`/funnels/${alert.funnelId}`)}
                className="rounded-[9px] bg-[var(--color-accent)] px-[18px] py-[9px] text-[13px] font-semibold text-white hover:bg-[var(--color-accent-hover)]"
              >
                View in funnel
              </button>
            )}
            <button className="rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[18px] py-[9px] text-[13px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]">
              Acknowledge
            </button>
            <div className="flex-1" />
            {alert.notifiedVia && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--color-faint)]">
                NOTIFIED VIA
                {alert.notifiedVia.map((ch) => (
                  <span key={ch} className="rounded-full bg-[var(--color-accent-chip)] px-[9px] py-[3px] text-[var(--color-ink-soft)]">
                    {ch}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
