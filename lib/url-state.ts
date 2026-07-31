// ============================================================
// C-Discover — URL State Serialization
// Converts filter state ↔ URLSearchParams for all four entity types.
// See SPEC.md §7 for parameter naming convention and serialization rules.
// ============================================================

import type {
  CountyFilters,
  MunicipalityFilters,
  SchoolDistrictFilters,
  SpecialDistrictFilters,
  SpecialDistrictViewMode,
  SpecialDistrictPurpose,
} from "@/lib/types";

import {
  DEFAULT_COUNTY_FILTERS,
  DEFAULT_MUNICIPALITY_FILTERS,
  DEFAULT_SCHOOL_DISTRICT_FILTERS,
  DEFAULT_SPECIAL_DISTRICT_FILTERS,
  DEFAULT_SPECIAL_DISTRICT_VIEW,
  FLORIDA_REGIONS,
  SPECIAL_DISTRICT_PURPOSES,
} from "@/lib/types";

// ─── Internal Helpers ────────────────────────────────────────

/** Parse a URL param string to number | null. */
function parseNum(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Parse a comma-separated param to a filtered list of known enum values. */
function parseEnum<T extends string>(
  v: string | null,
  valid: readonly T[]
): T[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim() as T)
    .filter((s) => valid.includes(s));
}

