import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { NavItem } from '@/types';

type Environment = 'Production' | 'Staging' | 'UAT';
type Timeframe = 'Last 1h' | 'Last 6h' | 'Last 24h' | 'Last 7d';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('overview');
  const [environment, setEnvironment] = useState<Environment>('Production');
  const [timeframe, setTimeframe] = useState<Timeframe>('Last 24h');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-bg">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          environment={environment}
          timeframe={timeframe}
          onEnvironmentChange={setEnvironment}
          onTimeframeChange={setTimeframe}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
