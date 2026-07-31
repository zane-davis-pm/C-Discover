// ============================================================
// C-Discover — All TypeScript Interfaces
// Source of truth: SPEC.md §3
// DO NOT redefine these inline elsewhere in the codebase.
// ============================================================

// ─── Gap / Source ────────────────────────────────────────────

export type DataGapReason = "unknown" | "unavailable" | "not_applicable";

export interface DataGap {
  field: string;
  reason: DataGapReason;
}

// ─── Florida Regions ─────────────────────────────────────────

export type FloridaRegion =
  | "Northwest"
  | "Northeast"
  | "Central West"
  | "Central East"
  | "Southeast"
  | "Southwest"
  | "South";

export const FLORIDA_REGIONS: FloridaRegion[] = [
  "Northwest",
  "Northeast",
  "Central West",
  "Central East",
  "Southeast",
  "Southwest",
  "South",
];

// ─── Special District Purpose ─────────────────────────────────

export type SpecialDistrictPurpose =
  | "Water / Wastewater"
  | "Fire / Rescue"
  | "Community Development"
  | "Transportation"
  | "Healthcare / Hospital"
  | "Library"
  | "Mosquito Control"
  | "Housing"
  | "Recreation / Parks"
  | "Other";

export const SPECIAL_DISTRICT_PURPOSES: SpecialDistrictPurpose[] = [
  "Water / Wastewater",
  "Fire / Rescue",
  "Community Development",
  "Transportation",
  "Healthcare / Hospital",
  "Library",
  "Mosquito Control",
  "Housing",
  "Recreation / Parks",
  "Other",
];

// ─── Entity Types ─────────────────────────────────────────────

export type EntityType =
  | "county"
  | "municipality"
  | "school_district"
  | "special_district";

// ─── Base Entity ──────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  county: string;
  website: string | null;
  last_updated: string;
  data_gaps: DataGap[];
  /** Lowercase USPS state code (e.g. "fl"). Added Phase 3 (multi-state). */
  state: string;
  /**
   * WYN CRM record URL, if a mapping is confirmed (D6 in
   * PROJECT_PLAN_MULTISTATE.md). Nullable placeholder — the URL scheme is
   * not yet decided. NEVER render this field in the UI until D6 resolves.
   */
  wyn_url: string | null;
}

// ─── County ───────────────────────────────────────────────────

export interface County extends BaseEntity {
  type: "county";
  fips: string;
  county_seat: string | null;

  // Demographics
  population: number | null;
  population_year: number | null;
  population_source: "ACS_5YR" | "EDR" | null;
  median_hh_income: number | null;
  per_capita_income: number | null;
  income_year: number | null;
  income_source: "ACS_5YR" | null;
  pct_bachelors_plus: number | null;
  education_year: number | null;
  education_source: "ACS_5YR" | null;
  poverty_rate: number | null;
  poverty_year: number | null;
  population_growth_rate: number | null; // annualized % CAGR
  population_growth_years: string | null; // e.g. "2020-2023"
  population_growth_source: "PEP" | null;

  // Financials
  total_revenue: number | null;
  total_expenditure: number | null;
  property_tax_revenue: number | null;
  fiscal_year: number | null;
  /**
   * Source id string (a key in that state's config.sources), e.g.
   * "EDR_COUNTY" for Florida, "SCO_COUNTY_REV" for California. Widened from
   * a Florida-only literal union in Phase 4 (PROJECT_PLAN_MULTISTATE.md) —
   * see AGENTS.md's "Known Phase 3 Part A limitation" note, same rationale
   * as `region` below.
   */
  fiscal_source: string | null;

  // Geography
  lat: number;
  lon: number;
  area_sq_miles: number | null;
  /**
   * Widened from `FloridaRegion` in Phase 4: a state's regions are whatever
   * that state's config.regions declares (see StateConfig below), not
   * necessarily Florida's literal set. `FloridaRegion`/`FLORIDA_REGIONS` are
   * kept for Florida-specific call sites that still want the narrower type.
   */
  region: string;
}

// ─── Municipality ─────────────────────────────────────────────

export interface Municipality extends BaseEntity {
  type: "municipality";
  place_fips: string;
  /**
   * "township" added Phase 3 (multi-state, per docs/states/SYNTHESIS.md):
   * Michigan townships are municipality records with this subtype, not a
   * separate entity type.
   */
  entity_subtype: "city" | "town" | "village" | "other" | "township";

