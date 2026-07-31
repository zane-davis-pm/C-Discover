"use client";

// ============================================================
// Deep Dive Dashboard
// SPEC_DEEP_DIVE_DASHBOARD.md §6, §7 — shared dashboard shell +
// entity-type-specific analytical sections.
// ============================================================

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";

import { sourceLabel } from "@/lib/entity-fields";
import { gapLabel } from "@/lib/utils";
import { useCurrentState } from "@/lib/state-context";
import {
  entityTypeExplorePath,
  stateHasNoWebsiteLinks,
} from "@/lib/entity-type-meta";
import type {
  AnyDeepDive,
  CountyDeepDive,
  DeepDiveCategoryValue,
  DeepDiveDataGap,
  DeepDiveSourceRef,
  MunicipalityDeepDive,
  SchoolDistrictDeepDive,
  SpecialDistrictDeepDive,
} from "@/lib/types";
import {
  DataTableDisclosure,
  DistributionStrip,
  HorizontalBarChart,
  LineChart,
  MetricCard,
  StackedBarChart,
  formatByUnit,
} from "./charts";

function SectionShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-gray-200 bg-gray-50/70 p-4">
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-base font-semibold text-gray-950">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function categoryToHBar(values: DeepDiveCategoryValue[]) {
  return values.map((v) => ({
    key: v.key,
    label: v.label,
    value: v.value,
    unit: v.unit,
    year: v.year,
    sourceLabel: sourceLabel(v.source_id),
  }));
}

