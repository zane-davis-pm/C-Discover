"use client";

// ============================================================
// C-Discover — Special Districts Explore Page
// T-47: ESPD-01 through ESPD-10 (SPEC.md §5.6)
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped. Special
// districts are state-optional as an entity type (docs/states/SYNTHESIS.md)
// — this page shows an explanatory message rather than data if the
// current state's config omits "special_district" from entity_types.
// ============================================================

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List as ListIcon, LayoutGrid } from "lucide-react";

import {
  loadCounties,
  loadSpecialDistricts,
  loadStateConfig,
  buildCountyRegionMap,
  entityCountyNames,
} from "@/lib/data";
import {
  filterSpecialDistricts,
  countActiveSpecialDistrictFilters,
  paginate,
} from "@/lib/filters";
import {
  specialDistrictFiltersToParams,
  paramsToSpecialDistrictFilters,
  specialDistrictViewToParams,
  paramsToSpecialDistrictView,
} from "@/lib/url-state";
import {
  DEFAULT_SPECIAL_DISTRICT_FILTERS,
  DEFAULT_SPECIAL_DISTRICT_VIEW,
  SPECIAL_DISTRICT_PURPOSES,
} from "@/lib/types";
import type {
  SpecialDistrict,
  SpecialDistrictFilters,
  SpecialDistrictPurpose,
  SpecialDistrictViewMode,
  StateConfig,
} from "@/lib/types";
import { formatPercent, gapLabel } from "@/lib/utils";

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
import { PurposeCohortView } from "@/components/explore/PurposeCohortView";
import { RowActionsCell } from "@/components/explore/RowActionsCell";
import { cn } from "@/lib/utils";

/** Combine filter params + view param into a single query string (V3-C-04). */
function buildQueryParams(
  filters: SpecialDistrictFilters,
  view: SpecialDistrictViewMode,
): URLSearchParams {
  const params = specialDistrictFiltersToParams(filters);
  specialDistrictViewToParams(view).forEach((v, k) => params.set(k, v));
  return params;
}

const PAGE_SIZE = 50;