  // Demographics
  population: number | null;
  population_year: number | null;
  median_hh_income: number | null;
  per_capita_income: number | null;
  income_year: number | null;
  pct_bachelors_plus: number | null;
  poverty_rate: number | null;
  income_source: "ACS_5YR" | null;
  population_growth_rate: number | null; // annualized % CAGR
  population_growth_years: string | null; // e.g. "2020-2023"
  population_growth_source: "PEP" | null;

  // Financials
  total_revenue: number | null;
  total_expenditure: number | null;
  fiscal_year: number | null;
  fiscal_source: string | null;

  // Geography
  lat: number;
  lon: number;
}

// ─── School District ──────────────────────────────────────────

export interface SchoolDistrict extends BaseEntity {
  type: "school_district";
  nces_id: string;
  fips: string;

  // Enrollment
  enrollment_pk12: number | null;
  enrollment_year: string | null;
  enrollment_fte: number | null;
  // Widened from a closed FL-only union ("FLDOE" | "EDR_EDUC") to string —
  // CA ships its own source ids (CDE_SACS_ADA, CDE_CALPADS_ENR) that were
  // outside that union; matches the looser string | null already used for
  // this field on ShortlistSnapshot below.
  enrollment_source: string | null;

  // Financials
  total_revenue: number | null;
  total_expenditure: number | null;
  expenditure_per_fte: number | null;
  fiscal_year: number | null;
  fiscal_source: string | null;

  superintendent_name: string | null;

  // Population growth rate, inherited from the parent county (per product
  // decision — districts do not get their own population series/trend).
  population_growth_rate: number | null;
  population_growth_source: "derived_county" | null;
}

// ─── Special District ─────────────────────────────────────────

export interface SpecialDistrict extends BaseEntity {
  type: "special_district";
  sdid: string;
  purpose_category: SpecialDistrictPurpose;
  dependent: boolean | null;
  charter_year: number | null;
  governing_board: string | null;

  // Financials (best-effort)
  total_revenue: number | null;
  total_expenditure: number | null;
  fiscal_year: number | null;
  fiscal_source: string | null;

  // Population growth rate, inherited from the parent county (per product
  // decision — districts do not get their own population series/trend).
  population_growth_rate: number | null;
  population_growth_source: "derived_county" | null;
}

// ─── Union ────────────────────────────────────────────────────

export type AnyEntity = County | Municipality | SchoolDistrict | SpecialDistrict;

// ─── State Manifest (Phase 3 — PROJECT_PLAN_MULTISTATE.md §3.2) ─
// /public/data/states.json. See SONNET_PHASE3_PROMPTS.md §Interface
// contract for the exact shape.

export interface StateConfig {
  /** Lowercase USPS state code, e.g. "fl". */
  code: string;
  /** Display name, e.g. "Florida". */
  name: string;
  /** Which entity types this state ships (special districts are state-optional). */
  entity_types: EntityType[];
  map: {
    center: [number, number];
    zoom: number;
  };
  regions: string[];
}

export interface StatesManifest {
  states: StateConfig[];
}

// ─── Metadata ─────────────────────────────────────────────────

export interface AppMetadata {
  last_pipeline_run: string;
  source_versions: Record<string, string>;
}

// ─── Choropleth Metrics ───────────────────────────────────────

export type CountyMetric =
  | "population"
  | "median_hh_income"
  | "total_revenue"
  | "pct_bachelors_plus"
  | "population_growth_rate";

export const COUNTY_METRIC_LABELS: Record<CountyMetric, string> = {
  population: "Population",
  median_hh_income: "Median HH Income",
  total_revenue: "Total Revenue",
  pct_bachelors_plus: "% Bachelor's+",
  population_growth_rate: "Population Growth Rate",
};

export type MunicipalityMetric =
  | "population"
  | "median_hh_income"
  | "pct_bachelors_plus"
  | "total_revenue"
  | "population_growth_rate";

export const MUNICIPALITY_METRIC_LABELS: Record<MunicipalityMetric, string> = {
  population: "Population",
  median_hh_income: "Median HH Income",
  pct_bachelors_plus: "% Bachelor's+",
  total_revenue: "Total Revenue",
  population_growth_rate: "Population Growth Rate",
};

