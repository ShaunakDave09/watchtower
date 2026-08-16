import { useEffect, useRef, useState } from "react";

interface SeriesOption {
  key: string;
  label: string;
  color: string;
}

// Generic checkbox-popover multi-select for picking which chart series to
// plot, out of however many the current filters/stage list produced —
// there's no existing multi-select control anywhere else in the app to
// reuse (every other dropdown here is a single-value native <select>).
export default function SeriesMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: SeriesOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-[6px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[12px] py-[7px] text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
      >
        {selected.size}/{options.length} shown
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="var(--color-body)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-[6px] w-[230px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] p-[10px] shadow-[0_10px_30px_-10px_rgba(20,16,12,0.35)]">
          <div className="mb-[8px] flex items-center justify-between px-[2px]">
            <button
              onClick={() => onChange(new Set(options.map((o) => o.key)))}
              className="font-mono text-[10px] tracking-[0.04em] text-[var(--color-accent)]"
            >
              SELECT ALL
            </button>
            <button onClick={() => onChange(new Set())} className="font-mono text-[10px] tracking-[0.04em] text-[var(--color-accent)]">
              CLEAR
            </button>
          </div>
          <div className="flex max-h-[240px] flex-col gap-[2px] overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-center gap-[8px] rounded-[6px] px-[6px] py-[6px] text-[12px] text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.key)}
                  onChange={() => toggle(opt.key)}
                  className="h-[13px] w-[13px] flex-none accent-[var(--color-accent)]"
                />
                <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: opt.color }} />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
