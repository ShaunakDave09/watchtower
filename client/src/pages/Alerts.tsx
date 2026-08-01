import { useEffect, useState } from "react";
import { fetchAlerts } from "../api/client";
import type { AlertsData } from "../api/types";
import Panel from "../components/ui/Panel";
import FiltersButton from "../components/filters/FiltersButton";
import FilterBar from "../components/overview/FilterBar";
import FilterModal from "../components/overview/FilterModal";
import ActiveAlertCard from "../components/alerts/ActiveAlertCard";
import AlertRulesList from "../components/alerts/AlertRulesList";
import AlertTimeline from "../components/alerts/AlertTimeline";

type Tab = "active" | "rules" | "timeline";

export default function Alerts() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    fetchAlerts().then(setData);
  }, []);

  if (!data) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <div className="px-7 py-[22px]">
      <div className="mb-1 flex items-start gap-4">
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">Alerts</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--color-muted)]">
            {data.firingCount} firing · {data.rulesConfiguredCount} rules configured
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <FiltersButton />
          <div className="flex gap-[3px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
            {(
              [
                { key: "active", label: "Active" },
                { key: "rules", label: "Rules" },
                { key: "timeline", label: "Timeline" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTab(opt.key)}
                className={`rounded-[7px] px-[14px] py-[7px] text-[12px] font-semibold transition-colors ${
                  tab === opt.key ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)] hover:bg-[var(--color-border)]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-[7px] rounded-[9px] bg-[var(--color-accent)] px-[16px] py-[9px] text-[13px] font-semibold text-white hover:bg-[var(--color-accent-hover)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            New rule
          </button>
        </div>
      </div>

      <FilterBar />
      <FilterModal />

      <div className="mb-5 mt-3 grid grid-cols-3 gap-3">
        <Panel className="border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-danger)]">CRITICAL</div>
          <div className="mt-1 text-[26px] font-bold text-[var(--color-danger)]">{data.summary.critical.count}</div>
          <div className="mt-1 font-mono text-[11px] text-[var(--color-ink-soft)]">{data.summary.critical.label}</div>
        </Panel>
        <Panel className="border-[var(--color-warning-border)] bg-[var(--color-warning-soft)] p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.07em] text-[#a3760b]">WARNING</div>
          <div className="mt-1 text-[26px] font-bold text-[#a3760b]">{data.summary.warning.count}</div>
          <div className="mt-1 font-mono text-[11px] text-[var(--color-ink-soft)]">{data.summary.warning.label}</div>
        </Panel>
        <Panel className="p-[18px]">
          <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-muted)]">RULES</div>
          <div className="mt-1 flex items-baseline gap-[9px]">
            <span className="text-[26px] font-bold text-[var(--color-ink)]">{data.summary.rules.count}</span>
            <span className="font-mono text-[11px] text-[var(--color-success)]">{data.summary.rules.statusLabel}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">{data.summary.rules.sub}</div>
        </Panel>
      </div>

      {tab === "active" && (
        <>
          <div className="mb-5 flex flex-col gap-3">
            {data.active.map((alert) => (
              <ActiveAlertCard key={alert.id} alert={alert} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Panel className="p-[22px]">
              <div className="mb-1 flex items-baseline gap-2">
                <div className="text-[15px] font-semibold text-[var(--color-ink)]">Alert rules</div>
                <div className="font-mono text-[11px] text-[var(--color-faint)]">{data.rules.length} rules</div>
              </div>
              <AlertRulesList rules={data.rules} />
            </Panel>
            <Panel className="p-[22px]">
              <div className="mb-3 flex items-baseline gap-2">
                <div className="text-[15px] font-semibold text-[var(--color-ink)]">Timeline</div>
                <div className="font-mono text-[11px] text-[var(--color-faint)]">Last 7 days</div>
              </div>
              <AlertTimeline days={data.timeline} />
            </Panel>
          </div>
        </>
      )}

      {tab === "rules" && (
        <Panel className="p-[22px]">
          <div className="mb-1 flex items-baseline gap-2">
            <div className="text-[15px] font-semibold text-[var(--color-ink)]">Alert rules</div>
            <div className="font-mono text-[11px] text-[var(--color-faint)]">{data.rules.length} rules</div>
          </div>
          <AlertRulesList rules={data.rules} />
        </Panel>
      )}

      {tab === "timeline" && (
        <Panel className="p-[22px]">
          <div className="mb-3 flex items-baseline gap-2">
            <div className="text-[15px] font-semibold text-[var(--color-ink)]">Timeline</div>
            <div className="font-mono text-[11px] text-[var(--color-faint)]">Last 7 days</div>
          </div>
          <AlertTimeline days={data.timeline} />
        </Panel>
      )}
    </div>
  );
}