export type MapEntity = "counties" | "municipalities";

// ─── Filter State ─────────────────────────────────────────────

export type RangeFilter = [number | null, number | null]; // [min, max]

export interface CountyFilters {
  search: string;
  regions: string[];
  population: RangeFilter;
  median_hh_income: RangeFilter;
  total_revenue: RangeFilter;
  pct_bachelors_plus: RangeFilter;
  population_growth_rate: RangeFilter;
  sort_field: keyof Pick<
    County,
    | "name"
    | "population"
    | "median_hh_income"
    | "total_revenue"
    | "pct_bachelors_plus"
    | "population_growth_rate"
  >;
  sort_dir: "asc" | "desc";
  page: number;
}

export const DEFAULT_COUNTY_FILTERS: CountyFilters = {
  search: "",
  regions: [],
  population: [null, null],
  median_hh_income: [null, null],
  total_revenue: [null, null],
  pct_bachelors_plus: [null, null],
  population_growth_rate: [null, null],
  sort_field: "population",
  sort_dir: "desc",
  page: 1,
};

export interface MunicipalityFilters {
  search: string;
  counties: string[];
  regions: string[];
  population: RangeFilter;
  median_hh_income: RangeFilter;
  pct_bachelors_plus: RangeFilter; // V2-M-05
  total_revenue: RangeFilter;
  population_growth_rate: RangeFilter;
  sort_field: keyof Pick<
    Municipality,
    | "name"
    | "county"
    | "population"
    | "median_hh_income"
    | "pct_bachelors_plus"
    | "total_revenue"
    | "population_growth_rate"
  >;
  sort_dir: "asc" | "desc";
  page: number;
}

export const DEFAULT_MUNICIPALITY_FILTERS: MunicipalityFilters = {
  search: "",
  counties: [],
  regions: [],
  population: [null, null],
  median_hh_income: [null, null],
  pct_bachelors_plus: [null, null],
  total_revenue: [null, null],
  population_growth_rate: [null, null],
  sort_field: "population",
  sort_dir: "desc",
  page: 1,
};

export interface SchoolDistrictFilters {
  search: string;
  counties: string[];
  regions: string[];
  enrollment_pk12: RangeFilter;
  total_revenue: RangeFilter;
  expenditure_per_fte: RangeFilter;
  population_growth_rate: RangeFilter;
  sort_field: keyof Pick<
    SchoolDistrict,
    | "name"
    | "county"
    | "enrollment_pk12"
    | "enrollment_fte"
    | "total_revenue"
    | "expenditure_per_fte"
    | "population_growth_rate"
  >;
  sort_dir: "asc" | "desc";
  page: number;
}

export const DEFAULT_SCHOOL_DISTRICT_FILTERS: SchoolDistrictFilters = {
  search: "",
  counties: [],
  regions: [],
  enrollment_pk12: [null, null],
  total_revenue: [null, null],
  expenditure_per_fte: [null, null],
  population_growth_rate: [null, null],
  sort_field: "enrollment_pk12",
  sort_dir: "desc",
  page: 1,
};

export interface SpecialDistrictFilters {
  search: string;
  counties: string[];
  regions: string[];
  purposes: SpecialDistrictPurpose[];
  dependent: boolean | null; // null = show all
  population_growth_rate: RangeFilter;
  sort_field: keyof Pick<
    SpecialDistrict,
    | "name"
    | "county"
    | "purpose_category"
    | "charter_year"
    | "population_growth_rate"
  >;
  sort_dir: "asc" | "desc";
  page: number;
}

export const DEFAULT_SPECIAL_DISTRICT_FILTERS: SpecialDistrictFilters = {
  search: "",
  counties: [],
  regions: [],
  purposes: [],
  dependent: null,
  population_growth_rate: [null, null],
  sort_field: "name",
  sort_dir: "asc",
  page: 1,
};

// ─── Special District Cohort View (V3 §4) ──────────────────────

/** "list" = existing table view (default). "cohorts" = "By Purpose" directory. */
export type SpecialDistrictViewMode = "list" | "cohorts";

export const DEFAULT_SPECIAL_DISTRICT_VIEW: SpecialDistrictViewMode = "list";

// ─── Shortlist ────────────────────────────────────────────────

