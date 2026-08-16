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
    month: filters.month,
    date: filters.date,
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
    month: filters.month,
    date: filters.date,
  });
  return getJson(`/api/funnels/${funnelId}?${params}`);
}

// Same filter set fetchTrends sends (minus `month` — entrypoint_wise_funnel
// is read directly for the selected `date`, same as the daily table
// elsewhere, not aggregated monthly). Previously this didn't send filters
// at all, so the Filters button/bar shown on this page was decorative —
// passing them is what makes the query actually scope to what's selected.
export function fetchFunnelEntrypoints(funnelId: string, filters: FilterState): Promise<EntrypointData> {
  const params = new URLSearchParams({
    business: filters.business,
    product: filters.product,
    subProduct: filters.subProduct,
    journey: filters.journey,
    platform: filters.platform,
    version: filters.version,
    date: filters.date,
  });
  return getJson(`/api/funnels/${funnelId}/entrypoints?${params}`);
}

export function fetchEntrypointSourceDetail(
  funnelId: string,
  sourceId: string,
  filters: FilterState,
): Promise<FunnelDetailData> {
  const params = new URLSearchParams({
    business: filters.business,
    product: filters.product,
    subProduct: filters.subProduct,
    journey: filters.journey,
    platform: filters.platform,
    version: filters.version,
    date: filters.date,
  });
  return getJson(`/api/funnels/${funnelId}/entrypoints/${sourceId}?${params}`);
}

// Same filter set fetchFunnelDetail sends (minus `month` — this page
// compares two single days for one filter combination, not a monthly
// aggregate), plus `compare`, the currently active quick-compare pill label
// the backend turns into the second date.
export function fetchFunnelComparison(funnelId: string, filters: FilterState, compare: string): Promise<ComparisonData> {
  const params = new URLSearchParams({
    business: filters.business,
    product: filters.product,
    subProduct: filters.subProduct,
    journey: filters.journey,
    platform: filters.platform,
    version: filters.version,
    date: filters.date,
    compare,
  });
  return getJson(`/api/funnels/${funnelId}/compare?${params}`);
}

// Same filter set fetchFunnelDetail sends (minus `month` — this endpoint
// always queries the daily table). No range param: the backend fixes the
// window at the selected date +/- 15 days on its own (see get_trends).
export function fetchTrends(filters: FilterState): Promise<TrendsData> {
  const params = new URLSearchParams({
    business: filters.business,
    product: filters.product,
    subProduct: filters.subProduct,
    journey: filters.journey,
    platform: filters.platform,
    version: filters.version,
    date: filters.date,
  });
  return getJson(`/api/trends?${params}`);
}

export function fetchAlerts(): Promise<AlertsData> {
  return getJson("/api/alerts");
}
