import { useFiltersContext } from "../../context/FiltersContext";
import CalendarMonth from "./CalendarMonth";

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-[5px] block font-mono text-[10px] tracking-[0.05em] text-[var(--color-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[10px] py-2 text-[13px] text-[var(--color-ink)]"
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

export default function FilterModal() {
  const filters = useFiltersContext();
  const { options } = filters;
  if (!filters.open || !options) return null;

  const segBase =
    "flex-1 rounded-[7px] border-0 py-2 text-center text-[12.5px] font-medium transition-colors";

  return (
    <div
      onClick={() => filters.setOpen(false)}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(42,32,24,0.5)] p-6 pt-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[820px] max-w-full origin-top animate-[drawer-drop_0.2s_ease-out] rounded-b-[18px] rounded-t-none border border-t-0 border-[var(--color-border-strong)] bg-[var(--color-card)] shadow-[0_30px_80px_-20px_rgba(20,16,12,0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-[var(--color-accent-soft)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 3h13M4 8h8M6.5 13h3" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-[var(--color-ink)]">Filter data</div>
            <div className="mt-[1px] font-mono text-[11px] text-[var(--color-muted)]">
              Narrow the dashboard to a specific journey
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => filters.setOpen(false)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[15px] leading-none text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-[22px]">
          {/* 6 dropdowns divide evenly into two full rows of 3 — Platform
              (a toggle, not a dropdown) and Date live in their own row
              below instead of joining this grid as a 7th, unevenly-filled
              cell. */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-[15px]">
            <FieldSelect label="BUSINESS" value={filters.filters.business} options={options.business} onChange={(v) => filters.set("business", v)} />
            <FieldSelect label="PRODUCT" value={filters.filters.product} options={options.product} onChange={(v) => filters.set("product", v)} />
            <FieldSelect label="SUB-PRODUCT" value={filters.filters.subProduct} options={options.subProduct} onChange={(v) => filters.set("subProduct", v)} />
            <FieldSelect label="JOURNEY" value={filters.filters.journey} options={options.journey} onChange={(v) => filters.set("journey", v)} />
            <FieldSelect label="VERSION" value={filters.filters.version} options={options.version} onChange={(v) => filters.set("version", v)} />
            <FieldSelect label="MONTH" value={filters.filters.month} options={options.month} onChange={(v) => filters.set("month", v)} />
          </div>

          <div className="mt-[15px] grid grid-cols-2 gap-x-4">
            <div>
              <span className="mb-[5px] block font-mono text-[10px] tracking-[0.05em] text-[var(--color-muted)]">
                PLATFORM
              </span>
              <div className="flex gap-1 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
                <button
                  onClick={() => filters.set("platform", "App")}
                  className={`${segBase} ${filters.filters.platform === "App" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)]"}`}
                >
                  App
                </button>
                <button
                  onClick={() => filters.set("platform", "Web")}
                  className={`${segBase} ${filters.filters.platform === "Web" ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)]"}`}
                >
                  Web
                </button>
              </div>
            </div>

            <div>
              <span className="mb-[5px] block font-mono text-[10px] tracking-[0.05em] text-[var(--color-muted)]">
                DATE
              </span>
              <div className="min-w-0 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[10px] py-[9px] font-mono text-[12px] text-[var(--color-ink)]">
                {filters.dateLabel}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-3 max-w-[340px] rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-card)] p-4">
            <CalendarMonth
              label={filters.monthLabel}
              days={filters.days}
              onPrev={filters.prevMonth}
              onNext={filters.nextMonth}
              canGoPrev={filters.canGoPrev}
              canGoNext={filters.canGoNext}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-6 py-4">
          <button onClick={filters.reset} className="px-1 py-[6px] text-[13px] text-[var(--color-accent)]">
            Reset all
          </button>
          <div className="flex-1" />
          <button
            onClick={() => filters.setOpen(false)}
            className="rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[18px] py-[9px] text-[13px] font-medium text-[var(--color-body)]"
          >
            Cancel
          </button>
          <button
            onClick={() => filters.setOpen(false)}
            className="rounded-[9px] bg-[var(--color-accent)] px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
