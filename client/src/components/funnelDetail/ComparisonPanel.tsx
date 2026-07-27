import { Fragment } from "react";
import type { ComparisonStageRow } from "../../api/types";

export default function ComparisonPanel({
  app,
  web,
  calloutHtml,
  rows,
}: {
  app: number;
  web: number;
  calloutHtml: string;
  rows: ComparisonStageRow[];
}) {
  const max = Math.max(app, web) * 1.5;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-[22px]">
      <div className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">Comparison</div>
      <div className="mb-[14px] font-mono text-[10px] text-[var(--color-faint)]">APP vs WEB</div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 flex-none rounded-full bg-[var(--color-accent)]" />
          <span className="w-9 flex-none text-[12px] text-[var(--color-ink)]">App</span>
          <div className="h-5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-hairline)]">
            <div className="h-full rounded-[4px] bg-[var(--color-accent)]" style={{ width: `${(app / max) * 100}%` }} />
          </div>
          <span className="w-9 flex-none text-right font-mono text-[11px] font-semibold text-[var(--color-ink)]">
            {app}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 flex-none rounded-full bg-[var(--color-body)]" />
          <span className="w-9 flex-none text-[12px] text-[var(--color-ink)]">Web</span>
          <div className="h-5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-hairline)]">
            <div className="h-full rounded-[4px] bg-[var(--color-body)]" style={{ width: `${(web / max) * 100}%` }} />
          </div>
          <span className="w-9 flex-none text-right font-mono text-[11px] font-semibold text-[var(--color-ink)]">
            {web}%
          </span>
        </div>
      </div>

      <div className="mt-3 font-mono text-[10px] text-[var(--color-success)]">{calloutHtml}</div>

      <div className="mt-[14px] border-t border-[var(--color-border)] pt-3">
        <div className="grid grid-cols-[1fr_54px_54px] gap-x-2 gap-y-1 font-mono text-[10px]">
          <div className="text-[var(--color-faint)]">STAGE</div>
          <div className="text-right text-[var(--color-accent)]">APP</div>
          <div className="text-right text-[var(--color-body)]">WEB</div>
          {rows.map((row) => (
            <Fragment key={row.stage}>
              <div className="text-[var(--color-ink-soft)]">{row.stage}</div>
              <div className={`text-right ${row.danger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
                {row.app}
              </div>
              <div className={`text-right ${row.danger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
                {row.web}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
