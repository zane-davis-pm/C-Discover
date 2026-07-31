// ============================================================
// C-Discover — Pure Filter Functions
// Each function takes an entity array + filter state and returns
// a filtered + sorted array. No side effects, no I/O.
// See SPEC.md §5 for filter requirements per entity type.
// ============================================================

import type {
  County,
  Municipality,
  SchoolDistrict,
  SpecialDistrict,
  CountyFilters,
  MunicipalityFilters,
  SchoolDistrictFilters,
  SpecialDistrictFilters,
  RangeFilter,
} from "@/lib/types";

// ─── Shared Helpers ──────────────────────────────────────────

/**
 * Returns true if the value passes the range filter.
 * - Both ends null → no filter active → always passes.
 * - value null with any active bound → excluded (no data to verify).
 */
function inRange(value: number | null, [min, max]: RangeFilter): boolean {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/**
 * Compare two nullable sortable values.
 * Null values always sort to the end, regardless of direction.
 */
function compareNullable(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  dir: "asc" | "desc"
): number {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;  // null → end
  if (bNull) return -1; // null → end

  let cmp: number;
  if (typeof a === "string" && typeof b === "string") {
    cmp = a.localeCompare(b);
  } else {
    cmp = (a as number) - (b as number);
  }
  return dir === "desc" ? -cmp : cmp;
}

/** Case-insensitive substring match. */
function matchesSearch(name: string, query: string): boolean {
  if (!query) return true;
  return name.toLowerCase().includes(query.toLowerCase());
}

// ─── County Filter + Sort ─────────────────────────────────────

/**
 * Filter and sort counties.
 * Requirements: EC-02, EC-03, EC-07 (SPEC.md §5.3)
 */
export function filterCounties(
  counties: County[],
  filters: CountyFilters
): County[] {
  const filtered = counties.filter((c) => {
    if (!matchesSearch(c.name, filters.search)) return false;
    if (filters.regions.length > 0 && !filters.regions.includes(c.region))
      return false;
    if (!inRange(c.population, filters.population)) return false;
    if (!inRange(c.median_hh_income, filters.median_hh_income)) return false;
    if (!inRange(c.total_revenue, filters.total_revenue)) return false;
    if (!inRange(c.pct_bachelors_plus, filters.pct_bachelors_plus)) return false;
    if (!inRange(c.population_growth_rate, filters.population_growth_rate)) return false;
    return true;
  });

  return [...filtered].sort((a, b) =>
    compareNullable(
      a[filters.sort_field] as number | string | null,
      b[filters.sort_field] as number | string | null,
      filters.sort_dir
    )
  );
}

/**
 * Count the number of active (non-default) county filters.
 * Used for EC-08: "3 filters active" badge.
 */
export function countActiveCountyFilters(filters: CountyFilters): number {
  let n = 0;
  if (filters.search) n++;
  if (filters.regions.length > 0) n++;
  if (filters.population[0] != null || filters.population[1] != null) n++;
  if (filters.median_hh_income[0] != null || filters.median_hh_income[1] != null) n++;
  if (filters.total_revenue[0] != null || filters.total_revenue[1] != null) n++;
  if (filters.pct_bachelors_plus[0] != null || filters.pct_bachelors_plus[1] != null) n++;
  if (filters.population_growth_rate[0] != null || filters.population_growth_rate[1] != null) n++;
  return n;
}

// ─── Municipality Filter + Sort ───────────────────────────────

/**
 * Filter and sort municipalities.
 * Region filtering requires a countyToRegion map derived from counties data.
 * Requirements: EM-02, EM-03, EM-07 (SPEC.md §5.4)
 */
export function filterMunicipalities(
  munis: Municipality[],
  filters: MunicipalityFilters,
  countyToRegion?: Record<string, string>
): Municipality[] {
  const filtered = munis.filter((m) => {
    if (!matchesSearch(m.name, filters.search)) return false;

    if (filters.counties.length > 0 && !filters.counties.includes(m.county))
      return false;

    if (filters.regions.length > 0) {
      const region = countyToRegion?.[m.county];
      if (!region || !filters.regions.includes(region)) return false;
    }

    if (!inRange(m.population, filters.population)) return false;
    if (!inRange(m.median_hh_income, filters.median_hh_income)) return false;
    if (!inRange(m.pct_bachelors_plus, filters.pct_bachelors_plus)) return false;
    if (!inRange(m.total_revenue, filters.total_revenue)) return false;
    if (!inRange(m.population_growth_rate, filters.population_growth_rate)) return false;
    return true;
  });

  return [...filtered].sort((a, b) =>
    compareNullable(
      a[filters.sort_field] as number | string | null,
      b[filters.sort_field] as number | string | null,
      filters.sort_dir
    )
  );
}

/**
 * Count active municipality filters.
 * Used for EM-08: active filter count badge.
 */
export function countActiveMunicipalityFilters(
  filters: MunicipalityFilters
): number {
  let n = 0;
  if (filters.search) n++;
  if (filters.counties.length > 0) n++;
  if (filters.regions.length > 0) n++;
  if (filters.population[0] != null || filters.population[1] != null) n++;
  if (filters.median_hh_income[0] != null || filters.median_hh_income[1] != null) n++;
  if (filters.pct_bachelors_plus[0] != null || filters.pct_bachelors_plus[1] != null) n++;
  if (filters.total_revenue[0] != null || filters.total_revenue[1] != null) n++;
  if (filters.population_growth_rate[0] != null || filters.population_growth_rate[1] != null) n++;
  return n;
}

// ─── School District Filter + Sort ───────────────────────────

/**
 * Filter and sort school districts.
 * Region filtering requires a countyToRegion map.
 * Requirements: ESD-02, ESD-03, ESD-07 (SPEC.md §5.5)
 */
export function filterSchoolDistricts(
  districts: SchoolDistrict[],
  filters: SchoolDistrictFilters,
  countyToRegion?: Record<string, string>
): SchoolDistrict[] {
  const filtered = districts.filter((d) => {
    if (!matchesSearch(d.name, filters.search)) return false;

    if (filters.counties.length > 0 && !filters.counties.includes(d.county))
      return false;

    if (filters.regions.length > 0) {
      const region = countyToRegion?.[d.county];
      if (!region || !filters.regions.includes(region)) return false;
    }

    if (!inRange(d.enrollment_pk12, filters.enrollment_pk12)) return false;
    if (!inRange(d.total_revenue, filters.total_revenue)) return false;
    if (!inRange(d.expenditure_per_fte, filters.expenditure_per_fte)) return false;
    if (!inRange(d.population_growth_rate, filters.population_growth_rate)) return false;
    return true;
  });

  return [...filtered].sort((a, b) =>
    compareNullable(
      a[filters.sort_field] as number | string | null,
      b[filters.sort_field] as number | string | null,
      filters.sort_dir
    )
  );
}

/**
 * Count active school district filters.
 * Used for ESD-08: active filter count badge.
 */
export function countActiveSchoolDistrictFilters(
  filters: SchoolDistrictFilters
): number {
  let n = 0;
  if (filters.search) n++;
  if (filters.counties.length > 0) n++;
  if (filters.regions.length > 0) n++;
  if (filters.enrollment_pk12[0] != null || filters.enrollment_pk12[1] != null) n++;
  if (filters.total_revenue[0] != null || filters.total_revenue[1] != null) n++;
  if (filters.expenditure_per_fte[0] != null || filters.expenditure_per_fte[1] != null) n++;
  if (filters.population_growth_rate[0] != null || filters.population_growth_rate[1] != null) n++;
  return n;
}

// ─── Special District Filter + Sort ──────────────────────────

/**
 * Filter and sort special districts.
 * Region filtering requires a countyToRegion map.
 * Requirements: ESPD-02, ESPD-03 (SPEC.md §5.6)
 */
export function filterSpecialDistricts(
  districts: SpecialDistrict[],
  filters: SpecialDistrictFilters,
  countyToRegion?: Record<string, string>
): SpecialDistrict[] {
  const filtered = districts.filter((d) => {
    if (!matchesSearch(d.name, filters.search)) return false;

    if (filters.counties.length > 0 && !filters.counties.includes(d.county))
      return false;

    if (filters.regions.length > 0) {
      const region = countyToRegion?.[d.county];
      if (!region || !filters.regions.includes(region)) return false;
    }

    if (
      filters.purposes.length > 0 &&
      !filters.purposes.includes(d.purpose_category)
    )
      return false;

    if (filters.dependent !== null && d.dependent !== filters.dependent)
      return false;

    if (!inRange(d.population_growth_rate, filters.population_growth_rate)) return false;

    return true;
  });

  return [...filtered].sort((a, b) =>
    compareNullable(
      a[filters.sort_field] as number | string | null,
      b[filters.sort_field] as number | string | null,
      filters.sort_dir
    )
  );
}

/**
 * Count active special district filters.
 * Used for ESPD-08: active filter count badge.
 */
export function countActiveSpecialDistrictFilters(
  filters: SpecialDistrictFilters
): number {
  let n = 0;
  if (filters.search) n++;
  if (filters.counties.length > 0) n++;
  if (filters.regions.length > 0) n++;
  if (filters.purposes.length > 0) n++;
  if (filters.dependent !== null) n++;
  if (filters.population_growth_rate[0] != null || filters.population_growth_rate[1] != null) n++;
  return n;
}

// ─── Pagination Helper ────────────────────────────────────────

/** Slice an already-filtered+sorted array to a single page of results. */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number; totalCount: number } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    totalCount,
  };
}

// ─── Range Bounds Helper ──────────────────────────────────────

/**
 * Compute [min, max] bounds across a numeric field in an array.
 * Used by range sliders to set their data-aware min/max extents.
 * Ignores null values.
 */
export function computeBounds<T>(
  items: T[],
  getter: (item: T) => number | null | undefined
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    const v = getter(item);
    if (v != null) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) return [0, 0];
  return [min, max];
}
