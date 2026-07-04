import { Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Overview from "./pages/Overview";
import FunnelDetail from "./pages/FunnelDetail";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/funnels/:funnelId" element={<FunnelDetail />} />
      </Route>
    </Routes>
  );
}