/** Parse a comma-separated param to an array of strings. */
function parseStringList(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse boolean param: "true" → true, "false" → false, else null. */
function parseBool(v: string | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/** Write a range [min, max] to URL params, omitting null ends. */
function serializeRange(
  params: URLSearchParams,
  minKey: string,
  maxKey: string,
  range: [number | null, number | null]
): void {
  if (range[0] != null) params.set(minKey, String(range[0]));
  if (range[1] != null) params.set(maxKey, String(range[1]));
}

/** Parse a page number, defaulting to 1 on invalid input. */
function parsePage(v: string | null): number {
  const n = parseInt(v ?? "1", 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

// ─── County ──────────────────────────────────────────────────

const COUNTY_SORT_FIELDS = [
  "name",
  "population",
  "median_hh_income",
  "total_revenue",
  "pct_bachelors_plus",
  "population_growth_rate",
] as const satisfies ReadonlyArray<CountyFilters["sort_field"]>;

/**
 * Serialize CountyFilters → URLSearchParams.
 * Omits defaults and null/empty values to keep URLs clean (§7.2).
 */
export function countyFiltersToParams(
  filters: CountyFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.regions.length > 0)
    params.set("region", filters.regions.join(","));

  serializeRange(params, "pop_min", "pop_max", filters.population);
  serializeRange(
    params,
    "income_min",
    "income_max",
    filters.median_hh_income
  );
  serializeRange(
    params,
    "revenue_min",
    "revenue_max",
    filters.total_revenue
  );
  serializeRange(
    params,
    "bachelors_min",
    "bachelors_max",
    filters.pct_bachelors_plus
  );
  serializeRange(
    params,
    "growth_min",
    "growth_max",
    filters.population_growth_rate
  );

  if (filters.sort_field !== DEFAULT_COUNTY_FILTERS.sort_field)
    params.set("sort", filters.sort_field);
  if (filters.sort_dir !== DEFAULT_COUNTY_FILTERS.sort_dir)
    params.set("dir", filters.sort_dir);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/**
 * Deserialize URLSearchParams → CountyFilters.
 * Falls back to defaults for missing or invalid params.
 */
export function paramsToCountyFilters(
  params: URLSearchParams,
  validRegions: readonly string[] = FLORIDA_REGIONS
): CountyFilters {
  const rawSort = params.get("sort");
  const sort_field: CountyFilters["sort_field"] =
    rawSort !== null &&
    (COUNTY_SORT_FIELDS as readonly string[]).includes(rawSort)
      ? (rawSort as CountyFilters["sort_field"])
      : DEFAULT_COUNTY_FILTERS.sort_field;

  const rawDir = params.get("dir");
  const sort_dir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : DEFAULT_COUNTY_FILTERS.sort_dir;

  return {
    search: params.get("q") ?? "",
    regions: parseEnum<string>(params.get("region"), validRegions),
    population: [
      parseNum(params.get("pop_min")),
      parseNum(params.get("pop_max")),
    ],
    median_hh_income: [
      parseNum(params.get("income_min")),
      parseNum(params.get("income_max")),
    ],
    total_revenue: [
      parseNum(params.get("revenue_min")),
      parseNum(params.get("revenue_max")),
    ],
    pct_bachelors_plus: [
      parseNum(params.get("bachelors_min")),
      parseNum(params.get("bachelors_max")),
    ],
    population_growth_rate: [
      parseNum(params.get("growth_min")),
      parseNum(params.get("growth_max")),
    ],
    sort_field,
    sort_dir,
    page: parsePage(params.get("page")),
  };
}

// ─── Municipality ─────────────────────────────────────────────

const MUNICIPALITY_SORT_FIELDS = [
  "name",
  "county",
  "population",
  "median_hh_income",
  "pct_bachelors_plus",
  "total_revenue",
  "population_growth_rate",
] as const satisfies ReadonlyArray<MunicipalityFilters["sort_field"]>;

/** Serialize MunicipalityFilters → URLSearchParams. */
export function municipalityFiltersToParams(
  filters: MunicipalityFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.counties.length > 0)
    params.set("county", filters.counties.join(","));
  if (filters.regions.length > 0)
    params.set("region", filters.regions.join(","));

  serializeRange(params, "pop_min", "pop_max", filters.population);
  serializeRange(
    params,
    "income_min",
    "income_max",
    filters.median_hh_income
  );
  serializeRange(
    params,
    "bachelors_min",
    "bachelors_max",
    filters.pct_bachelors_plus
  );
  serializeRange(
    params,
    "revenue_min",
    "revenue_max",
    filters.total_revenue
  );
  serializeRange(
    params,
    "growth_min",
    "growth_max",
    filters.population_growth_rate
  );

  if (filters.sort_field !== DEFAULT_MUNICIPALITY_FILTERS.sort_field)
    params.set("sort", filters.sort_field);
  if (filters.sort_dir !== DEFAULT_MUNICIPALITY_FILTERS.sort_dir)
    params.set("dir", filters.sort_dir);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/** Deserialize URLSearchParams → MunicipalityFilters. */
export function paramsToMunicipalityFilters(
  params: URLSearchParams,
  validRegions: readonly string[] = FLORIDA_REGIONS
): MunicipalityFilters {
  const rawSort = params.get("sort");
  const sort_field: MunicipalityFilters["sort_field"] =
    rawSort !== null &&
    (MUNICIPALITY_SORT_FIELDS as readonly string[]).includes(rawSort)
      ? (rawSort as MunicipalityFilters["sort_field"])
      : DEFAULT_MUNICIPALITY_FILTERS.sort_field;

  const rawDir = params.get("dir");
  const sort_dir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : DEFAULT_MUNICIPALITY_FILTERS.sort_dir;

  return {
    search: params.get("q") ?? "",
    counties: parseStringList(params.get("county")),
    regions: parseEnum<string>(params.get("region"), validRegions),
    population: [
      parseNum(params.get("pop_min")),
      parseNum(params.get("pop_max")),
    ],
    median_hh_income: [
      parseNum(params.get("income_min")),
      parseNum(params.get("income_max")),
    ],
    pct_bachelors_plus: [
      parseNum(params.get("bachelors_min")),
      parseNum(params.get("bachelors_max")),
    ],
    total_revenue: [
      parseNum(params.get("revenue_min")),
      parseNum(params.get("revenue_max")),
    ],
    population_growth_rate: [
      parseNum(params.get("growth_min")),
      parseNum(params.get("growth_max")),
    ],
    sort_field,
    sort_dir,
    page: parsePage(params.get("page")),
  };
}

// ─── School District ──────────────────────────────────────────

const SCHOOL_DISTRICT_SORT_FIELDS = [
  "name",
  "county",
  "enrollment_pk12",
  "enrollment_fte",
  "total_revenue",
  "expenditure_per_fte",
  "population_growth_rate",
] as const satisfies ReadonlyArray<SchoolDistrictFilters["sort_field"]>;

/** Serialize SchoolDistrictFilters → URLSearchParams. */
export function schoolDistrictFiltersToParams(
  filters: SchoolDistrictFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.counties.length > 0)
    params.set("county", filters.counties.join(","));
  if (filters.regions.length > 0)
    params.set("region", filters.regions.join(","));

  serializeRange(
    params,
    "enrollment_min",
    "enrollment_max",
    filters.enrollment_pk12
  );
  serializeRange(
    params,
    "revenue_min",
    "revenue_max",
    filters.total_revenue
  );
  serializeRange(
    params,
    "exp_per_fte_min",
    "exp_per_fte_max",
    filters.expenditure_per_fte
  );
  serializeRange(
    params,
    "growth_min",
    "growth_max",
    filters.population_growth_rate
  );

  if (filters.sort_field !== DEFAULT_SCHOOL_DISTRICT_FILTERS.sort_field)
    params.set("sort", filters.sort_field);
  if (filters.sort_dir !== DEFAULT_SCHOOL_DISTRICT_FILTERS.sort_dir)
    params.set("dir", filters.sort_dir);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/** Deserialize URLSearchParams → SchoolDistrictFilters. */
export function paramsToSchoolDistrictFilters(
  params: URLSearchParams,
  validRegions: readonly string[] = FLORIDA_REGIONS
): SchoolDistrictFilters {
  const rawSort = params.get("sort");
  const sort_field: SchoolDistrictFilters["sort_field"] =
    rawSort !== null &&
    (SCHOOL_DISTRICT_SORT_FIELDS as readonly string[]).includes(rawSort)
      ? (rawSort as SchoolDistrictFilters["sort_field"])
      : DEFAULT_SCHOOL_DISTRICT_FILTERS.sort_field;

  const rawDir = params.get("dir");
  const sort_dir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : DEFAULT_SCHOOL_DISTRICT_FILTERS.sort_dir;

  return {
    search: params.get("q") ?? "",
    counties: parseStringList(params.get("county")),
    regions: parseEnum<string>(params.get("region"), validRegions),
    enrollment_pk12: [
      parseNum(params.get("enrollment_min")),
      parseNum(params.get("enrollment_max")),
    ],
    total_revenue: [
      parseNum(params.get("revenue_min")),
      parseNum(params.get("revenue_max")),
    ],
    expenditure_per_fte: [
      parseNum(params.get("exp_per_fte_min")),
      parseNum(params.get("exp_per_fte_max")),
    ],
    population_growth_rate: [
      parseNum(params.get("growth_min")),
      parseNum(params.get("growth_max")),
    ],
    sort_field,
    sort_dir,
    page: parsePage(params.get("page")),
  };
}

// ─── Special District ─────────────────────────────────────────

const SPECIAL_DISTRICT_SORT_FIELDS = [
  "name",
  "county",
  "purpose_category",
  "charter_year",
  "population_growth_rate",
] as const satisfies ReadonlyArray<SpecialDistrictFilters["sort_field"]>;

/** Serialize SpecialDistrictFilters → URLSearchParams. */
export function specialDistrictFiltersToParams(
  filters: SpecialDistrictFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.counties.length > 0)
    params.set("county", filters.counties.join(","));
  if (filters.regions.length > 0)
    params.set("region", filters.regions.join(","));
  if (filters.purposes.length > 0)
    params.set("purpose", filters.purposes.join(","));
  if (filters.dependent !== null)
    params.set("dependent", String(filters.dependent));
  serializeRange(
    params,
    "growth_min",
    "growth_max",
    filters.population_growth_rate
  );

  if (filters.sort_field !== DEFAULT_SPECIAL_DISTRICT_FILTERS.sort_field)
    params.set("sort", filters.sort_field);
  if (filters.sort_dir !== DEFAULT_SPECIAL_DISTRICT_FILTERS.sort_dir)
    params.set("dir", filters.sort_dir);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/** Deserialize URLSearchParams → SpecialDistrictFilters. */
export function paramsToSpecialDistrictFilters(
  params: URLSearchParams,
  validRegions: readonly string[] = FLORIDA_REGIONS
): SpecialDistrictFilters {
  const rawSort = params.get("sort");
  const sort_field: SpecialDistrictFilters["sort_field"] =
    rawSort !== null &&
    (SPECIAL_DISTRICT_SORT_FIELDS as readonly string[]).includes(rawSort)
      ? (rawSort as SpecialDistrictFilters["sort_field"])
      : DEFAULT_SPECIAL_DISTRICT_FILTERS.sort_field;

  const rawDir = params.get("dir");
  const sort_dir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : DEFAULT_SPECIAL_DISTRICT_FILTERS.sort_dir;

  return {
    search: params.get("q") ?? "",
    counties: parseStringList(params.get("county")),
    regions: parseEnum<string>(params.get("region"), validRegions),
    purposes: parseEnum<SpecialDistrictPurpose>(
      params.get("purpose"),
      SPECIAL_DISTRICT_PURPOSES
    ),
    dependent: parseBool(params.get("dependent")),
    population_growth_rate: [
      parseNum(params.get("growth_min")),
      parseNum(params.get("growth_max")),
    ],
    sort_field,
    sort_dir,
    page: parsePage(params.get("page")),
  };
}

/**
 * Serialize the Special Districts view mode ("list" | "cohorts") → URLSearchParams.
 * Default ("list") is omitted per the "omit defaults from URL" convention (V3-C-04).
 */
export function specialDistrictViewToParams(
  view: SpecialDistrictViewMode
): URLSearchParams {
  const params = new URLSearchParams();
  if (view !== DEFAULT_SPECIAL_DISTRICT_VIEW) params.set("view", view);
  return params;
}

/** Deserialize URLSearchParams → Special Districts view mode. */
export function paramsToSpecialDistrictView(
  params: URLSearchParams
): SpecialDistrictViewMode {
  return params.get("view") === "cohorts" ? "cohorts" : DEFAULT_SPECIAL_DISTRICT_VIEW;
}

// ─── Map ──────────────────────────────────────────────────────

import type { CountyMetric, MapEntity } from "@/lib/types";

const COUNTY_METRICS = [
  "population",
  "median_hh_income",
  "total_revenue",
  "pct_bachelors_plus",
  "population_growth_rate",
] as const satisfies ReadonlyArray<CountyMetric>;

export interface MapState {
  metric: CountyMetric;
  entity: MapEntity;
}

export const DEFAULT_MAP_STATE: MapState = {
  metric: "population",
  entity: "counties",
};

/** Serialize MapState → URLSearchParams. */
export function mapStateToParams(state: MapState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.metric !== DEFAULT_MAP_STATE.metric)
    params.set("metric", state.metric);
  if (state.entity !== DEFAULT_MAP_STATE.entity)
    params.set("entity", state.entity);
  return params;
}

/** Deserialize URLSearchParams → MapState. */
export function paramsToMapState(params: URLSearchParams): MapState {
  const rawMetric = params.get("metric");
  const metric: CountyMetric =
    rawMetric !== null &&
    (COUNTY_METRICS as readonly string[]).includes(rawMetric)
      ? (rawMetric as CountyMetric)
      : DEFAULT_MAP_STATE.metric;

  const rawEntity = params.get("entity");
  const entity: MapEntity =
    rawEntity === "municipalities" ? "municipalities" : "counties";

  return { metric, entity };
}
