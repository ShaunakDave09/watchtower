import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEntrypointSourceDetail } from "../api/client";
import type { FunnelDetailData } from "../api/types";
import FunnelDetailView from "../components/funnelDetail/FunnelDetailView";
import LoadError from "../components/ui/LoadError";

export default function EntrypointSourceDetail() {
  const { funnelId = "guest-checkout", sourceId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<FunnelDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchEntrypointSourceDetail(funnelId, sourceId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [funnelId, sourceId, reloadKey]);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <FunnelDetailView
      data={data}
      breadcrumb={`Overview / Funnels / Guest Checkout / Entry points / ${data.name}`}
      backLabel="Back to Entry points"
      onBack={() => navigate(`/funnels/${funnelId}/entrypoints`)}
      headerActions={
        <button
          onClick={() => navigate(`/funnels/${funnelId}`)}
          className="inline-flex items-center gap-[7px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M8 2v12" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" transform="rotate(45 8 8)" />
          </svg>
          View full funnel
        </button>
      }
    />
  );
}
