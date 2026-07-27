export interface FilterOptions {
  business: string[];
  product: string[];
  subProduct: string[];
  journey: string[];
  version: string[];
}

export interface FilterState {
  business: string;
  product: string;
  subProduct: string;
  journey: string;
  version: string;
  platform: "App" | "Web";
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
