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

export function fetchOverview(_filters: FilterState): Promise<OverviewData> {
  // The backend serves static fixtures regardless of filters for now; scoping
  // KPIs/funnel/retention to the selected filters is a follow-up once real
  // data is wired in.
  return getJson("/api/overview");
}

export function fetchFunnelDetail(funnelId: string): Promise<FunnelDetailData> {
  return getJson(`/api/funnels/${funnelId}`);
}
