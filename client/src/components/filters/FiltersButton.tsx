import { useFiltersContext } from "../../context/FiltersContext";

export default function FiltersButton() {
  const filters = useFiltersContext();
  return (
    <button
      onClick={() => filters.setOpen(true)}
      className="inline-flex items-center gap-[9px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-2 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 3h13M4 8h8M6.5 13h3" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Filters
      <span className="rounded-full bg-[var(--color-accent)] px-[7px] py-[1px] font-mono text-[10.5px] leading-[1.5] text-white">
        {filters.chips.length}
      </span>
    </button>
  );
}
