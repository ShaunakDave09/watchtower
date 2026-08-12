import type { CSSProperties, ReactNode } from "react";

// Sidebar nav icons — plain SVGs (Lucide's shapes) animated with CSS
// `@keyframes` (defined in index.css) triggered by Tailwind's `group-hover`,
// so hovering anywhere on a nav row plays the icon's animation with no JS
// animation library involved.
//
// This used to be built on Animate UI (Lucide icons animated with the
// `motion` npm package). That package failed to resolve at build time in
// the Databricks App's deploy environment even though it installs and
// builds fine in local/dev sandboxes — a network/registry difference we
// can't inspect or control from here. Rebuilding on plain CSS keyframes
// removes that dependency entirely: nothing to fail to resolve, since
// there's nothing left to install beyond React itself.

export type NavIconName =
  | "overview"
  | "funnels"
  | "trends"
  | "entrypoints"
  | "cohorts"
  | "alerts"
  | "integrations"
  | "settings";

// Every shape that scales in place (rather than rotating around the whole
// viewBox) uses this so its transform-origin is its own center, regardless
// of where it sits in the 24x24 grid — without it, `transform: scale()`
// would pivot around the SVG's origin instead of the shape itself.
const fillBoxCenter: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function Svg({ color, children }: { color: string; children: ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none"
      style={{ color }}
    >
      {children}
    </svg>
  );
}

interface IconProps {
  color: string;
}

// A stroke that "draws" itself in on hover. `pathLength={1}` normalizes the
// path's length to 1 regardless of its actual size in user units, so every
// icon can share the same dash-offset keyframes instead of each needing its
// real path length measured out by hand.
function DrawPath({ d, delay = 0 }: { d: string; delay?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      strokeDasharray={1}
      className="group-hover:[animation:nav-icon-draw_0.5s_ease-out_forwards]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function Overview({ color }: IconProps) {
  // Layout dashboard: four tiles, each dipping in on hover with a slight
  // stagger so they don't all move as one block.
  const tiles: [number, number, number, number, number][] = [
    [3, 3, 7, 9, 0],
    [14, 3, 7, 5, 0.06],
    [14, 12, 7, 9, 0.12],
    [3, 16, 7, 5, 0.18],
  ];
  return (
    <Svg color={color}>
      {tiles.map(([x, y, w, h, delay]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1}
          ry={1}
          className="group-hover:[animation:nav-icon-pop_0.5s_ease-in-out]"
          style={{ ...fillBoxCenter, animationDelay: `${delay}s` }}
        />
      ))}
    </Svg>
  );
}

function Funnels({ color }: IconProps) {
  // Chart with decreasing bars: the frame stays put, the three bars draw
  // themselves in left-to-right on hover.
  return (
    <Svg color={color}>
      <DrawPath d="M7 6h12" />
      <DrawPath d="M7 11h8" delay={0.1} />
      <DrawPath d="M7 16h3" delay={0.2} />
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    </Svg>
  );
}

function Trends({ color }: IconProps) {
  // Chart line: the frame stays put, the trend line draws itself in.
  return (
    <Svg color={color}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <DrawPath d="m19 9-5 5-4-4-3 3" />
    </Svg>
  );
}

function Entrypoints({ color }: IconProps) {
  // Route: the connecting path draws in, the two endpoint dots pulse.
  return (
    <Svg color={color}>
      <circle
        cx={6}
        cy={19}
        r={3}
        className="group-hover:[animation:nav-icon-dot-pulse_0.5s_ease-in-out]"
        style={fillBoxCenter}
      />
      <DrawPath d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle
        cx={18}
        cy={5}
        r={3}
        className="group-hover:[animation:nav-icon-dot-pulse_0.5s_ease-in-out]"
        style={{ ...fillBoxCenter, animationDelay: "0.2s" }}
      />
    </Svg>
  );
}

function Cohorts({ color }: IconProps) {
  // Users: a light, staggered bounce across all three figures.
  const delays = [0, 0.05, 0.1];
  return (
    <Svg color={color}>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        className="group-hover:[animation:nav-icon-bounce_0.5s_ease-in-out]"
        style={{ animationDelay: `${delays[0]}s` }}
      />
      <path
        d="M16 3.128a4 4 0 0 1 0 7.744"
        className="group-hover:[animation:nav-icon-bounce_0.5s_ease-in-out]"
        style={{ animationDelay: `${delays[1]}s` }}
      />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        className="group-hover:[animation:nav-icon-bounce_0.5s_ease-in-out]"
        style={{ animationDelay: `${delays[2]}s` }}
      />
      <circle
        cx={9}
        cy={7}
        r={4}
        className="group-hover:[animation:nav-icon-bounce_0.5s_ease-in-out]"
        style={{ animationDelay: `${delays[0]}s` }}
      />
    </Svg>
  );
}

function Alerts({ color }: IconProps) {
  // Bell: rings and settles, pivoting near its hanger at the top.
  return (
    <Svg color={color}>
      <g
        className="group-hover:[animation:nav-icon-ring_0.6s_ease-in-out]"
        style={{ transformOrigin: "12px 3px" }}
      >
        <path d="M10.268 21a2 2 0 0 0 3.464 0" />
        <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
      </g>
    </Svg>
  );
}

function Integrations({ color }: IconProps) {
  // Link: the two halves nudge apart then reconnect, as if plugging in.
  return (
    <Svg color={color}>
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        className="group-hover:[animation:nav-icon-link-shift_0.5s_ease-in-out]"
        style={{ "--nav-icon-shift-x": "-1.5px", "--nav-icon-shift-y": "1.5px" } as CSSProperties}
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        className="group-hover:[animation:nav-icon-link-shift_0.5s_ease-in-out]"
        style={{ "--nav-icon-shift-x": "1.5px", "--nav-icon-shift-y": "-1.5px" } as CSSProperties}
      />
    </Svg>
  );
}

function Settings({ color }: IconProps) {
  // Gear: a smooth quarter-turn on hover — a plain CSS transition (rather
  // than a keyframe animation) reads better for a sustained hover than a
  // one-shot animation would.
  return (
    <Svg color={color}>
      <g
        className="transition-transform duration-700 ease-in-out group-hover:rotate-90"
        style={{ transformOrigin: "12px 12px" }}
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx={12} cy={12} r={3} />
      </g>
    </Svg>
  );
}

const icons: Record<NavIconName, (props: IconProps) => ReactNode> = {
  overview: Overview,
  funnels: Funnels,
  trends: Trends,
  entrypoints: Entrypoints,
  cohorts: Cohorts,
  alerts: Alerts,
  integrations: Integrations,
  settings: Settings,
};

export default function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const Icon = icons[name];
  return <Icon color={active ? "var(--color-accent)" : "var(--color-body)"} />;
}
