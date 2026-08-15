import { useState } from "react";
import type { ReactNode } from "react";
import type { FunnelDetailData } from "../../api/types";
import StagesTable from "./StagesTable";
import DropoffReasons from "./DropoffReasons";
import ConversionTrendChart from "./ConversionTrendChart";
import ComparisonPanel from "./ComparisonPanel";
import UserTable from "./UserTable";
import FiltersButton from "../filters/FiltersButton";
import FilterBar from "../overview/FilterBar";
import FilterModal from "../overview/FilterModal";

function DetailKpi({
  label,
  value,
  valueColor,
  delta,
  deltaColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  delta?: string;
  deltaColor?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-[14px]">
      <div className="font-mono text-[9px] tracking-[0.07em] text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-bold" style={{ color: valueColor ?? "var(--color-ink)" }}>
          {value}
        </span>
        {delta && (
          <span className="font-mono text-[11px]" style={{ color: deltaColor }}>
            {delta}
          </span>
        )}
      </div>
      {sub && <div className="font-mono text-[10px] text-[var(--color-faint)]">{sub}</div>}
    </div>
  );
}

export default function FunnelDetailView({
  data,
  breadcrumb,
  backLabel,
  onBack,
  headerActions,
}: {
  data: FunnelDetailData;
  breadcrumb: string;
  backLabel: string;
  onBack: () => void;
  headerActions?: ReactNode;
}) {
  const [platformTab, setPlatformTab] = useState<"All" | "App" | "Web">("All");

  return (
    <div className="px-7 py-[22px]">
      <div className="mb-5 flex items-center gap-[10px]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-[6px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-card)] px-3 py-[6px] text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--color-accent-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="var(--color-body)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
        <div className="font-mono text-[11px] text-[var(--color-faint)]">{breadcrumb}</div>
      </div>

      <div className="mb-5 flex items-start gap-4">
        <div>
          <div className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">{data.name}</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--color-muted)]">{data.meta}</div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <FiltersButton />
          <div className="flex gap-[3px] rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-accent-chip)] p-[3px]">
            {(["All", "App", "Web"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPlatformTab(tab)}
                className={`rounded-[7px] px-[14px] py-[7px] text-[12px] font-semibold transition-colors ${
                  platformTab === tab ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-body)] hover:bg-[var(--color-border)]/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {headerActions}
        </div>
      </div>

      <FilterBar />
      <FilterModal />

      <div className="mb-5 mt-3 grid grid-cols-4 gap-3">
        <DetailKpi label="TOTAL ENTRIES" value={data.kpis.totalEntries} />
        <DetailKpi
          label="END-TO-END CONV"
          value={data.kpis.endToEndConv}
          valueColor="var(--color-accent)"
          delta={data.kpis.endToEndDelta}
          deltaColor="var(--color-danger)"
        />
        <DetailKpi
          label="AVG TIME TO CONVERT"
          value={data.kpis.avgTimeToConvert}
          delta={data.kpis.avgTimeDelta}
          deltaColor="var(--color-success)"
        />
        <DetailKpi
          label="BIGGEST DROP-OFF"
          value={data.kpis.biggestDropoffLabel}
          valueColor="var(--color-danger)"
          sub={data.kpis.biggestDropoffSub}
        />
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4">
        <StagesTable stages={data.stages} funnelName={data.name} />
        <div className="flex flex-col gap-4">
          <DropoffReasons stageLabel={data.dropoffReasons.stageLabel} reasons={data.dropoffReasons.reasons} />
          <ConversionTrendChart points={data.trend} />
          <ComparisonPanel
            app={data.comparison.app}
            web={data.comparison.web}
            calloutHtml={data.comparison.calloutHtml}
            rows={data.comparison.rows}
          />
        </div>
      </div>

      <UserTable
        stageLabel={data.userTable.stageLabel}
        totalUsers={data.userTable.totalUsers}
        users={data.userTable.users}
        pageCount={data.userTable.pageCount}
      />
    </div>
  );
}
