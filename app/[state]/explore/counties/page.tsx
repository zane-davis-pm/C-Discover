"use client";

// ============================================================
// C-Discover — Counties Explore Page
// T-44: EC-01 through EC-10 (SPEC.md §5.3)
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped — loaders and
// region options are parameterized by params.state, no hardcoded "fl".
// ============================================================

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { loadCounties, loadStateConfig } from "@/lib/data";
import {
  filterCounties,
  countActiveCountyFilters,
  paginate,
} from "@/lib/filters";
import { countyFiltersToParams, paramsToCountyFilters } from "@/lib/url-state";
import { DEFAULT_COUNTY_FILTERS } from "@/lib/types";
import type { County, CountyFilters, StateConfig } from "@/lib/types";
import {
  formatDollars,
  formatNumber,
  formatPercent,
  gapLabel,
} from "@/lib/utils";

import { EntityTable } from "@/components/explore/EntityTable";
import type { Column } from "@/components/explore/EntityTable";
import { FilterPanel } from "@/components/explore/FilterPanel";
import { FilterTextSearch } from "@/components/explore/FilterTextSearch";
import { FilterRangeSlider } from "@/components/explore/FilterRangeSlider";
import { FilterMultiSelect } from "@/components/explore/FilterMultiSelect";
import { ResultCount } from "@/components/explore/ResultCount";
import { ActiveFilterBadge } from "@/components/explore/ActiveFilterBadge";
import { Pagination } from "@/components/explore/Pagination";
import { EntityDeepDiveModal } from "@/components/explore/EntityDeepDiveModal";
import { RowActionsCell } from "@/components/explore/RowActionsCell";

const PAGE_SIZE = 67; // Counties: show all 67, no pagination needed

// ─── Column Definition ────────────────────────────────────────

function nullOrVal(
  value: number | null | undefined,
  entity: County,
  field: string,
  formatter: (v: number) => string,
): string {
  if (value != null) return formatter(value);
  const gap = entity.data_gaps.find((g) => g.field === field);
  return gapLabel(gap?.reason ?? "unknown");
}

function buildColumns(openDetail: (e: County) => void): Column<County>[] {
  return [
    {
      key: "name",
      label: "Name",
      sortKey: "name",
      render: (c) => (
        <button
          className="text-brand-700 font-medium hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(c);
          }}
        >
          {c.name}
        </button>
      ),
    },
    {
      key: "population",
      label: "Population",
      sortKey: "population",
      align: "right",
      render: (c) => (
        <span
          className={c.population == null ? "text-gray-400 italic text-xs" : ""}
        >
          {nullOrVal(c.population, c, "population", formatNumber)}
        </span>
      ),
    },
    {
      key: "median_hh_income",
      label: "Med. HH Income",
      sortKey: "median_hh_income",
      align: "right",
      render: (c) => (
        <span
          className={
            c.median_hh_income == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(c.median_hh_income, c, "median_hh_income", formatDollars)}
        </span>
      ),
    },
    {
      key: "pct_bachelors_plus",
      label: "% Bachelor's+",
      sortKey: "pct_bachelors_plus",
      align: "right",
      render: (c) => (
        <span
          className={
            c.pct_bachelors_plus == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(
            c.pct_bachelors_plus,
            c,
            "pct_bachelors_plus",
            formatPercent,
          )}
        </span>
      ),
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      sortKey: "total_revenue",
      align: "right",
      render: (c) => (
        <span
          className={
            c.total_revenue == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(c.total_revenue, c, "total_revenue", formatDollars)}
        </span>
      ),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth",
      sortKey: "population_growth_rate",
      align: "right",
      render: (c) => (
        <span
          className={
            c.population_growth_rate == null
              ? "text-gray-400 italic text-xs"
              : ""
          }
        >
          {nullOrVal(
            c.population_growth_rate,
            c,
            "population_growth_rate",
            formatPercent,
          )}
        </span>
      ),
    },
    {
      key: "region",
      label: "Region",
      // Non-sortable column — region is best filtered via the sidebar checkbox
      render: (c) => <span className="text-xs text-gray-500">{c.region}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      sticky: true,
      render: (c) => <RowActionsCell entity={c} />,
    },
  ];
}

// ─── Inner client component (needs useSearchParams) ───────────