export interface ShortlistSnapshot {
  // Captured at add-time so export works without re-loading full data
  name: string;
  county: string;
  type: EntityType;
  website: string | null;
  /**
   * Lowercase USPS state code the entity belongs to. Phase 3 (multi-state):
   * used to scope shortlist/compare membership checks so an id from one
   * state can never be mistaken for the same id in another state.
   */
  state: string;
  // Demographics (all entity types that have them)
  population?: number | null;
  population_year?: number | null;
  median_hh_income?: number | null;
  pct_bachelors_plus?: number | null;
  poverty_rate?: number | null;
  income_source?: string | null;
  population_growth_rate?: number | null;
  population_growth_years?: string | null;
  population_growth_source?: string | null;
  // Financials
  total_revenue?: number | null;
  fiscal_year?: number | null;
  fiscal_source?: string | null;
  // School district specific
  enrollment_pk12?: number | null;
  enrollment_fte?: number | null;
  expenditure_per_fte?: number | null;
  enrollment_year?: string | null;
  enrollment_source?: string | null;
  // Special district specific
  purpose_category?: SpecialDistrictPurpose;
  dependent?: boolean | null;
  // Gaps
  data_gaps: DataGap[];
}

export interface ShortlistItem {
  id: string;
  snapshot: ShortlistSnapshot;
}

// ─── Comparison (V3 §7.2) ───────────────────────────────────────

export interface ComparisonState {
  type: EntityType;
  ids: string[]; // 2–4 entity IDs, same type
}

// ─── Workspaces (V3 §6, §7.2 — replaces single-shortlist model) ─

export interface Workspace {
  id: string; // e.g. "ws_" + crypto.randomUUID()
  name: string;
  tags: string[];
  items: ShortlistItem[]; // unchanged from V1/V2
  created_at: string; // ISO date
  updated_at: string; // ISO date
  /** True only for workspaces created via JSON import (V3-W-05). */
  imported?: boolean;
}

export interface WorkspaceExportFile {
  /**
   * 1 = original workspace export (V3-T-44).
   * 2 = adds optional `notes` (entity notes feature) — v1 files remain
   *     importable; v2 files without notes are equivalent to v1.
   */
  format_version: 1 | 2;
  exported_at: string;
  workspace: Workspace;
  /**
   * Entity notes for the exported workspace's items, keyed by the same
   * `state:entityId` composite key used by the notes store (lib/notes.ts).
   * Present only in format_version >= 2 exports, and only for items that
   * had a note at export time.
   */
  notes?: Record<string, EntityNote>;
}

// ─── Entity Notes (device-local, persisted via lib/notes.ts) ────

export interface EntityNote {
  /** Free-form user text. Empty text is never stored — it deletes the note. */
  text: string;
  /** ISO timestamp of the last edit. */
  updated_at: string;
}

// ============================================================
// ─── Deep Dive Dashboard (SPEC_DEEP_DIVE_DASHBOARD.md §5) ────
// Source-grounded analytical dashboards backed by static per-state
// deep-dive JSON (/public/data/{state}/deep-dive/). No runtime API calls,
// no scoring/ranking/AI. Every value traces to a DeepDiveSourceRef.
// ============================================================

export type DeepDiveEntityType =
  | "county"
  | "municipality"
  | "school_district"
  | "special_district";

export type DeepDiveFactUnit =
  | "dollars"
  | "people"
  | "students"
  | "fte"
  | "percent"
  | "count"
  | "year"
  | "ratio";

export interface DeepDiveSourceRef {
  source_id: string;
  source_name: string;
  source_url: string;
  publication_year: number | string | null;
  fiscal_year: number | null;
  retrieved_at: string;
  notes?: string;
}

export interface DeepDiveDataGap {
  field: string;
  reason: DataGapReason;
  source_id?: string;
  notes?: string;
}

export interface DeepDiveMetricPoint {
  key: string;
  label: string;
  value: number | string | null;
  unit: DeepDiveFactUnit;
  year: number | string | null;
  source_id: string;
}

export interface DeepDiveSeriesPoint {
  year: number | string;
  value: number | null;
  unit: DeepDiveFactUnit;
  source_id: string;
}

export interface DeepDiveCategoryValue {
  key: string;
  label: string;
  value: number | null;
  unit: DeepDiveFactUnit;
  year: number | string | null;
  source_id: string;
}

