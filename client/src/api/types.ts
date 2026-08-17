// Earliest/latest selectable "YYYY-MM-DD", bounded by whatever data
// actually exists for the selected business/product/subProduct — either
// bound can be null if that hasn't been narrowed down yet (or the query
// failed and there's no fixture bound to fall back to either).
export interface DateRange {
  min: string | null;
  max: string | null;
}

export interface FilterOptions {
  business: string[];
  product: string[];
  subProduct: string[];
  journey: string[];
  version: string[];
  // "YYYY-MM" strings, sourced from the monthly summary table rather than
  // the cascade — see fetchFunnelDetail/fetchOverview's `month` param and
  // server/queries.py's fetch_month_options.
  month: string[];
  // Narrowed by business/product/subProduct only (see
  // server/queries.py's fetch_date_range) — bounds the date picker so it
  // can't be used to pick a day this combination has no data for at all.
  dateRange: DateRange;
}

// Sentinel meaning "don't filter on this field" — must match server/queries.py's
// ALL_VALUE exactly, since it's sent as a literal query param value. Only
// ever selected for journey/version/month (see useFilters' DEFAULTS): every
// other field always narrows the data, so it always needs one real pick.
export const ALL_FILTER_VALUE = "All";

// What's currently picked for the upstream fields in the filter cascade
// (business -> product -> subProduct -> journey -> version). Passed to
// fetchFilterOptions so the backend can narrow each field's dropdown to
// values that actually co-occur with what's already selected above it.
// `version` never appears here — nothing comes after it to narrow. `month`
// never appears here either — it isn't part of this cascade at all (see
// FilterOptions.month above).
export type FilterSelection = Pick<FilterState, "business" | "product" | "subProduct" | "journey">;

export interface FilterState {
  business: string;
  product: string;
  subProduct: string;
  journey: string;
  version: string;
  // "YYYY-MM", or ALL_FILTER_VALUE. Picking a real month queries the
  // monthly summary table directly instead of the daily table's single
  // selected date — a separate, coarser data path (see
  // server/queries.py's fetch_funnel_steps).
  month: string;
  platform: "App" | "Web";
  // "YYYY-MM-DD" — a single calendar day, not a range.
  date: string;
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
    // `steps` is a preview — only the first 5 stages (STAGE_ORDER 0-4);
    // `totalStages` is the real, full stage count so the "view full
    // breakdown" link can say how many stages are actually behind it.
    totalStages: number;
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
  // This entrypoint_group's % contribution to the total PDP views across
  // every group (PDP_VIEW_EP_CONTRI_PCT) — what ConvergenceDiagram sizes
  // each converging line by, instead of raw `entered` volume.
  contributionPct: number;
  quality: number;
  tier: "high" | "mid" | "low";
}

export interface EntrypointBySource {
  id: string;
  name: string;
  quality: number;
  // entrypoint_wise_funnel is session-level, not user-level, so these are
  // session counts (derived from that group's own PDP_VIEW_PCT/PDP_CLICK_PCT/
  // FORM1_VIEW_PCT/FORM1_CLICK_PCT columns) — named `sessions`, not `users`,
  // to match.
  stages: { label: string; sessions: number }[];
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
    // null when nothing's actually anomalous — no banner to show, rather
    // than an alert box with nothing wrong to report.
    alertHtml: string | null;
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
  // Same shape as conversionTrend, but each series is a stage's raw daily
  // user count instead of a conversion percentage to the next stage.
  stageTrend: {
    dates: string[];
    series: TrendSeries[];
  };
  // Hourly-mode counterparts of conversionTrend/stageTrend: same shapes,
  // but the x-axis is the selected date's hours instead of a +/-15-day
  // window of dates. Fetched alongside the daily versions on every
  // request so switching the Daily|Hourly toggle is instant — no refetch.
  hourlyConversionTrend: {
    dates: string[];
    series: TrendSeries[];
  };
  hourlyStageTrend: {
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
