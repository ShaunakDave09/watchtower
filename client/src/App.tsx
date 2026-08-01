import { Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Overview from "./pages/Overview";
import FunnelDetail from "./pages/FunnelDetail";
import EntrypointPerformance from "./pages/EntrypointPerformance";
import FunnelComparison from "./pages/FunnelComparison";
import Trends from "./pages/Trends";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/funnels/:funnelId" element={<FunnelDetail />} />
        <Route path="/funnels/:funnelId/entrypoints" element={<EntrypointPerformance />} />
        <Route path="/funnels/:funnelId/compare" element={<FunnelComparison />} />
      </Route>
    </Routes>
  );
}