export interface DeepDiveBenchmarkValue {
  metric_key: string;
  label: string;
  entity_value: number | null;
  peer_min: number | null;
  peer_q1: number | null;
  peer_median: number | null;
  peer_q3: number | null;
  peer_max: number | null;
  peer_count: number;
  unit: DeepDiveFactUnit;
  source_id: string;
}

export interface CountyDeepDiveDemographics {
  population_trend: DeepDiveSeriesPoint[];
  population_projection: DeepDiveSeriesPoint[];
  age_bands: DeepDiveCategoryValue[];
  income_distribution: DeepDiveCategoryValue[];
  education_attainment: DeepDiveCategoryValue[];
  housing: DeepDiveCategoryValue[];
  labor_force: DeepDiveCategoryValue[];
  /**
   * Phase 2 (PROJECT_PLAN_MULTISTATE.md): population and median household
   * income vs. the state median for this entity type. Computed at pipeline
   * time (peer = every entity of the same type currently in the dataset,
   * i.e. statewide for Florida today) and shipped pre-computed — no
   * runtime computation, per D3.
   */
  demographic_benchmarks: DeepDiveBenchmarkValue[];
}

export interface CountyDeepDive {
  id: string;
  type: "county";
  name: string;
  county: string;
  region: string | null;
  website: string | null;
  generated_at: string;
  summary: DeepDiveMetricPoint[];
  fiscal: {
    revenue_by_category: DeepDiveCategoryValue[];
    expenditure_by_category: DeepDiveCategoryValue[];
    revenue_trend: DeepDiveSeriesPoint[];
    expenditure_trend: DeepDiveSeriesPoint[];
    per_resident: DeepDiveMetricPoint[];
    benchmarks: DeepDiveBenchmarkValue[];
  };
  demographics: CountyDeepDiveDemographics;
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export interface MunicipalityDeepDive {
  id: string;
  type: "municipality";
  name: string;
  county: string;
  entity_subtype: string | null;
  website: string | null;
  generated_at: string;
  summary: DeepDiveMetricPoint[];
  fiscal: {
    revenue_by_category: DeepDiveCategoryValue[];
    expenditure_by_category: DeepDiveCategoryValue[];
    revenue_trend: DeepDiveSeriesPoint[];
    expenditure_trend: DeepDiveSeriesPoint[];
    per_resident: DeepDiveMetricPoint[];
    benchmarks: DeepDiveBenchmarkValue[];
    peer_coverage_count: number;
    peer_coverage_note: string;
  };
  demographics: CountyDeepDiveDemographics;
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export interface SchoolDistrictDeepDive {
  id: string;
  type: "school_district";
  name: string;
  county: string;
  website: string | null;
  generated_at: string;
  summary: DeepDiveMetricPoint[];
  enrollment: {
    enrollment_trend: DeepDiveSeriesPoint[];
    enrollment_projection: DeepDiveSeriesPoint[];
    fte_trend: DeepDiveSeriesPoint[];
  };
  finance: {
    revenue_by_source: DeepDiveCategoryValue[];
    expenditure_by_function: DeepDiveCategoryValue[];
    expenditure_per_fte_trend: DeepDiveSeriesPoint[];
    benchmarks: DeepDiveBenchmarkValue[];
  };
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export interface SpecialDistrictDeepDive {
  id: string;
  type: "special_district";
  name: string;
  county: string;
  website: string | null;
  generated_at: string;
  registry: DeepDiveMetricPoint[];
  cohort: {
    statewide_purpose_count: number;
    county_purpose_count: number;
    dependency_mix: DeepDiveCategoryValue[];
    charter_year_distribution: DeepDiveCategoryValue[];
  };
  finance: {
    latest_totals: DeepDiveMetricPoint[];
    coverage_status: "matched" | "not_found" | "not_applicable" | "not_attempted";
  };
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export type AnyDeepDive =
  | CountyDeepDive
  | MunicipalityDeepDive
  | SchoolDistrictDeepDive
  | SpecialDistrictDeepDive;

export interface DeepDiveIndexCoverage {
  entities_total: number;
  entities_with_fiscal_detail: number;
  entities_with_demographic_detail: number;
  entities_with_trend_detail: number;
}

export interface DeepDiveIndex {
  generated_at: string;
  counts: Record<string, number>;
  source_versions: Record<string, string>;
  coverage: Record<string, DeepDiveIndexCoverage>;
}
