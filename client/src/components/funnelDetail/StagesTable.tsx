import type { FunnelStep } from "../../api/types";

export default function StagesTable({ stages }: { stages: FunnelStep[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-[22px]">
      <div className="mb-[18px] flex items-center gap-3">
        <div className="text-[15px] font-semibold text-[var(--color-ink)]">Funnel stages</div>
        <div className="flex-1" />
        <div className="flex gap-[14px] font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">
          <span>STAGE</span>
          <span className="w-[70px] text-right">USERS</span>
          <span className="w-[52px] text-right">CONV %</span>
          <span className="w-[52px] text-right">DROP</span>
          <span className="w-[190px] text-center">BAR</span>
        </div>
      </div>

      <div className="flex flex-col">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          return (
            <div
              key={stage.step}
              className={`flex items-center gap-3 py-[10px] ${!isLast ? "border-b border-[var(--color-hairline)]" : ""} ${
                stage.worst ? "-mx-6 bg-[rgba(192,57,43,0.04)] px-6" : ""
              }`}
            >
              <div
                className={`w-4 flex-none text-center font-mono text-[10px] ${
                  stage.worst ? "font-semibold text-[var(--color-danger)]" : isLast ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-faint)]"
                }`}
              >
                {stage.step}
              </div>
              <div
                className={`w-[130px] flex-none text-[12.5px] ${
                  stage.worst || isLast ? "font-semibold" : "font-medium"
                } ${stage.worst ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}
              >
                {stage.label}
              </div>
              <div className="w-[70px] flex-none text-right font-mono text-[12px] text-[var(--color-ink)]">
                {stage.users.toLocaleString()}
              </div>
              <div
                className={`w-[52px] flex-none text-right font-mono text-[12px] font-semibold ${
                  stage.worst ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"
                }`}
              >
                {stage.convPct}%
              </div>
              <div className="w-[52px] flex-none text-right font-mono text-[11px]">
                {stage.dropPct === null ? (
                  <span className="text-[var(--color-faint)]">—</span>
                ) : (
                  <span className={stage.worst ? "font-bold text-[var(--color-danger)]" : "text-[var(--color-danger)]"}>
                    ↓{stage.dropPct}%
                  </span>
                )}
              </div>
              <div className="h-[18px] min-w-[120px] flex-1 overflow-hidden rounded-[4px] bg-[var(--color-hairline)]">
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${stage.convPct}%`,
                    background: stage.worst
                      ? "var(--color-danger)"
                      : isLast
                        ? "linear-gradient(90deg,var(--color-dark-soft),var(--color-dark))"
                        : "linear-gradient(90deg,var(--color-accent-light),var(--color-accent))",
                  }}
                />
              </div>
              {stage.worst && (
                <div className="flex-none rounded-[4px] bg-[rgba(192,57,43,0.1)] px-[6px] py-[2px] font-mono text-[9px] text-[var(--color-danger)]">
                  WORST
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
