import { filterOptions, funnelDetailData, overviewData } from "./mockData";
import type { FilterOptions, FilterState, FunnelDetailData, OverviewData } from "./types";

const LATENCY_MS = 150;

function resolveAfter<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export function fetchFilterOptions(): Promise<FilterOptions> {
  return resolveAfter(filterOptions);
}

export function fetchOverview(_filters: FilterState): Promise<OverviewData> {
  // Mock data is static regardless of filters for now; a real backend
  // would scope KPIs/funnel/retention to the selected filters here.
  return resolveAfter(overviewData);
}

export function fetchFunnelDetail(_funnelId: string): Promise<FunnelDetailData> {
  return resolveAfter(funnelDetailData);
}
