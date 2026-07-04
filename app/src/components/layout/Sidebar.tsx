import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface NavItemProps {
  to?: string;
  label: string;
  badge?: string;
  active?: boolean;
}

function NavIcon({ active }: { active: boolean }) {
  return (
    <div
      className="h-[18px] w-[18px] flex-none rounded-[5px]"
      style={{ background: active ? "var(--color-accent)" : "var(--color-border-strong)" }}
    />
  );
}

function activeClasses(active: boolean) {
  return active
    ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
    : "text-[var(--color-body)] hover:bg-[var(--color-border)]/40";
}

function rowContent(label: string, active: boolean, badge?: string): ReactNode {
  return (
    <>
      <NavIcon active={active} />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-[var(--color-danger)] px-[7px] py-[1px] font-mono text-[10px] text-white">
          {badge}
        </span>
      )}
    </>
  );
}

function NavRow({ to, label, badge }: NavItemProps) {
  const base = "flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[13.5px]";

  if (!to) {
    return <div className={`${base} ${activeClasses(false)} cursor-default`}>{rowContent(label, false, badge)}</div>;
  }
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => `${base} ${activeClasses(isActive)}`}
    >
      {({ isActive }) => rowContent(label, isActive, badge)}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <div className="flex w-[214px] flex-none flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-[14px] py-[18px]">
      <div className="flex items-center gap-[9px] px-[10px] pb-6 pt-[6px]">
        <div
          className="h-[26px] w-[26px] rounded-[7px]"
          style={{ background: "linear-gradient(135deg,#d1622e,#c1502e)" }}
        />
        <span className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
          Digital360
        </span>
      </div>

      <div className="px-[11px] pb-2 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">
        ANALYZE
      </div>
      <div className="flex flex-col gap-[3px]">
        <NavRow to="/" label="Overview" />
        <NavRow to="/funnels/guest-checkout" label="Funnels" />
        <NavRow label="Cohorts" />
        <NavRow label="Alerts" badge="3" />
      </div>

      <div className="px-[11px] pb-2 pt-5 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">
        WORKSPACE
      </div>
      <div className="flex flex-col gap-[3px]">
        <NavRow label="Integrations" />
        <NavRow label="Settings" />
      </div>

      <div className="flex-1" />

      <div className="mt-[14px] flex items-center gap-[10px] border-t border-[var(--color-border)] px-[10px] pb-1 pt-[11px]">
        <div className="h-8 w-8 flex-none rounded-full border border-[#ddd0bd] bg-[var(--color-border-strong)]" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">
            Anurag Chottani
          </div>
        </div>
      </div>
    </div>
  );
}