function Header({
  dd,
  entityLabel,
  subtitle,
}: {
  dd: AnyDeepDive;
  entityLabel: string;
  subtitle: string;
}) {
  const latestYear = "generated_at" in dd ? dd.generated_at.slice(0, 10) : null;
  // State-prefixed back link (never hardcode "/explore" — see
  // lib/entity-type-meta.ts). Falls back to the state root if the
  // deep-dive type is somehow unknown.
  const { state } = useCurrentState();
  const backHref = entityTypeExplorePath(state, dd.type);
  const showWebsite = !stateHasNoWebsiteLinks(state);
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            {entityLabel} deep dive
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-gray-950">
            {dd.name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Link
            href={backHref}
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            &larr; Back to explore
          </Link>
          {showWebsite && dd.website && (
            <a
              href={dd.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Official website
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">Generated {latestYear}</p>
    </div>
  );
}

function AccessAndSourceSection({ dd }: { dd: AnyDeepDive }) {
  const { state } = useCurrentState();
  const showWebsite = !stateHasNoWebsiteLinks(state);
  return (
    <SectionShell
      eyebrow="Access"
      title="Official entry points and source ledger"
    >
      {showWebsite && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Official website
            </p>
            {dd.website ? (
              <a
                href={dd.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Open source
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-3 text-sm italic text-gray-400">Not reported</p>
            )}
          </div>
        </div>
      )}
      <SourceLedger sources={dd.sources} />
    </SectionShell>
  );
}

function SourceLedger({ sources }: { sources: DeepDiveSourceRef[] }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">Source ledger</p>
      <div className="mt-3 divide-y divide-gray-100">
        {sources.map((s) => (
          <div
            key={s.source_id}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <div>
              <a
                href={s.source_url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  s.source_url
                    ? "text-sm font-medium text-brand-700 hover:text-brand-800"
                    : "text-sm font-medium text-gray-800"
                }
              >
                {s.source_name}
              </a>
              <p className="text-xs text-gray-400">
                {s.source_id}
                {s.fiscal_year ? `· FY${s.fiscal_year}` : ""}
                {s.publication_year ? `· ${s.publication_year}` : ""}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Retrieved {s.retrieved_at.slice(0, 10)}
            </p>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="py-2 text-sm text-gray-400">No sources recorded.</p>
        )}
      </div>
    </div>
  );
}

function DataGapsPanel({ gaps }: { gaps: DeepDiveDataGap[] }) {
  return (
    <SectionShell eyebrow="Data coverage" title="Data gaps and coverage status">
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          {gaps.length === 0
            ? "No recorded data gaps for this entity."
            : `${gaps.length} field${gaps.length === 1 ? "" : "s"} not available from current source data.`}
        </p>
        {gaps.length > 0 && (
          <DataTableDisclosure
            caption="Data gaps"
            columns={[
              { key: "field", label: "Field" },
              { key: "reason", label: "Status" },
              { key: "notes", label: "Notes" },
            ]}
            rows={gaps.map((g) => ({
              field: <span className="font-mono text-xs">{g.field}</span>,
              reason: gapLabel(g.reason),
              notes: g.notes ?? "—",
            }))}
          />
        )}
      </div>
    </SectionShell>
  );
}

// ─── County ─────────────────────────────────────────────────

function CountyDashboard({ dd }: { dd: CountyDeepDive }) {
  const get = (key: string) => dd.summary.find((m) => m.key === key);
  return (
    <div className="grid gap-5">
      <Header
        dd={dd}
        entityLabel="County"
        subtitle={`${dd.region ?? dd.county} region`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dd.summary.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={formatByUnit(m.value, m.unit)}
            sourceLabel={sourceLabel(m.source_id)}
            year={m.year}
          />
        ))}
      </div>

      <SectionShell
        eyebrow="Fiscal composition"
        title="Revenue and expenditure composition"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <StackedBarChart
            title="Revenue by category"
            data={categoryToHBar(dd.fiscal.revenue_by_category)}
            noDataMessage="No category-level EDR fiscal data was available for this entity."
          />
          <StackedBarChart
            title="Expenditure by category"
            data={categoryToHBar(dd.fiscal.expenditure_by_category)}
            noDataMessage="No category-level EDR fiscal data was available for this entity."
          />
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Per-resident profile"
        title="Fiscal measures vs statewide county distribution"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {dd.fiscal.benchmarks.map((b) => (
            <DistributionStrip
              key={b.metric_key}
              label={b.label}
              entityValue={b.entity_value}
              peerMin={b.peer_min}
              peerQ1={b.peer_q1}
              peerMedian={b.peer_median}
              peerQ3={b.peer_q3}
              peerMax={b.peer_max}
              peerCount={b.peer_count}
              unit={b.unit}
              sourceLabel={sourceLabel(b.source_id)}
              coverageNote={`Statewide county distribution, ${b.peer_count} counties.`}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Demographic context"
        title="Population and demographic profile"
      >
        <LineChart
          title="Population trend"
          points={dd.demographics.population_trend.map((p) => ({
            year: p.year,
            value: p.value,
          }))}
          unit="people"
          sourceLabel={sourceLabel("PEP")}
          noDataMessage="No Census PEP population time series was available for this county."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {dd.demographics.demographic_benchmarks.map((b) => (
            <DistributionStrip
              key={b.metric_key}
              label={b.label}
              entityValue={b.entity_value}
              peerMin={b.peer_min}
              peerQ1={b.peer_q1}
              peerMedian={b.peer_median}
              peerQ3={b.peer_q3}
              peerMax={b.peer_max}
              peerCount={b.peer_count}
              unit={b.unit}
              sourceLabel={sourceLabel(b.source_id)}
              coverageNote={`Statewide county distribution, ${b.peer_count} counties.`}
            />
          ))}
        </div>
      </SectionShell>

      <AccessAndSourceSection dd={dd} />
      <DataGapsPanel gaps={dd.data_gaps} />
    </div>
  );
}

// ─── Municipality ───────────────────────────────────────────

function MunicipalityDashboard({ dd }: { dd: MunicipalityDeepDive }) {
  return (
    <div className="grid gap-5">
      <Header
        dd={dd}
        entityLabel="Municipality"
        subtitle={`${dd.county} County${dd.entity_subtype ? `· ${dd.entity_subtype}` : ""}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dd.summary.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={formatByUnit(m.value, m.unit)}
            sourceLabel={sourceLabel(m.source_id)}
            year={m.year}
          />
        ))}
      </div>

      <SectionShell
        eyebrow="Fiscal composition"
        title="Revenue and expenditure composition"
      >
        <p className="text-xs text-gray-500">{dd.fiscal.peer_coverage_note}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <StackedBarChart
            title="Revenue by category"
            data={categoryToHBar(dd.fiscal.revenue_by_category)}
            noDataMessage="No category-level EDR fiscal data was available for this entity."
          />
          <StackedBarChart
            title="Expenditure by category"
            data={categoryToHBar(dd.fiscal.expenditure_by_category)}
            noDataMessage="No category-level EDR fiscal data was available for this entity."
          />
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Per-resident profile"
        title="Fiscal measures vs municipalities with EDR fiscal data"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {dd.fiscal.benchmarks.map((b) => (
            <DistributionStrip
              key={b.metric_key}
              label={b.label}
              entityValue={b.entity_value}
              peerMin={b.peer_min}
              peerQ1={b.peer_q1}
              peerMedian={b.peer_median}
              peerQ3={b.peer_q3}
              peerMax={b.peer_max}
              peerCount={b.peer_count}
              unit={b.unit}
              sourceLabel={sourceLabel(b.source_id)}
              coverageNote={dd.fiscal.peer_coverage_note}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Demographic context"
        title="Population and demographic profile"
      >
        <LineChart
          title="Population trend"
          points={dd.demographics.population_trend.map((p) => ({
            year: p.year,
            value: p.value,
          }))}
          unit="people"
          sourceLabel={sourceLabel("PEP")}
          noDataMessage="No Census PEP population time series was available for this municipality."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {dd.demographics.demographic_benchmarks.map((b) => (
            <DistributionStrip
              key={b.metric_key}
              label={b.label}
              entityValue={b.entity_value}
              peerMin={b.peer_min}
              peerQ1={b.peer_q1}
              peerMedian={b.peer_median}
              peerQ3={b.peer_q3}
              peerMax={b.peer_max}
              peerCount={b.peer_count}
              unit={b.unit}
              sourceLabel={sourceLabel(b.source_id)}
              coverageNote={`Statewide municipality distribution, ${b.peer_count} municipalities.`}
            />
          ))}
        </div>
      </SectionShell>

      <AccessAndSourceSection dd={dd} />
      <DataGapsPanel gaps={dd.data_gaps} />
    </div>
  );
}

// ─── School District ────────────────────────────────────────

function SchoolDistrictDashboard({ dd }: { dd: SchoolDistrictDeepDive }) {
  return (
    <div className="grid gap-5">
      <Header
        dd={dd}
        entityLabel="School district"
        subtitle={`${dd.county} County`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {dd.summary.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={formatByUnit(m.value, m.unit)}
            sourceLabel={sourceLabel(m.source_id)}
            year={m.year}
          />
        ))}
      </div>

      <SectionShell
        eyebrow="Finance profile"
        title="Revenue and expenditure breakdown"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <StackedBarChart
            title="Revenue by source"
            data={categoryToHBar(dd.finance.revenue_by_source)}
            noDataMessage="Federal / state / local revenue split was not available for this district."
          />
          <HorizontalBarChart
            title="Expenditure by function"
            data={categoryToHBar(dd.finance.expenditure_by_function)}
            noDataMessage="Expenditure-by-function detail was not available for this district."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dd.finance.benchmarks.map((b) => (
            <DistributionStrip
              key={b.metric_key}
              label={b.label}
              entityValue={b.entity_value}
              peerMin={b.peer_min}
              peerQ1={b.peer_q1}
              peerMedian={b.peer_median}
              peerQ3={b.peer_q3}
              peerMax={b.peer_max}
              peerCount={b.peer_count}
              unit={b.unit}
              sourceLabel={sourceLabel(b.source_id)}
              coverageNote={`Statewide school district distribution, ${b.peer_count} districts.`}
            />
          ))}
        </div>
      </SectionShell>

      <AccessAndSourceSection dd={dd} />
      <DataGapsPanel gaps={dd.data_gaps} />
    </div>
  );
}

// ─── Special District ───────────────────────────────────────

function SpecialDistrictDashboard({ dd }: { dd: SpecialDistrictDeepDive }) {
  return (
    <div className="grid gap-5">
      <Header
        dd={dd}
        entityLabel="Special district"
        subtitle={`${dd.county} County`}
      />

      <SectionShell eyebrow="Registry" title="Registry and governance">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dd.registry.map((m) => (
            <div
              key={m.key}
              className="rounded-md border border-gray-200 bg-white p-3"
            >
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {m.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-950">
                {formatByUnit(m.value, m.unit)}
              </dd>
            </div>
          ))}
        </dl>
      </SectionShell>

      <SectionShell eyebrow="Cohort context" title="Same-purpose cohort">
        <p className="text-xs text-gray-500">
          {dd.cohort.statewide_purpose_count} districts statewide and{" "}
          {dd.cohort.county_purpose_count} in this county share this purpose
          category.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <StackedBarChart
            title="Dependency mix (same purpose, statewide)"
            data={dd.cohort.dependency_mix.map((v) => ({
              ...v,
              sourceLabel: sourceLabel(v.source_id),
            }))}
            noDataMessage="No cohort data available."
          />
          <HorizontalBarChart
            title="Charter-year distribution (same purpose, statewide)"
            data={dd.cohort.charter_year_distribution.map((v) => ({
              ...v,
              sourceLabel: sourceLabel(v.source_id),
            }))}
            noDataMessage="No charter-year data available for this purpose cohort."
          />
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Financial coverage"
        title="LOGERx financial totals"
      >
        {dd.finance.coverage_status === "matched" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {dd.finance.latest_totals.map((m) => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={formatByUnit(m.value, m.unit)}
                sourceLabel={sourceLabel(m.source_id)}
                year={m.year}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-400">
            LOGERx financial data was not matched to this district in the
            current pipeline.
          </p>
        )}
      </SectionShell>

      <AccessAndSourceSection dd={dd} />
      <DataGapsPanel gaps={dd.data_gaps} />
    </div>
  );
}

// ─── Dispatch ───────────────────────────────────────────────

export function DeepDiveDashboard({ dd }: { dd: AnyDeepDive }) {
  switch (dd.type) {
    case "county":
      return <CountyDashboard dd={dd} />;
    case "municipality":
      return <MunicipalityDashboard dd={dd} />;
    case "school_district":
      return <SchoolDistrictDashboard dd={dd} />;
    case "special_district":
      return <SpecialDistrictDashboard dd={dd} />;
  }
}
