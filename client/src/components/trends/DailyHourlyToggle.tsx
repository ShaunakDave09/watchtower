// Same segmented-pill styling as the Platform App/Web toggle (see
// FilterModal.tsx's segBase) — Daily is the only real option right now.
// Hourly stays visible (so it reads as "coming soon," not missing) but
// disabled: there's no hour-of-day granularity anywhere in the warehouse
// (HORIZONTAL_SUMMARY_TABLE is daily, MONTHLY_SUMMARY_TABLE is monthly),
// same gap as the Hourly throughput/Today's pacing panels above.
const segBase = "flex-1 rounded-[7px] border-0 py-2 text-center text-[12.5px] font-medium transition-colors";

export default function DailyHourlyToggle() {
  return (
    <div className="flex gap-1 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
      <button className={`${segBase} bg-[var(--color-accent)] text-white`}>Daily</button>
      <button
        disabled
        title="Hourly data isn't available yet — there's no hour-of-day granularity in the underlying tables."
        className={`${segBase} cursor-not-allowed text-[var(--color-faint)] opacity-60`}
      >
        Hourly
      </button>
    </div>
  );
}
