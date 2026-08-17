import type { EntrypointSource } from "../../api/types";

const CARD_H = 76;
const CARD_GAP = 14;
const CURVE_W = 260;
const BOX_W = 220;
const BOX_H = 140;

// How many entrypoint_group rows are visible at once before the diagram
// scrolls its own overflow, rather than growing the panel taller for every
// additional group — a deep entrypoint_group list would otherwise push the
// "Funnel by entry point" section (and everything below it) further down
// the page with no bound.
const VISIBLE_GROUPS = 4;

const tierColor: Record<EntrypointSource["tier"], string> = {
  high: "var(--color-success)",
  mid: "var(--color-warning)",
  low: "var(--color-danger)",
};

export default function ConvergenceDiagram({
  sources,
  funnelEntry,
  funnelEntryLabel,
}: {
  sources: EntrypointSource[];
  funnelEntry: number;
  funnelEntryLabel: string;
}) {
  const rows = sources.map((s, i) => ({
    source: s,
    y: i * (CARD_H + CARD_GAP) + CARD_H / 2,
  }));
  const stackHeight = sources.length * CARD_H + (sources.length - 1) * CARD_GAP;
  const boxY = stackHeight / 2;
  const visibleHeight = VISIBLE_GROUPS * CARD_H + (VISIBLE_GROUPS - 1) * CARD_GAP;

  // Line thickness = each group's contribution to the total PDP views
  // (PDP_VIEW_EP_CONTRI_PCT), not its raw entered volume — a
  // high-volume-but-low-contribution source should read as a thin line
  // converging in, same as a low-volume one.
  const contributions = sources.map((s) => s.contributionPct);
  const minContribution = Math.min(...contributions);
  const maxContribution = Math.max(...contributions);
  const strokeWidth = (v: number) =>
    2 + ((v - minContribution) / (maxContribution - minContribution || 1)) * 20;

  return (
    // Capped to exactly VISIBLE_GROUPS cards' worth of height with its own
    // vertical scroll — with more groups than that, `items-stretch`+no cap
    // would just keep growing this panel (and everything below it) taller
    // instead of ever scrolling. The three columns below still size
    // themselves to the *full* stackHeight (every group gets an equally-
    // spaced card, curve, and connection to the entry box); this wrapper is
    // what clips and scrolls that full content down to a fixed window.
    <div className="overflow-y-auto" style={{ height: Math.min(stackHeight, visibleHeight) }}>
      <div className="flex items-stretch gap-0" style={{ height: stackHeight }}>
        <div className="flex flex-none flex-col justify-between" style={{ width: 260, height: stackHeight }}>
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)] pl-[14px] pr-3"
              style={{ height: CARD_H, borderLeft: `3px solid ${tierColor[s.tier]}` }}
            >
              <div className="text-[13px] font-semibold text-[var(--color-ink)]">{s.name}</div>
              <div className="font-mono text-[10.5px] text-[var(--color-muted)]">
                {s.entered.toLocaleString()} sessions
              </div>
              <div className="font-mono text-[10.5px] font-semibold" style={{ color: tierColor[s.tier] }}>
                {s.quality.toFixed(1)}% quality
              </div>
            </div>
          ))}
        </div>

        <svg
          width={CURVE_W}
          height={stackHeight}
          viewBox={`0 0 ${CURVE_W} ${stackHeight}`}
          className="flex-none"
          style={{ overflow: "visible" }}
        >
          {rows.map(({ source, y }) => (
            <path
              key={source.id}
              d={`M0,${y} C ${CURVE_W * 0.5},${y} ${CURVE_W * 0.5},${boxY} ${CURVE_W},${boxY}`}
              fill="none"
              stroke={tierColor[source.tier]}
              strokeOpacity={0.45}
              strokeWidth={strokeWidth(source.contributionPct)}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="flex flex-none items-center" style={{ height: stackHeight }}>
          <div
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] bg-[var(--color-callout)] px-5"
            style={{ width: BOX_W, height: BOX_H }}
          >
            <div className="font-mono text-[9.5px] tracking-[0.08em] text-[#c9a68a]">FUNNEL ENTRY</div>
            <div className="text-[28px] font-bold text-white">{funnelEntry.toLocaleString()}</div>
            <div className="text-center font-mono text-[10px] text-[#c9a68a]">{funnelEntryLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
