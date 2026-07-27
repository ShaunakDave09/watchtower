import type { FilterOptions, FilterState, FunnelDetailData, OverviewData } from "./types";

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
