import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FiltersProvider } from "../../context/FiltersContext";

export default function AppShell() {
  return (
    <FiltersProvider>
      <div className="flex min-h-screen items-stretch bg-[var(--color-canvas)]">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </FiltersProvider>
  );
}
