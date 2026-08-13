export interface FilterOptions {
  business: string[];
  product: string[];
  subProduct: string[];
  journey: string[];
  version: string[];
  // Real distinct EP_PLATFORM values, same cascade as business/product/etc
  // (see server/queries.py's FILTER_COLUMNS) — not a hardcoded App/Web pair.
  platform: string[];
  // "YYYY-MM" strings, sourced from the monthly summary table rather than
  // the cascade — see fetchFunnelDetail/fetchOverview's `month` param and
  // server/queries.py's fetch_month_options.
  month: string[];
}

// Sentinel meaning "don't filter on this field" — must match server/queries.py's
// ALL_VALUE exactly, since it's sent as a literal query param value. Only
// ever selected for journey/version/platform/month (see useFilters'
// DEFAULTS): business/product/subProduct always narrow the data, so they
// always need one real pick.
export const ALL_FILTER_VALUE = "All";

// What's currently picked for the upstream fields in the filter cascade
// (business -> product -> subProduct -> journey -> version -> platform).
// Passed to fetchFilterOptions so the backend can narrow each field's
// dropdown to values that actually co-occur with what's already selected
// above it. `platform` never appears here — nothing comes after it to
// narrow. `month` never appears here either — it isn't part of this cascade
// at all (see FilterOptions.month above).
export type FilterSelection = Pick<FilterState, "business" | "product" | "subProduct" | "journey" | "version">;

export interface FilterState {
  business: string;
  product: string;
  subProduct: string;
  journey: string;
  version: string;
  // "YYYY-MM", or ALL_FILTER_VALUE. Picking a real month queries the
  // monthly summary table directly instead of the daily table's from/to
  // range — a separate, coarser data path (see server/queries.py's
  // fetch_funnel_steps).
  month: string;
  // Real EP_PLATFORM value, or ALL_FILTER_VALUE — same cascade as journey/
  // version, not a hardcoded "App"/"Web" pair (see FilterOptions.platform).
  platform: string;
  from: string;
  to: string;
}

export interface Sparkline {
  points: number[];
}

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaTone: "up-good" | "up-bad" | "flat";
  baselineLabel: string;
  sparkline: number[];
  sparklineColor: string;
}

export interface FunnelStep {
  step: number;
  label: string;
  users: number;
  convPct: number;
  dropPct: number | null;
  worst?: boolean;
}

export interface RetentionCohort {
  cohortLabel: string;
  values: (number | null)[];
}

export interface TimeToConvertStep {
  label: string;
  dot: number; // 0-1 opacity scale for retained dot
  p50: string;
  p90: string;
  barPct: number;
  slow?: boolean;
}

export interface OverviewData {
  updatedLabel: string;
  kpis: Kpi[];
  funnel: {
    title: string;
    convPct: string;
    steps: FunnelStep[];
  };
  retention: {
    weekLabels: string[];
    cohorts: RetentionCohort[];
    callout: string;
  };
  timeToConvert: {
    steps: TimeToConvertStep[];
    totalLabel: string;
    totalDelta: string;
  };
  opportunity: {
    label: string;
    html: string;
  };
}

export interface DropoffReason {
  label: string;
  pct: number;
  tone: "danger" | "accent" | "muted" | "faint";
}

export interface TrendPoint {
  week: string;
  value: number;
}

export interface ComparisonStageRow {
  stage: string;
  app: string;
  web: string;
  danger?: boolean;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  currentStage: string;
  stageTone: "danger" | "success" | "muted";
  timeInStage: string;
  timeInStageDanger?: boolean;
  platform: "App" | "Web";
  status: "Stuck" | "Retrying" | "Passed";
}

export interface EntrypointSource {
  id: string;
  name: string;
  entered: number;
  quality: number;
  tier: "high" | "mid" | "low";
}

export interface EntrypointBySource {
  id: string;
  name: string;
  quality: number;
  stages: { label: string; users: number }[];
}

export interface EntrypointData {
  funnelId: string;
  funnelName: string;
  meta: string;
  funnelEntry: number;
  funnelEntryLabel: string;
  best: { source: string; quality: number; note: string };
  worst: { source: string; quality: number; note: string };
  sources: EntrypointSource[];
  bySource: EntrypointBySource[];
}

export interface ComparisonKpi {
  label: string;
  value: string;
  delta: string;
  deltaTone: Kpi["deltaTone"];
  sub: string;
}

export interface ComparisonFunnel {
  dateLabel: string;
  convPct: string;
  steps: FunnelStep[];
}

export interface ComparisonData {
  funnelId: string;
  dateA: { label: string; short: string };
  dateB: { label: string; short: string };
  quickCompare: string[];
  activeQuickCompare: string;
  kpis: ComparisonKpi[];
  funnelA: ComparisonFunnel;
  funnelB: ComparisonFunnel;
  calloutHtml: string;
}

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  endLabel: string | null;
}

export interface TrendsData {
  period: string;
  subtitle: string;
  hourly: {
    liveLabel: string;
    tickLabels: string[];
    entrants: number[];
    convRate: number[];
    expectedLow: number[];
    expectedHigh: number[];
    alertHtml: string;
  };
  pacing: {
    currentHour: number;
    today: number[];
    yesterday: number[];
    projection: number[];
    nowValue: number;
    nowDelta: string;
    projectionText: string;
  };
  conversionTrend: {
    dates: string[];
    series: TrendSeries[];
  };
}

export interface AlertMetric {
  label: string;
  value: string;
  valueTone?: "danger";
  sub: string;
}

export interface AlertTrend {
  label: string;
  threshold: number;
  tickLabels: string[];
  points: number[];
}

export interface AlertProbableCause {
  label: string;
  sub: string;
  pct: number;
  tone: "danger" | "warning";
}

export interface ActiveAlert {
  id: string;
  title: string;
  subtitle: string;
  severity: "critical" | "warning";
  timeAgo: string;
  expanded: boolean;
  metrics?: AlertMetric[];
  trend?: AlertTrend;
  probableCauses?: AlertProbableCause[];
  funnelId?: string;
  notifiedVia?: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  channels: string[];
  muted: boolean;
}

export interface TimelineEvent {
  title: string;
  time: string;
  status?: string;
  note?: string;
  tone: "critical" | "warning" | "resolved";
}

export interface TimelineDay {
  day: string;
  events: TimelineEvent[];
}

export interface AlertsData {
  firingCount: number;
  rulesConfiguredCount: number;
  summary: {
    critical: { count: number; label: string };
    warning: { count: number; label: string };
    rules: { count: number; statusLabel: string; sub: string };
  };
  active: ActiveAlert[];
  rules: AlertRule[];
  timeline: TimelineDay[];
}

export interface FunnelDetailData {
  id: string;
  name: string;
  meta: string;
  kpis: {
    totalEntries: string;
    endToEndConv: string;
    endToEndDelta: string;
    avgTimeToConvert: string;
    avgTimeDelta: string;
    biggestDropoffLabel: string;
    biggestDropoffSub: string;
  };
  stages: FunnelStep[];
  dropoffReasons: {
    stageLabel: string;
    reasons: DropoffReason[];
  };
  trend: TrendPoint[];
  comparison: {
    app: number;
    web: number;
    calloutHtml: string;
    rows: ComparisonStageRow[];
  };
  userTable: {
    stageLabel: string;
    totalUsers: number;
    users: UserRow[];
    page: number;
    pageCount: number;
  };
}
