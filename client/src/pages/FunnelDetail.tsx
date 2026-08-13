import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchFunnelDetail } from "../api/client";
import type { FunnelDetailData } from "../api/types";
import { useFiltersContext } from "../context/FiltersContext";
import FunnelDetailView from "../components/funnelDetail/FunnelDetailView";
import LoadError from "../components/ui/LoadError";

export default function FunnelDetail() {
  const { funnelId } = useParams();
  const navigate = useNavigate();
  const filters = useFiltersContext();
  const [data, setData] = useState<FunnelDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError(null);
    fetchFunnelDetail(funnelId ?? "guest-checkout", filters.filters.journey)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Refetch when the selected journey changes (e.g. cascade-corrected on
    // load, or the user picks a different one in the filter modal) so the
    // stage breakdown always matches what the filter bar shows as active.
  }, [funnelId, filters.filters.journey, reloadKey]);

  if (error) {
    return <LoadError message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }
  if (!data) {
    return <div className="p-8 font-mono text-sm text-[var(--color-muted)]">Loading…</div>;
  }

  return (
    <FunnelDetailView
      data={data}
      breadcrumb={`Overview / Funnels / ${data.name.replace(" funnel", "")}`}
      backLabel="Back to Overview"
      onBack={() => navigate("/")}
      headerActions={
        <>
          <button
            onClick={() => navigate(`/funnels/${data.id}/entrypoints`)}
            className="inline-flex items-center gap-[7px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h4l2 8h4M12 4l2 4-2 4"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Entry points
          </button>
          <button
            onClick={() => navigate(`/funnels/${data.id}/compare`)}
            className="inline-flex items-center gap-[7px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Compare
          </button>
        </>
      }
    />
  );
}
