import type {
  ComparisonData,
  EntrypointData,
  FilterOptions,
  FilterState,
  FunnelDetailData,
  OverviewData,
  TrendsData,
} from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchFilterOptions(): Promise<FilterOptions> {
  return getJson("/api/filters");
}

export function fetchOverview(filters: FilterState): Promise<OverviewData> {
  const params = new URLSearchParams({
    business: filters.business,
    product: filters.product,
    subProduct: filters.subProduct,
    journey: filters.journey,
    platform: filters.platform,
    version: filters.version,
    from: filters.from,
    to: filters.to,
  });
  return getJson(`/api/overview?${params}`);
}

export function fetchFunnelDetail(funnelId: string): Promise<FunnelDetailData> {
  return getJson(`/api/funnels/${funnelId}`);
}

export function fetchFunnelEntrypoints(funnelId: string): Promise<EntrypointData> {
  return getJson(`/api/funnels/${funnelId}/entrypoints`);
}

export function fetchFunnelComparison(funnelId: string): Promise<ComparisonData> {
  return getJson(`/api/funnels/${funnelId}/compare`);
}

export function fetchTrends(): Promise<TrendsData> {
  return getJson("/api/trends");
}
