import type { AlertRule } from "../../api/types";

export default function AlertRulesList({ rules }: { rules: AlertRule[] }) {
  return (
    <div className="flex flex-col">
      {rules.map((rule, i) => (
        <div
          key={rule.id}
          className={`flex items-center gap-3 py-[12px] ${i !== rules.length - 1 ? "border-b border-[var(--color-hairline)]" : ""} ${
            rule.muted ? "opacity-60" : ""
          }`}
        >
          <span
            className={`h-[7px] w-[7px] flex-none rounded-full ${rule.muted ? "bg-[var(--color-faint)]" : "bg-[var(--color-success)]"}`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-[var(--color-ink)]">{rule.name}</div>
            <div className="font-mono text-[11px] text-[var(--color-faint)]">{rule.condition}</div>
          </div>
          <div className="flex flex-none items-center gap-[6px]">
            {rule.muted ? (
              <span className="rounded-full bg-[var(--color-quiet)] px-[9px] py-[3px] font-mono text-[9.5px] font-semibold text-[var(--color-ink-soft)]">
                MUTED
              </span>
            ) : (
              rule.channels.map((ch) => (
                <span key={ch} className="rounded-full bg-[var(--color-accent-chip)] px-[9px] py-[3px] font-mono text-[10px] text-[var(--color-ink-soft)]">
                  {ch}
                </span>
              ))
            )}
          </div>
          <button className="flex-none px-1 text-[16px] leading-none text-[var(--color-faint)] hover:text-[var(--color-body)]">
            ⋯
          </button>
        </div>
      ))}
    </div>
  );
}
