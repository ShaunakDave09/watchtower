import type { FunnelStep } from "../../api/types";

// Simple RFC4180-ish escaping: only quote (and double-up embedded quotes)
// when a field actually contains a comma, quote, or newline — labels here
// won't normally need it, but a stage name someone typed with a comma in
// it shouldn't silently corrupt the column count.
function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function stagesToCsv(stages: FunnelStep[]): string {
  const header = ["Step", "Stage", "Users", "Conv %", "Drop %"];
  const rows = stages.map((s) => [
    String(s.step),
    s.label,
    String(s.users),
    String(s.convPct),
    s.dropPct === null ? "" : String(s.dropPct),
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

// The `stages` prop already reflects whatever filters are currently
// applied (FunnelDetail refetches it on every filter change), so exporting
// it as-is exports exactly the filtered view the user is looking at —
// nothing extra to thread through here.
function downloadStagesCsv(stages: FunnelStep[], funnelName: string) {
  const csv = stagesToCsv(stages);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const slug = funnelName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "funnel"}-stages.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function StagesTable({ stages, funnelName = "funnel" }: { stages: FunnelStep[]; funnelName?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-[22px]">
      <div className="mb-[14px] flex items-center gap-3">
        <div className="text-[15px] font-semibold text-[var(--color-ink)]">Funnel stages</div>
        <div className="flex-1" />
        <button
          onClick={() => downloadStagesCsv(stages, funnelName)}
          className="inline-flex items-center gap-[6px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[6px] text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2v7m0 0l-3-3m3 3l3-3M3 12v1.5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5V12"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Mirrors the data rows' own flex structure (same widths, same gap)
          instead of a separately-laid-out row of labels — that's what
          actually keeps each header lined up over its column regardless of
          content width, rather than approximating it with a different gap
          and a fixed BAR width that drifted from the real (flexible) bar
          column below. */}
      <div className="mb-2 flex items-center gap-3 font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">
        <div className="w-4 flex-none" />
        <div className="w-[130px] flex-none">STAGE</div>
        <div className="w-[70px] flex-none text-right">USERS</div>
        <div className="w-[52px] flex-none text-right">CONV %</div>
        <div className="w-[52px] flex-none text-right">DROP</div>
        <div className="min-w-[120px] flex-1 text-center">BAR</div>
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