function buildColumns(
  openDetail: (e: SpecialDistrict) => void,
): Column<SpecialDistrict>[] {
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
      key: "purpose_category",
      label: "Purpose",
      sortKey: "purpose_category",
      render: (d) => (
        <span className="text-xs text-gray-700">{d.purpose_category}</span>
      ),
    },
    {
      key: "dependent",
      label: "Dep./Indep.",
      render: (d) => {
        if (d.dependent == null) {
          const gap = d.data_gaps.find((g) => g.field === "dependent");
          return (
            <span className="text-gray-400 italic text-xs">
              {gapLabel(gap?.reason ?? "unknown")}
            </span>
          );
        }
        return (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
              d.dependent
                ? "bg-brand-100 text-brand-800"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {d.dependent ? "Dependent" : "Independent"}
          </span>
        );
      },
    },
    {
      key: "charter_year",
      label: "Est.",
      sortKey: "charter_year",
      align: "right",
      render: (d) => (
        <span
          className={
            d.charter_year == null ? "text-gray-400 italic text-xs" : "text-xs"
          }
        >
          {d.charter_year ?? "—"}
        </span>
      ),
    },
    {
      key: "population_growth_rate",
      label: "Pop. Growth",
      sortKey: "population_growth_rate",
      align: "right",
      render: (d) => {
        if (d.population_growth_rate == null) {
          const gap = d.data_gaps.find((g) => g.field === "population_growth_rate");
          return (
            <span className="text-gray-400 italic text-xs">
              {gapLabel(gap?.reason ?? "unknown")}
            </span>
          );
        }
        return (
          <span className="text-xs">
            {formatPercent(d.population_growth_rate)}
          </span>
        );
      },
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

function SpecialDistrictsContent({ state }: { state: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [districts, setDistricts] = useState<SpecialDistrict[]>([]);
  const [countyNames, setCountyNames] = useState<string[]>([]);
  const [countyToRegion, setCountyToRegion] = useState<
    Record<string, string>
  >({});
  const [stateConfig, setStateConfig] = useState<StateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SpecialDistrictFilters>(
    DEFAULT_SPECIAL_DISTRICT_FILTERS,
  );
  const [view, setView] = useState<SpecialDistrictViewMode>(
    DEFAULT_SPECIAL_DISTRICT_VIEW,
  );
  const [detailEntity, setDetailEntity] = useState<SpecialDistrict | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadStateConfig(state), loadCounties(state)]).then(
      ([config, countyData]) => {
        setStateConfig(config);
        setCountyToRegion(buildCountyRegionMap(countyData));
        if (!config || !config.entity_types.includes("special_district")) {
          setLoading(false);
          return;
        }
        loadSpecialDistricts(state).then((sdData) => {
          setDistricts(sdData);
          setCountyNames(entityCountyNames(sdData));
          setLoading(false);
        });
      },
    );
  }, [state]);

  useEffect(() => {
    setFilters(paramsToSpecialDistrictFilters(searchParams, stateConfig?.regions));
    setView(paramsToSpecialDistrictView(searchParams));
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
    (next: SpecialDistrictFilters) => {
      setFilters(next);
      const params = buildQueryParams(next, view);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, view],
  );

  const updateView = useCallback(
    (next: SpecialDistrictViewMode) => {
      setView(next);
      const params = buildQueryParams(filters, next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, filters],
  );

  /** By Purpose cohort click → List View, filtered to exactly that category (V3-C-03). */
  const selectPurposeCohort = useCallback(
    (purpose: SpecialDistrictPurpose) => {
      const nextFilters: SpecialDistrictFilters = {
        ...DEFAULT_SPECIAL_DISTRICT_FILTERS,
        purposes: [purpose],
      };
      setFilters(nextFilters);
      setView("list");
      const params = buildQueryParams(nextFilters, "list");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  function handleSort(field: string) {
    updateFilters({
      ...filters,
      sort_field: field as SpecialDistrictFilters["sort_field"],
      sort_dir:
        filters.sort_field === field && filters.sort_dir === "desc"
          ? "asc"
          : "desc",
      page: 1,
    });
  }

  function clearAll() {
    updateFilters(DEFAULT_SPECIAL_DISTRICT_FILTERS);
  }

  function openDetail(entity: SpecialDistrict) {
    setDetailEntity(entity);
    setModalOpen(true);
  }

  if (!loading && stateConfig && !stateConfig.entity_types.includes("special_district")) {
    return (
      <section aria-label="Special districts explore">
        <div className="py-16 text-center max-w-md mx-auto">
          <h1 className="page-title mb-2">Special Districts</h1>
          <p className="text-sm text-gray-500">
            {stateConfig.name} does not have special district data available
            in C-Discover yet.
          </p>
        </div>
      </section>
    );
  }

  const activeFilterCount = countActiveSpecialDistrictFilters(filters);
  const filtered = filterSpecialDistricts(districts, filters, countyToRegion);
  const {
    items: pageItems,
    totalPages,
    totalCount,
  } = paginate(filtered, filters.page, PAGE_SIZE);
  const columns = buildColumns(openDetail);
  const regionOptions = stateConfig?.regions ?? [];
  const stateName = stateConfig?.name ?? state.toUpperCase();

  return (
    <section aria-label="Special districts explore">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="page-title">Special Districts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stateName} special districts — name, type, county, and status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view === "list" && (
            <>
              <ResultCount
                count={totalCount}
                total={districts.length}
                entityLabel="special districts"
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
            </>
          )}

          {/* List View / By Purpose toggle — V3-C-01 */}
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex rounded-md border border-gray-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => updateView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                view === "list"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List View
            </button>
            <button
              type="button"
              onClick={() => updateView("cohorts")}
              aria-pressed={view === "cohorts"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200",
                view === "cohorts"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              By Purpose
            </button>
          </div>
        </div>
      </div>

      {view === "cohorts" ? (
        loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Loading special districts…
          </div>
        ) : (
          <PurposeCohortView
            districts={districts}
            onSelectPurpose={selectPurposeCohort}
          />
        )
      ) : (
        <div className="flex gap-5 items-start">
          <FilterPanel
            activeFilterCount={activeFilterCount}
            onClearAll={clearAll}
          >
            <FilterTextSearch
              value={filters.search}
              onChange={(v) =>
                updateFilters({ ...filters, search: v, page: 1 })
              }
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
                  regions: v as SpecialDistrictFilters["regions"],
                  page: 1,
                })
              }
            />
            <FilterMultiSelect
              label="Purpose Category"
              options={SPECIAL_DISTRICT_PURPOSES as unknown as string[]}
              selected={filters.purposes as string[]}
              onChange={(v) =>
                updateFilters({
                  ...filters,
                  purposes: v as SpecialDistrictFilters["purposes"],
                  page: 1,
                })
              }
            />

            {/* Dependent / Independent toggle — ESPD-02 */}
            <fieldset>
              <legend className="block text-xs font-medium text-gray-600 mb-1.5">
                Dependent / Independent
              </legend>
              <div className="flex gap-2">
                {(
                  [
                    { label: "All", value: null },
                    { label: "Dependent", value: true },
                    { label: "Independent", value: false },
                  ] as const
                ).map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      updateFilters({ ...filters, dependent: value, page: 1 })
                    }
                    className={cn(
                      "flex-1 px-2 py-1 text-xs rounded border",
                      filters.dependent === value
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                    )}
                    aria-pressed={filters.dependent === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

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
                Loading special districts…
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
                  caption={`${stateName} special districts`}
                  emptyMessage="No special districts match the current filters."
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
      )}

      <EntityDeepDiveModal
        entity={detailEntity}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}

export default function SpecialDistrictsPage({
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
      <SpecialDistrictsContent state={params.state} />
    </Suspense>
  );
}
