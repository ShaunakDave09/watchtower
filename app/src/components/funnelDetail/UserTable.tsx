import { useState } from "react";
import type { UserRow } from "../../api/types";

const statusDot: Record<UserRow["status"], string> = {
  Stuck: "var(--color-danger)",
  Retrying: "var(--color-warning)",
  Passed: "var(--color-success)",
};

const statusText: Record<UserRow["status"], string> = {
  Stuck: "text-[var(--color-danger)]",
  Retrying: "text-[var(--color-muted)]",
  Passed: "text-[var(--color-success)]",
};

const stageText: Record<UserRow["stageTone"], string> = {
  danger: "text-[var(--color-danger)]",
  success: "text-[var(--color-success)]",
  muted: "text-[var(--color-ink)]",
};

const cols = "grid-cols-[180px_1fr_100px_100px_90px_90px]";

export default function UserTable({
  stageLabel,
  totalUsers,
  users,
  pageCount,
}: {
  stageLabel: string;
  totalUsers: number;
  users: UserRow[];
  pageCount: number;
}) {
  const [page, setPage] = useState(1);

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-[15px] font-semibold text-[var(--color-ink)]">{stageLabel}</div>
        <div className="font-mono text-[11px] text-[var(--color-muted)]">
          {totalUsers.toLocaleString()} users
        </div>
        <div className="flex-1" />
        <button className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[6px] text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]">
          Export CSV
        </button>
      </div>

      <div className={`grid ${cols} gap-2 border-b border-[var(--color-border)] py-2`}>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">USER</div>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">EMAIL</div>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">CURRENT STAGE</div>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">TIME IN STAGE</div>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">PLATFORM</div>
        <div className="font-mono text-[9px] tracking-[0.06em] text-[var(--color-faint)]">STATUS</div>
      </div>

      {users.map((u, i) => (
        <div
          key={u.id}
          className={`grid ${cols} items-center gap-2 py-[10px] ${i < users.length - 1 ? "border-b border-[var(--color-hairline)]" : ""}`}
        >
          <div className="flex items-center gap-2">
            <div className="h-[26px] w-[26px] flex-none rounded-full bg-[var(--color-border-strong)]" />
            <span className="text-[12px] font-medium text-[var(--color-ink)]">{u.name}</span>
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--color-body)]">{u.email}</div>
          <div className={`font-mono text-[11px] ${stageText[u.stageTone]}`}>{u.currentStage}</div>
          <div className={`font-mono text-[11px] ${u.timeInStageDanger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
            {u.timeInStage}
          </div>
          <div className="font-mono text-[11px] text-[var(--color-body)]">{u.platform}</div>
          <div className="inline-flex items-center gap-1">
            <div className="h-[6px] w-[6px] rounded-full" style={{ background: statusDot[u.status] }} />
            <span className={`font-mono text-[10px] ${statusText[u.status]}`}>{u.status}</span>
          </div>
        </div>
      ))}

      <div className="mt-[14px] flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <div className="font-mono text-[10px] text-[var(--color-faint)]">
          Showing 1–{users.length} of {totalUsers.toLocaleString()}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--color-border-strong)] bg-white text-[12px] text-[var(--color-faint)]"
          >
            ‹
          </button>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`flex h-7 w-7 items-center justify-center rounded-[6px] border font-mono text-[10px] ${
                page === n
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border-strong)] bg-white text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
              }`}
            >
              {n}
            </button>
          ))}
          <div className="flex h-7 w-7 items-center justify-center font-mono text-[10px] text-[var(--color-faint)]">…</div>
          <button className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--color-border-strong)] bg-white font-mono text-[10px] text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]">
            {pageCount}
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--color-border-strong)] bg-white text-[12px] text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
