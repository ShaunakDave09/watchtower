import type { TimeToConvertStep } from "../../api/types";

export default function TimeToConvertPanel({
  steps,
  totalLabel,
  totalDelta,
}: {
  steps: TimeToConvertStep[];
  totalLabel: string;
  totalDelta: string;
}) {
  return (
    <div>
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.label}>
              <div className="flex items-center gap-3">
                <div className="w-[88px] flex-none text-right text-[12px] font-medium text-[var(--color-ink-soft)]">
                  {step.label}
                </div>
                <div
                  className="h-[10px] w-[10px] flex-none rounded-full"
                  style={{
                    background: step.dot === 1 ? "var(--color-accent)" : `rgba(193,80,46,${step.dot})`,
                  }}
                />
                <div className="flex-1" />
              </div>
              {!isLast && (
                <div className="flex items-stretch gap-3">
                  <div className="w-[88px] flex-none" />
                  <div className="flex w-[10px] flex-none justify-center">
                    <div className="w-[1.5px] bg-[var(--color-border-strong)]" />
                  </div>
                  <div className="flex flex-1 items-center gap-2 py-[6px]">
                    <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-[var(--color-hairline)]">
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${step.barPct}%`,
                          background: step.slow ? "var(--color-danger)" : "var(--color-accent)",
                        }}
                      />
                    </div>
                    <div
                      className="w-11 flex-none font-mono text-[11px] font-semibold"
                      style={{ color: step.slow ? "var(--color-danger)" : "var(--color-ink)" }}
                    >
                      {step.p50}
                    </div>
                    <div className="flex-none font-mono text-[9px] text-[var(--color-faint)]">/ {step.p90}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-[14px] flex items-baseline gap-[6px] border-t border-[var(--color-border)] pt-3">
        <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--color-muted)]">TOTAL</div>
        <div className="text-[18px] font-bold text-[var(--color-ink)]">{totalLabel}</div>
        <div className="ml-auto font-mono text-[11px] text-[var(--color-success)]">{totalDelta}</div>
      </div>
    </div>
  );
}
