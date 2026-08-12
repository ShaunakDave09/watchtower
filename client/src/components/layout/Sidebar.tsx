import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useTheme } from "../../hooks/useTheme";
import NavIcon from "./NavIcons";
import type { NavIconName } from "./NavIcons";

interface NavItemProps {
  to?: string;
  icon: NavIconName;
  label: string;
  badge?: string;
  active?: boolean;
  collapsed?: boolean;
}

function activeClasses(active: boolean) {
  return active
    ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
    : "text-[var(--color-body)] hover:bg-[var(--color-border)]/40";
}

function rowContent(icon: NavIconName, label: string, active: boolean, collapsed: boolean, badge?: string): ReactNode {
  return (
    <>
      <NavIcon name={icon} active={active} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto rounded-full bg-[var(--color-danger)] px-[7px] py-[1px] font-mono text-[10px] text-white">
          {badge}
        </span>
      )}
    </>
  );
}

function NavRow({ to, icon, label, badge, collapsed = false }: NavItemProps) {
  const base = `group flex items-center gap-[10px] rounded-[9px] px-[11px] py-[9px] text-[13px] ${collapsed ? "justify-center px-0" : ""}`;

  if (!to) {
    return (
      <div title={collapsed ? label : undefined} className={`${base} ${activeClasses(false)} cursor-default`}>
        {rowContent(icon, label, false, collapsed, badge)}
      </div>
    );
  }
  return (
    <NavLink
      to={to}
      end
      title={collapsed ? label : undefined}
      className={({ isActive }) => `${base} ${activeClasses(isActive)}`}
    >
      {({ isActive }) => rowContent(icon, label, isActive, collapsed, badge)}
    </NavLink>
  );
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={collapsed ? (isDark ? "Switch to light mode" : "Switch to dark mode") : undefined}
      className={`flex items-center gap-[10px] rounded-[9px] px-[11px] py-[9px] text-[13px] text-[var(--color-body)] hover:bg-[var(--color-border)]/40 ${collapsed ? "justify-center px-0" : ""}`}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="flex-none">
        {isDark ? (
          <path
            d="M13.5 9.3A5.5 5.5 0 0 1 6.7 2.5a5.5 5.5 0 1 0 6.8 6.8Z"
            stroke="var(--color-body)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <circle cx="8" cy="8" r="3" stroke="var(--color-body)" strokeWidth="1.3" />
            <path
              d="M8 1.5v1.4M8 13.1v1.4M14.5 8h-1.4M2.9 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1"
              stroke="var(--color-body)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      {!collapsed && <span className="truncate">{isDark ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`relative flex ${collapsed ? "w-[72px]" : "w-[270px]"} flex-none flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-[14px] py-[18px] transition-[width] duration-200`}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[22px] z-10 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-card)] text-[var(--color-body)] shadow-[0_2px_6px_-2px_rgba(20,16,12,0.3)] hover:bg-[var(--color-accent-soft)]"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
        >
          <path d="M6.5 1.5 3 5l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`flex items-center gap-[9px] pb-6 pt-[6px] ${collapsed ? "justify-center px-0" : "px-[10px]"}`}>
        <div
          className="h-[26px] w-[26px] flex-none rounded-[7px]"
          style={{ background: "linear-gradient(135deg,var(--color-accent-light),var(--color-accent))" }}
        />
        {!collapsed && (
          <span className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
            Digital360
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="px-[11px] pb-2 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">
          ANALYZE
        </div>
      )}
      <div className="flex flex-col gap-[3px]">
        <NavRow to="/" icon="overview" label="Overview" collapsed={collapsed} />
        <NavRow to="/funnels/guest-checkout" icon="funnels" label="Funnels" collapsed={collapsed} />
        <NavRow to="/trends" icon="trends" label="Trends" collapsed={collapsed} />
        <NavRow to="/funnels/guest-checkout/entrypoints" icon="entrypoints" label="Entrypoint Performance" collapsed={collapsed} />
        <NavRow icon="cohorts" label="Cohorts" collapsed={collapsed} />
        <NavRow to="/alerts" icon="alerts" label="Alerts" badge="3" collapsed={collapsed} />
      </div>

      {!collapsed && (
        <div className="px-[11px] pb-2 pt-5 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-faint)]">
          WORKSPACE
        </div>
      )}
      <div className={`flex flex-col gap-[3px] ${collapsed ? "pt-5" : ""}`}>
        <NavRow icon="integrations" label="Integrations" collapsed={collapsed} />
        <NavRow icon="settings" label="Settings" collapsed={collapsed} />
        <ThemeToggle collapsed={collapsed} />
      </div>

      <div className="flex-1" />

      <div
        className={`mt-[14px] flex items-center gap-[10px] border-t border-[var(--color-border)] pb-1 pt-[11px] ${collapsed ? "justify-center px-0" : "px-[10px]"}`}
      >
        <div className="h-8 w-8 flex-none rounded-full border border-[var(--color-border-strong)] bg-[var(--color-border-strong)]" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">
              Anurag Chottani
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