function CountiesContent({ state }: { state: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [counties, setCounties] = useState<County[]>([]);
  const [stateConfig, setStateConfig] = useState<StateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CountyFilters>(DEFAULT_COUNTY_FILTERS);
  const [detailEntity, setDetailEntity] = useState<County | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Load data once
  useEffect(() => {
    Promise.all([loadCounties(state), loadStateConfig(state)]).then(
      ([countyData, config]) => {
        setCounties(countyData);
        setStateConfig(config);
        setLoading(false);
      },
    );
  }, [state]);

  // Sync filters from URL on mount + URL changes
  useEffect(() => {
    setFilters(paramsToCountyFilters(searchParams, stateConfig?.regions));
  }, [searchParams, stateConfig]);

  // Bookmarked /entity/[type]/[id] redirects land here with ?dd=<id> —
  // open that entity's deep dive directly (Phase 1.4/1.5).
  useEffect(() => {
    if (loading) return;
    const ddId = searchParams.get("dd");
    if (!ddId) return;
    const found = counties.find((c) => c.id === ddId);
    if (!found) return;
    setDetailEntity(found);
    setModalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dd");
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  // Push filter changes to URL
  const updateFilters = useCallback(
    (next: CountyFilters) => {
      setFilters(next);
      const params = countyFiltersToParams(next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  function handleSort(field: string) {
    updateFilters({
      ...filters,
      sort_field: field as CountyFilters["sort_field"],
      sort_dir:
        filters.sort_field === field && filters.sort_dir === "desc"
          ? "asc"
          : "desc",
      page: 1,
    });
  }

  function clearAll() {
    updateFilters(DEFAULT_COUNTY_FILTERS);
  }

  function openDetail(entity: County) {
    setDetailEntity(entity);
    setModalOpen(true);
  }

  const activeFilterCount = countActiveCountyFilters(filters);
  const filtered = filterCounties(counties, filters);
  const {
    items: pageItems,
    totalPages,
    totalCount,
  } = paginate(filtered, filters.page, PAGE_SIZE);
  const columns = buildColumns(openDetail);
  const regionOptions = stateConfig?.regions ?? [];
  const stateName = stateConfig?.name ?? state.toUpperCase();

  return (
    <section aria-label="Counties explore">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="page-title">Counties</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All {stateName} counties — full demographic and financial data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ResultCount
            count={totalCount}
            total={counties.length}
            entityLabel="counties"
          />
          <ActiveFilterBadge count={activeFilterCount} />
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              aria-label="Clear all filters"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout: sidebar + table */}
      <div className="flex gap-5 items-start">
        <FilterPanel
          activeFilterCount={activeFilterCount}
          onClearAll={clearAll}
        >
          <FilterTextSearch
            value={filters.search}
            onChange={(v) => updateFilters({ ...filters, search: v, page: 1 })}
          />
          <FilterMultiSelect
            label="Region"
            options={regionOptions}
            selected={filters.regions as string[]}
            onChange={(v) =>
              updateFilters({
                ...filters,
                regions: v as CountyFilters["regions"],
                page: 1,
              })
            }
          />
          <FilterRangeSlider
            label="Population"
            value={filters.population}
            onChange={(v) =>
              updateFilters({ ...filters, population: v, page: 1 })
            }
          />
          <FilterRangeSlider
            label="Median HH Income ($)"
            value={filters.median_hh_income}
            onChange={(v) =>
              updateFilters({ ...filters, median_hh_income: v, page: 1 })
            }
          />
          <FilterRangeSlider
            label="Total Revenue ($)"
            value={filters.total_revenue}
            onChange={(v) =>
              updateFilters({ ...filters, total_revenue: v, page: 1 })
            }
          />
          <FilterRangeSlider
            label="% Bachelor's+"
            value={filters.pct_bachelors_plus}
            onChange={(v) =>
              updateFilters({ ...filters, pct_bachelors_plus: v, page: 1 })
            }
            step={0.1}
          />
          <FilterRangeSlider
            label="Population Growth Rate (%)"
            value={filters.population_growth_rate}
            onChange={(v) =>
              updateFilters({ ...filters, population_growth_rate: v, page: 1 })
            }
          />
        </FilterPanel>

        {/* Table area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Loading counties…
            </div>
          ) : (
            <>
              <EntityTable
                data={pageItems}
                columns={columns}
                sortField={filters.sort_field}
                sortDir={filters.sort_dir}
                onSort={handleSort}
                onRowClick={openDetail}
                caption={`${stateName} counties with demographic and financial data`}
                emptyMessage="No counties match the current filters. Try clearing some filters."
              />
              <Pagination
                page={filters.page}
                totalPages={totalPages}
                onPageChange={(p) => updateFilters({ ...filters, page: p })}
              />
            </>
          )}
        </div>
      </div>

      {/* Deep dive overlay */}
      <EntityDeepDiveModal
        entity={detailEntity}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}

// ─── Page export (wraps client component in Suspense) ─────────

export default function CountiesPage({
  params,
}: {
  params: { state: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      }
    >
      <CountiesContent state={params.state} />
    </Suspense>
  );
}
