import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FiltersProvider } from "../../context/FiltersContext";

export default function AppShell() {
  return (
    <FiltersProvider>
      {/* Fixed to the viewport (h-screen + overflow-hidden) with only the
          content pane scrolling (overflow-y-auto) — not min-h-screen on a
          plain-flowing row — so a tall page (most of them; Overview is the
          one exception with its own internal scroll) scrolls its own
          content instead of growing the whole document, which would drag
          the sidebar along with it. */}
      <div className="flex h-screen items-stretch overflow-hidden bg-[var(--color-canvas)]">
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </FiltersProvider>
  );
}
