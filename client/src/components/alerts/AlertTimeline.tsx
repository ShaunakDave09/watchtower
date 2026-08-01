import type { TimelineDay, TimelineEvent } from "../../api/types";

const toneDot: Record<TimelineEvent["tone"], string> = {
  critical: "bg-[var(--color-danger)]",
  warning: "bg-[var(--color-warning)]",
  resolved: "bg-[var(--color-success)]",
};

const toneText: Record<TimelineEvent["tone"], string> = {
  critical: "text-[var(--color-danger)]",
  warning: "text-[var(--color-warning)]",
  resolved: "text-[var(--color-success)]",
};

export default function AlertTimeline({ days }: { days: TimelineDay[] }) {
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <div key={day.day}>
          <div className="mb-2 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">{day.day}</div>
          <div className="flex flex-col gap-[10px]">
            {day.events.map((event) => (
              <div key={event.title + event.time} className="flex items-start gap-[10px]">
                <span className={`mt-[6px] h-2 w-2 flex-none rounded-full ${toneDot[event.tone]}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-ink)]">{event.title}</div>
                  <div className="font-mono text-[11px] text-[var(--color-faint)]">
                    {event.time}
                    {event.status && (
                      <>
                        {" · "}
                        <span className={toneText[event.tone]}>{event.status}</span>
                      </>
                    )}
                    {event.note && ` · ${event.note}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
