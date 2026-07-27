import type { CalendarDay } from "../../hooks/useFilters";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dayClasses(day: CalendarDay) {
  if (day.isStart || day.isEnd) return "bg-[var(--color-accent)] text-white font-semibold rounded-lg";
  if (day.inRange) return "bg-[var(--color-accent-soft)] rounded-sm";
  return "rounded-lg hover:bg-[var(--color-accent-chip)]";
}

interface CalendarMonthProps {
  label: string;
  days: (CalendarDay | null)[];
  onPrev?: () => void;
  onNext?: () => void;
}

export default function CalendarMonth({ label, days, onPrev, onNext }: CalendarMonthProps) {
  return (
    <div className="flex-1">
      <div className="mb-[10px] flex items-center">
        {onPrev ? (
          <button
            onClick={onPrev}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[14px] leading-none text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
          >
            ‹
          </button>
        ) : (
          <div className="w-[26px]" />
        )}
        <div className="flex-1 text-center text-[13px] font-semibold text-[var(--color-ink)]">{label}</div>
        {onNext ? (
          <button
            onClick={onNext}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[14px] leading-none text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
          >
            ›
          </button>
        ) : (
          <div className="w-[26px]" />
        )}
      </div>
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="flex h-6 items-center justify-center font-mono text-[9px] text-[var(--color-faint)]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[1px]">
        {days.map((day, i) =>
          day ? (
            <button
              key={i}
              onClick={day.onClick}
              className={`flex h-8 items-center justify-center border-0 p-0 font-sans text-[12px] text-[var(--color-ink)] ${dayClasses(day)}`}
            >
              {day.date}
            </button>
          ) : (
            <div key={i} className="h-8" />
          ),
        )}
      </div>
    </div>
  );
}
