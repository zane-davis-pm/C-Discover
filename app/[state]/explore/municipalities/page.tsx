"use client";

// ============================================================
// C-Discover — Municipalities Explore Page
// T-45: EM-01 through EM-11 (SPEC.md §5.4)
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped.
// ============================================================

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  loadCounties,
  loadMunicipalities,
  loadStateConfig,
  buildCountyRegionMap,
  entityCountyNames,
} from "@/lib/data";
import {
  filterMunicipalities,
  countActiveMunicipalityFilters,
  paginate,
} from "@/lib/filters";
import {
  municipalityFiltersToParams,
  paramsToMunicipalityFilters,
} from "@/lib/url-state";
import { DEFAULT_MUNICIPALITY_FILTERS } from "@/lib/types";
import type {
  Municipality,
  MunicipalityFilters,
  County,
  StateConfig,
} from "@/lib/types";
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

const PAGE_SIZE = 50;

function nullOrVal(
  value: number | null | undefined,
  entity: Municipality,
  field: string,
  formatter: (v: number) => string,
): string {
  if (value != null) return formatter(value);
  const gap = entity.data_gaps.find((g) => g.field === field);
  return gapLabel(gap?.reason ?? "unknown");
}

function buildColumns(
  openDetail: (e: Municipality) => void,
): Column<Municipality>[] {
  return [
    {
      key: "name",
      label: "Name",
      sortKey: "name",
      render: (m) => (
        <button
          className="text-brand-700 font-medium hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(m);
          }}
        >
          {m.name}
        </button>
      ),
    },
    {
      key: "county",
      label: "County",
      sortKey: "county",
      render: (m) => (
        <span
          className={
            m.county === "Unknown"
              ? "text-gray-300 italic text-xs"
              : "text-xs text-gray-600"
          }
        >
          {m.county === "Unknown" ? "—" : m.county}
        </span>
      ),
    },
    {
      key: "population",
      label: "Population",
      sortKey: "population",
      align: "right",
      render: (m) => (
        <span
          className={m.population == null ? "text-gray-400 italic text-xs" : ""}
        >
          {nullOrVal(m.population, m, "population", formatNumber)}
        </span>
      ),
    },
    {
      key: "median_hh_income",
      label: "Med. HH Income",
      sortKey: "median_hh_income",
      align: "right",
      render: (m) => (
        <span
          className={
            m.median_hh_income == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(m.median_hh_income, m, "median_hh_income", formatDollars)}
        </span>
      ),
    },
    {
      key: "pct_bachelors_plus",
      label: "% Bachelor's+",
      sortKey: "pct_bachelors_plus",
      align: "right",
      render: (m) => (
        <span
          className={
            m.pct_bachelors_plus == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(
            m.pct_bachelors_plus,
            m,
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
      render: (m) => (
        <span
          className={
            m.total_revenue == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(m.total_revenue, m, "total_revenue", formatDollars)}
        </span>
      ),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth",
      sortKey: "population_growth_rate",
      align: "right",
      render: (m) => (
        <span
          className={
            m.population_growth_rate == null
              ? "text-gray-400 italic text-xs"
              : ""
          }
        >
          {nullOrVal(
            m.population_growth_rate,
            m,
            "population_growth_rate",
            formatPercent,
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      sticky: true,
      render: (m) => <RowActionsCell entity={m} />,
    },
  ];
}

function MunicipalitiesContent({ state }: { state: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [munis, setMunis] = useState<Municipality[]>([]);
  const [countyNames, setCountyNames] = useState<string[]>([]);
  const [countyToRegion, setCountyToRegion] = useState<
    Record<string, string>
  >({});
  const [stateConfig, setStateConfig] = useState<StateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MunicipalityFilters>(
    DEFAULT_MUNICIPALITY_FILTERS,
  );
  const [detailEntity, setDetailEntity] = useState<Municipality | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      loadMunicipalities(state),
      loadCounties(state),
      loadStateConfig(state),
    ]).then(([muniData, countyData, config]) => {
      setMunis(muniData);
      setCountyNames(entityCountyNames(muniData));
      setCountyToRegion(buildCountyRegionMap(countyData));
      setStateConfig(config);
      setLoading(false);
    });
  }, [state]);

  useEffect(() => {
    setFilters(paramsToMunicipalityFilters(searchParams, stateConfig?.regions));
  }, [searchParams, stateConfig]);

  // Bookmarked /entity/[type]/[id] redirects land here with ?dd=<id> —
  // open that entity's deep dive directly (Phase 1.4/1.5).
  useEffect(() => {
    if (loading) return;
    const ddId = searchParams.get("dd");
    if (!ddId) return;
    const found = munis.find((m) => m.id === ddId);
    if (!found) return;
    setDetailEntity(found);
    setModalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dd");
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  const updateFilters = useCallback(
    (next: MunicipalityFilters) => {
      setFilters(next);
      const params = municipalityFiltersToParams(next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  function handleSort(field: string) {
    updateFilters({
      ...filters,
      sort_field: field as MunicipalityFilters["sort_field"],
      sort_dir:
        filters.sort_field === field && filters.sort_dir === "desc"
          ? "asc"
          : "desc",
      page: 1,
    });
  }

  function clearAll() {
    updateFilters(DEFAULT_MUNICIPALITY_FILTERS);
  }

  function openDetail(entity: Municipality) {
    setDetailEntity(entity);
    setModalOpen(true);
  }

  const activeFilterCount = countActiveMunicipalityFilters(filters);
  const filtered = filterMunicipalities(munis, filters, countyToRegion);
  const {
    items: pageItems,
    totalPages,
    totalCount,
  } = paginate(filtered, filters.page, PAGE_SIZE);
  const columns = buildColumns(openDetail);
  const regionOptions = stateConfig?.regions ?? [];
  const stateName = stateConfig?.name ?? state.toUpperCase();

  return (
    <section aria-label="Municipalities explore">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="page-title">Municipalities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All {stateName} municipalities — demographic and financial data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ResultCount
            count={totalCount}
            total={munis.length}
            entityLabel="municipalities"
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

      <div className="flex gap-5 items-start">
        <FilterPanel
          activeFilterCount={activeFilterCount}
          onClearAll={clearAll}
        >
          <FilterTextSearch
            value={filters.search}
            onChange={(v) => updateFilters({ ...filters, search: v, page: 1 })}
          />
          {countyNames.length > 0 && (
            <FilterMultiSelect
              label="County"
              options={countyNames}
              selected={filters.counties}
              onChange={(v) =>
                updateFilters({ ...filters, counties: v, page: 1 })
              }
              searchable
            />
          )}
          <FilterMultiSelect
            label="Region"
            options={regionOptions}
            selected={filters.regions as string[]}
            onChange={(v) =>
              updateFilters({
                ...filters,
                regions: v as MunicipalityFilters["regions"],
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
            label="% Bachelor's+"
            value={filters.pct_bachelors_plus}
            onChange={(v) =>
              updateFilters({ ...filters, pct_bachelors_plus: v, page: 1 })
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
            label="Population Growth Rate (%)"
            value={filters.population_growth_rate}
            onChange={(v) =>
              updateFilters({ ...filters, population_growth_rate: v, page: 1 })
            }
            step={0.1}
          />
        </FilterPanel>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Loading municipalities…
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
                caption={`${stateName} municipalities with demographic and financial data`}
                emptyMessage="No municipalities match the current filters."
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

      <EntityDeepDiveModal
        entity={detailEntity}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}

export default function MunicipalitiesPage({
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
      <MunicipalitiesContent state={params.state} />
    </Suspense>
  );
}
