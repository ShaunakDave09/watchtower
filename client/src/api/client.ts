import type {
  AlertsData,
  ComparisonData,
  EntrypointData,
  FilterOptions,
  FilterSelection,
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

// `selection` is whatever's currently picked for business/product/subProduct
// /journey (all optional — pass what you have). The backend uses it to
// narrow every field *below* the deepest one supplied, so e.g. passing just
// `{ business }` comes back with product/subProduct/journey/version options
// scoped to that business. Omit it entirely for the unfiltered, top-level
// lists (what the modal shows before anything's been picked).
export function fetchFilterOptions(selection?: Partial<FilterSelection>): Promise<FilterOptions> {
  const params = new URLSearchParams();
  if (selection?.business) params.set("business", selection.business);
  if (selection?.product) params.set("product", selection.product);
  if (selection?.subProduct) params.set("subProduct", selection.subProduct);
  if (selection?.journey) params.set("journey", selection.journey);
  const qs = params.toString();
  return getJson(`/api/filters${qs ? `?${qs}` : ""}`);
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

// Same filter set fetchOverview sends, and the same set FilterBar/FilterModal
// already display as "ACTIVE" on the Funnel Detail page — passing it lets
// the backend query the real table by the filters actually selected, rather
// than the stage breakdown silently ignoring everything but the URL slug.
export function fetchFunnelDetail(funnelId: string, filters: FilterState): Promise<FunnelDetailData> {
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
  return getJson(`/api/funnels/${funnelId}?${params}`);
}

export function fetchFunnelEntrypoints(funnelId: string): Promise<EntrypointData> {
  return getJson(`/api/funnels/${funnelId}/entrypoints`);
}

export function fetchEntrypointSourceDetail(funnelId: string, sourceId: string): Promise<FunnelDetailData> {
  return getJson(`/api/funnels/${funnelId}/entrypoints/${sourceId}`);
}

export function fetchFunnelComparison(funnelId: string): Promise<ComparisonData> {
  return getJson(`/api/funnels/${funnelId}/compare`);
}

export function fetchTrends(): Promise<TrendsData> {
  return getJson("/api/trends");
}

export function fetchAlerts(): Promise<AlertsData> {
  return getJson("/api/alerts");
}
