"use client";

// ============================================================
// C-Discover — School Districts Explore Page
// T-46: ESD-01 through ESD-11 (SPEC.md §5.5)
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped.
// ============================================================

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  loadCounties,
  loadSchoolDistricts,
  loadStateConfig,
  buildCountyRegionMap,
  entityCountyNames,
} from "@/lib/data";
import {
  filterSchoolDistricts,
  countActiveSchoolDistrictFilters,
  paginate,
} from "@/lib/filters";
import {
  schoolDistrictFiltersToParams,
  paramsToSchoolDistrictFilters,
} from "@/lib/url-state";
import { DEFAULT_SCHOOL_DISTRICT_FILTERS } from "@/lib/types";
import type {
  SchoolDistrict,
  SchoolDistrictFilters,
  StateConfig,
} from "@/lib/types";
import { formatDollars, formatNumber, formatPercent, gapLabel } from "@/lib/utils";

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

const PAGE_SIZE = 67; // 67 school districts — show all, no pagination needed

function nullOrVal(
  value: number | string | null | undefined,
  entity: SchoolDistrict,
  field: string,
  formatter: (v: NonNullable<typeof value>) => string,
): string {
  if (value != null) return formatter(value);
  const gap = entity.data_gaps.find((g) => g.field === field);
  return gapLabel(gap?.reason ?? "unknown");
}

function buildColumns(
  openDetail: (e: SchoolDistrict) => void,
): Column<SchoolDistrict>[] {
  return [
    {
      key: "name",
      label: "Name",
      sortKey: "name",
      render: (d) => (
        <button
          className="text-brand-700 font-medium hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(d);
          }}
        >
          {d.name}
        </button>
      ),
    },
    {
      key: "county",
      label: "County",
      sortKey: "county",
      render: (d) => <span className="text-xs text-gray-600">{d.county}</span>,
    },
    {
      key: "enrollment_pk12",
      label: "PK-12 Enrollment",
      sortKey: "enrollment_pk12",
      align: "right",
      render: (d) => (
        <span
          className={
            d.enrollment_pk12 == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(d.enrollment_pk12, d, "enrollment_pk12", (v) =>
            formatNumber(v as number),
          )}
        </span>
      ),
    },
    {
      key: "enrollment_fte",
      label: "FTE",
      sortKey: "enrollment_fte",
      align: "right",
      render: (d) => (
        <span
          className={
            d.enrollment_fte == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(d.enrollment_fte, d, "enrollment_fte", (v) =>
            formatNumber(v as number),
          )}
        </span>
      ),
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      sortKey: "total_revenue",
      align: "right",
      render: (d) => (
        <span
          className={
            d.total_revenue == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(d.total_revenue, d, "total_revenue", (v) =>
            formatDollars(v as number),
          )}
        </span>
      ),
    },
    {
      key: "expenditure_per_fte",
      label: "Exp. / FTE",
      sortKey: "expenditure_per_fte",
      align: "right",
      render: (d) => (
        <span
          className={
            d.expenditure_per_fte == null ? "text-gray-400 italic text-xs" : ""
          }
        >
          {nullOrVal(d.expenditure_per_fte, d, "expenditure_per_fte", (v) =>
            formatDollars(v as number),
          )}
        </span>
      ),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth",
      sortKey: "population_growth_rate",
      align: "right",
      render: (d) => (
        <span
          className={
            d.population_growth_rate == null
              ? "text-gray-400 italic text-xs"
              : ""
          }
        >
          {nullOrVal(
            d.population_growth_rate,
            d,
            "population_growth_rate",
            (v) => formatPercent(v as number),
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      sticky: true,
      render: (d) => <RowActionsCell entity={d} />,
    },
  ];
}

function SchoolDistrictsContent({ state }: { state: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [districts, setDistricts] = useState<SchoolDistrict[]>([]);
  const [countyNames, setCountyNames] = useState<string[]>([]);
  const [countyToRegion, setCountyToRegion] = useState<
    Record<string, string>
  >({});
  const [stateConfig, setStateConfig] = useState<StateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SchoolDistrictFilters>(
    DEFAULT_SCHOOL_DISTRICT_FILTERS,
  );
  const [detailEntity, setDetailEntity] = useState<SchoolDistrict | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      loadSchoolDistricts(state),
      loadCounties(state),
      loadStateConfig(state),
    ]).then(([sdData, countyData, config]) => {
      setDistricts(sdData);
      setCountyNames(entityCountyNames(sdData));
      setCountyToRegion(buildCountyRegionMap(countyData));
      setStateConfig(config);
      setLoading(false);
    });
  }, [state]);

  useEffect(() => {
    setFilters(paramsToSchoolDistrictFilters(searchParams, stateConfig?.regions));
  }, [searchParams, stateConfig]);

  // Bookmarked /entity/[type]/[id] redirects land here with ?dd=<id> —
  // open that entity's deep dive directly (Phase 1.4/1.5).
  useEffect(() => {
    if (loading) return;
    const ddId = searchParams.get("dd");
    if (!ddId) return;
    const found = districts.find((d) => d.id === ddId);
    if (!found) return;
    setDetailEntity(found);
    setModalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dd");
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  const updateFilters = useCallback(
    (next: SchoolDistrictFilters) => {
      setFilters(next);
      const params = schoolDistrictFiltersToParams(next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  function handleSort(field: string) {
    updateFilters({
      ...filters,
      sort_field: field as SchoolDistrictFilters["sort_field"],
      sort_dir:
        filters.sort_field === field && filters.sort_dir === "desc"
          ? "asc"
          : "desc",
      page: 1,
    });
  }

  function clearAll() {
    updateFilters(DEFAULT_SCHOOL_DISTRICT_FILTERS);
  }

  function openDetail(entity: SchoolDistrict) {
    setDetailEntity(entity);
    setModalOpen(true);
  }

  const activeFilterCount = countActiveSchoolDistrictFilters(filters);
  const filtered = filterSchoolDistricts(districts, filters, countyToRegion);
  const {
    items: pageItems,
    totalPages,
    totalCount,
  } = paginate(filtered, filters.page, PAGE_SIZE);
  const columns = buildColumns(openDetail);
  const regionOptions = stateConfig?.regions ?? [];
  const stateName = stateConfig?.name ?? state.toUpperCase();

  return (
    <section aria-label="School districts explore">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="page-title">School Districts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All {stateName} school districts — enrollment and financial data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ResultCount
            count={totalCount}
            total={districts.length}
            entityLabel="school districts"
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
                regions: v as SchoolDistrictFilters["regions"],
                page: 1,
              })
            }
          />
          <FilterRangeSlider
            label="PK-12 Enrollment"
            value={filters.enrollment_pk12}
            onChange={(v) =>
              updateFilters({ ...filters, enrollment_pk12: v, page: 1 })
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
            label="Expenditure / FTE ($)"
            value={filters.expenditure_per_fte}
            onChange={(v) =>
              updateFilters({ ...filters, expenditure_per_fte: v, page: 1 })
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
              Loading school districts…
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
                caption={`${stateName} school districts with enrollment and financial data`}
                emptyMessage="No school districts match the current filters."
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

export default function SchoolDistrictsPage({
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
      <SchoolDistrictsContent state={params.state} />
    </Suspense>
  );
}
