import type { UseFiltersReturn } from "../../hooks/useFilters";

export default function FilterBar({ filters }: { filters: UseFiltersReturn }) {
  return (
    <div className="mt-[13px] flex flex-wrap items-center gap-[7px]">
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">ACTIVE</span>
      {filters.chips.map((chip) => (
        <span
          key={chip.cat}
          className="inline-flex items-center gap-[6px] rounded-full border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] px-[11px] py-1 text-[12px] text-[var(--color-ink)]"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-[var(--color-muted)]">
            {chip.cat}
          </span>
          {chip.val}
        </span>
      ))}
    </div>
  );
}
