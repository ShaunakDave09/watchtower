import type { ReactNode } from "react";

export type NavIconName =
  | "overview"
  | "funnels"
  | "trends"
  | "entrypoints"
  | "cohorts"
  | "alerts"
  | "integrations"
  | "settings";

const paths: Record<NavIconName, ReactNode> = {
  overview: (
    <>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </>
  ),
  funnels: <path d="M2.2 2.8h11.6l-4.3 5.3v4.3l-3 1.5V8.1L2.2 2.8Z" strokeLinejoin="round" />,
  trends: (
    <>
      <path d="M2 12.5 6.2 8l2.6 2.6L14 5" />
      <path d="M10 5h4v4" />
    </>
  ),
  entrypoints: (
    <>
      <circle cx="2.8" cy="3" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.8" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13.2" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <path d="M4 3.4 12 7.7M4 8h8M4 12.6 12 8.3" />
    </>
  ),
  cohorts: (
    <>
      <circle cx="5.8" cy="5.3" r="2.1" />
      <path d="M1.6 13.2v-.8a3 3 0 0 1 3-3h2.4a3 3 0 0 1 3 3v.8" />
      <path d="M10.6 2.7a2.1 2.1 0 0 1 0 4.1" />
      <path d="M13 13.2v-.8a3 3 0 0 0-2-2.83" />
    </>
  ),
  alerts: (
    <>
      <path d="M8 2.1a3.1 3.1 0 0 0-3.1 3.1v1.9c0 .6-.2 1.2-.6 1.7L3.3 9.9c-.5.6-.1 1.5.7 1.5h8c.8 0 1.2-.9.7-1.5l-1-1.1a2.6 2.6 0 0 1-.6-1.7V5.2A3.1 3.1 0 0 0 8 2.1Z" strokeLinejoin="round" />
      <path d="M6.4 13a1.6 1.6 0 0 0 3.2 0" />
    </>
  ),
  integrations: (
    <>
      <path d="M6.3 9.7 9.7 6.3" />
      <path d="M4.9 11.1 3.5 12.5a2 2 0 1 1-2.8-2.8l1.4-1.4a2 2 0 0 1 2.8 0" />
      <path d="M11.1 4.9 12.5 3.5a2 2 0 1 1 2.8 2.8l-1.4 1.4a2 2 0 0 1-2.8 0" />
    </>
  ),
  settings: (
    <>
      <path
        d="M8 1.5 8.6 3.2a4.9 4.9 0 0 1 1.4.6l1.7-.8 1.2 1.2-.8 1.7c.3.4.5.9.6 1.4l1.7.6v1.7l-1.7.6a4.9 4.9 0 0 1-.6 1.4l.8 1.7-1.2 1.2-1.7-.8a4.9 4.9 0 0 1-1.4.6L8 14.5l-.6-1.7a4.9 4.9 0 0 1-1.4-.6l-1.7.8-1.2-1.2.8-1.7a4.9 4.9 0 0 1-.6-1.4L1.6 9.3V7.6l1.7-.6c.1-.5.3-1 .6-1.4l-.8-1.7 1.2-1.2 1.7.8c.4-.3.9-.5 1.4-.6L8 1.5Z"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.9" />
    </>
  ),
};

export default function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke={active ? "var(--color-accent)" : "var(--color-body)"}
      strokeWidth={1.4}
      strokeLinecap="round"
      className="flex-none"
    >
      {paths[name]}
    </svg>
  );
}
