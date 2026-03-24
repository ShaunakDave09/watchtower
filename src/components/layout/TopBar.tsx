import clsx from 'clsx';
import { Search, HelpCircle, Moon, Sun, User, ChevronDown } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';

type Environment = 'Production' | 'Staging' | 'UAT';
type Timeframe = 'Last 1h' | 'Last 6h' | 'Last 24h' | 'Last 7d';

interface TopBarProps {
  environment: Environment;
  timeframe: Timeframe;
  onEnvironmentChange: (env: Environment) => void;
  onTimeframeChange: (tf: Timeframe) => void;
}

const environments: Environment[] = ['Production', 'Staging', 'UAT'];

export function TopBar({
  environment,
  timeframe,
  onEnvironmentChange,
  onTimeframeChange,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  const timeframes: Timeframe[] = ['Last 1h', 'Last 6h', 'Last 24h', 'Last 7d'];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-dark-border dark:bg-dark-surface">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search traces, logs, spans..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-dark-border dark:bg-dark-card dark:text-slate-200 dark:placeholder:text-dark-muted dark:focus:border-blue-500"
        />
      </div>

      {/* Environment tabs */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-dark-border dark:bg-dark-card overflow-hidden">
        {environments.map((env) => (
          <button
            key={env}
            onClick={() => onEnvironmentChange(env)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              environment === env
                ? 'bg-white text-slate-800 shadow-sm dark:bg-dark-surface dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted dark:hover:text-slate-300',
            )}
          >
            {environment === env && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
            {env}
          </button>
        ))}
      </div>

      {/* Timeframe selector */}
      <div className="relative">
        <select
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
          className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-dark-border dark:bg-dark-card dark:text-slate-200"
        >
          {timeframes.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>

      {/* Deploy Fix */}
      <Button size="sm" variant="danger">
        Deploy Fix
      </Button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-dark-card dark:hover:text-slate-200">
          <HelpCircle size={16} />
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-dark-card dark:hover:text-slate-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-dark-card dark:hover:text-slate-200">
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
