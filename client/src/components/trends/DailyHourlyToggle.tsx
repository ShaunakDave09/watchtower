// Same segmented-pill styling as the Platform App/Web toggle (see
// FilterModal.tsx's segBase), plus `min-w-0`: `flex-1` alone doesn't force
// equal button widths on a shrink-wrapped flex container — each button's
// minimum width defaults to its own text's min-content size, so "Hourly"
// (6 letters) rendered visibly wider than "Daily" (5) with no extra
// padding to compensate. `min-w-0` lets flex-grow actually override that
// floor, which is what makes the two options end up equal width regardless
// of label length (the App/Web toggle never surfaced this — "App"/"Web"
// happen to be close enough in width to hide it).
const segBase =
  "flex-1 min-w-0 whitespace-nowrap rounded-[7px] border-0 px-3 py-2 text-center text-[12.5px] font-medium transition-colors";

export type TrendGranularity = "daily" | "hourly";

export default function DailyHourlyToggle({
  value,
  onChange,
}: {
  value: TrendGranularity;
  onChange: (v: TrendGranularity) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
      <button
        onClick={() => onChange("daily")}
        className={`${segBase} ${value === "daily" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)]"}`}
      >
        Daily
      </button>
      <button
        onClick={() => onChange("hourly")}
        className={`${segBase} ${value === "hourly" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)]"}`}
      >
        Hourly
      </button>
    </div>
  );
}
