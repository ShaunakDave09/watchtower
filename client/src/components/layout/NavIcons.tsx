import type { ComponentType, CSSProperties } from "react";
import { LayoutDashboard } from "../icons/animate-ui/layout-dashboard";
import { ChartBarDecreasing } from "../icons/animate-ui/chart-bar-decreasing";
import { ChartLine } from "../icons/animate-ui/chart-line";
import { Route } from "../icons/animate-ui/route";
import { Users } from "../icons/animate-ui/users";
import { Bell } from "../icons/animate-ui/bell";
import { Link as LinkIcon } from "../icons/animate-ui/link";
import { Settings } from "../icons/animate-ui/settings";

export type NavIconName =
  | "overview"
  | "funnels"
  | "trends"
  | "entrypoints"
  | "cohorts"
  | "alerts"
  | "integrations"
  | "settings";

interface NavIconProps {
  size?: number;
  animateOnHover?: boolean;
  className?: string;
  style?: CSSProperties;
}

const icons: Record<NavIconName, ComponentType<NavIconProps>> = {
  overview: LayoutDashboard,
  funnels: ChartBarDecreasing,
  trends: ChartLine,
  entrypoints: Route,
  cohorts: Users,
  alerts: Bell,
  integrations: LinkIcon,
  settings: Settings,
};

export default function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const Icon = icons[name];
  return (
    <Icon
      size={16}
      animateOnHover
      className="flex-none"
      style={{ color: active ? "var(--color-accent)" : "var(--color-body)" }}
    />
  );
}
