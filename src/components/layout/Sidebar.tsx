import clsx from 'clsx';
import {
  LayoutDashboard,
  Filter,
  MousePointerClick,
  AlertTriangle,
  Bell,
  Settings,
  Plus,
  Shield,
} from 'lucide-react';
import type { NavItem } from '@/types';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
}

const navItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} /> },
  { id: 'funnels', label: 'Funnels', icon: <Filter size={17} /> },
  {
    id: 'clickstream',
    label: 'Clickstream',
    icon: <MousePointerClick size={17} />,
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: <AlertTriangle size={17} />,
  },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={17} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={17} /> },
];

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[188px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-dark-border dark:bg-dark-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-dark-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Shield size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-50">
            The Watchtower
          </p>
          <p className="truncate text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
            Observability Engine
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavChange(item.id)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  activeNav === item.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-600/15 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-dark-card dark:hover:text-slate-200',
                )}
              >
                <span
                  className={clsx(
                    activeNav === item.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500',
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-200 p-3 dark:border-dark-border">
        <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
          <Plus size={15} />
          New Analysis
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            AC
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              Alex Chen
            </p>
            <p className="truncate text-[10px] text-slate-400 dark:text-dark-muted">
              Platform Lead
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
