import type { ReactNode } from "react";

export default function ChartTooltip({
  xPct,
  yPct,
  children,
}: {
  xPct: number;
  yPct: number;
  children: ReactNode;
}) {
  const clampedX = Math.min(96, Math.max(4, xPct));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-callout)] px-[10px] py-[7px] text-[11px] leading-[1.4] text-white shadow-[0_4px_14px_-4px_rgba(20,16,12,0.4)]"
      style={{
        left: `${clampedX}%`,
        top: `${yPct}%`,
        transform: `translate(${clampedX > 50 ? "-100%" : "0%"}, -100%) translateY(-8px)`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}
