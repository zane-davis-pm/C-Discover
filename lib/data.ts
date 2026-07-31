// ============================================================
// C-Discover — Data Loaders
// All data is pre-built static JSON in /public/data/.
// DO NOT add runtime API calls. See SPEC.md §2.2.
// ============================================================

import type {
  County,
  Municipality,
  SchoolDistrict,
  SpecialDistrict,
  AppMetadata,
  StateConfig,
  StatesManifest,
} from "@/lib/types";

// ─── State Config ─────────────────────────────────────────────
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): the ONLY place a state code is
// allowed to be hardcoded outside states.json itself — every other loader
// and route below takes a `state` argument. See AGENTS.md "no hardcoded
// state codes outside config/defaults."

/** Default state code used for legacy (pre-multi-state) route redirects. */
export const DEFAULT_STATE = "fl";

// ─── Generic JSON Loader ──────────────────────────────────────

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── State Manifest Loader ─────────────────────────────────────

/** Load the multi-state manifest (/public/data/states.json — not namespaced). */
export function loadStatesManifest(): Promise<StatesManifest> {
  return loadJson<StatesManifest>("/data/states.json");
}

/** Fetch a single state's config by code, or null if unknown. */
export async function loadStateConfig(
  state: string
): Promise<StateConfig | null> {
  const manifest = await loadStatesManifest();
  return manifest.states.find((s) => s.code === state) ?? null;
}

// ─── Entity Loaders ───────────────────────────────────────────

/** Load all counties for the given state. */
export function loadCounties(state: string): Promise<County[]> {
  return loadJson<County[]>(`/data/${state}/counties.json`);
}

/** Load all municipalities for the given state. */
export function loadMunicipalities(state: string): Promise<Municipality[]> {
  return loadJson<Municipality[]>(`/data/${state}/municipalities.json`);
}

/** Load all school districts for the given state. */
export function loadSchoolDistricts(state: string): Promise<SchoolDistrict[]> {
  return loadJson<SchoolDistrict[]>(`/data/${state}/school-districts.json`);
}

/** Load all special districts for the given state. */
export function loadSpecialDistricts(state: string): Promise<SpecialDistrict[]> {
  return loadJson<SpecialDistrict[]>(`/data/${state}/special-districts.json`);
}

/** Load pipeline metadata (last run date, source versions) for the given state. */
export function loadMetadata(state: string): Promise<AppMetadata> {
  return loadJson<AppMetadata>(`/data/${state}/metadata.json`).catch(() => ({
    last_pipeline_run: "pending",
    source_versions: {},
  }));
}

/** Load county boundary polygons for the given state. */
export function loadCountiesGeo(
  state: string
): Promise<GeoJSON.FeatureCollection> {
  return loadJson<GeoJSON.FeatureCollection>(`/data/${state}/counties.geo.json`);
}

/** Load municipality boundary polygons for the given state. */
export function loadMunicipalitiesGeo(
  state: string
): Promise<GeoJSON.FeatureCollection> {
  return loadJson<GeoJSON.FeatureCollection>(
    `/data/${state}/municipalities.geo.json`
  );
}

// ─── County Region Map ────────────────────────────────────────

/**
 * Build a lookup from county name variants → region (a string; widened from
 * FloridaRegion in Phase 4 — see lib/types.ts's County.region comment).
 *
 * Keys stored for each county:
 *   - Short form:  "Alachua"
 *   - Full form:   "Alachua County"
 *   - county field value (same as full form in practice)
 *
 * Used by municipality, school district, and special district
 * explore pages to derive region from a county name string.
 */
export function buildCountyRegionMap(
  counties: County[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of counties) {
    const short = c.name.replace(/ County$/i, "").trim();
    map[short] = c.region;
    map[c.name] = c.region;
    // Also index by the county field value (may differ from name in some records)
    if (c.county) map[c.county] = c.region;
  }
  return map;
}

/**
 * Derive sorted, deduplicated list of county names (short form) from
 * the counties array. Used to populate county multi-select filters.
 */
export function countyNames(counties: County[]): string[] {
  return counties
    .map((c) => c.name.replace(/ County$/i, "").trim())
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Derive sorted, deduplicated list of county names from an entity array
 * whose items each have a `county` string field. Filters out "Unknown".
 */
export function entityCountyNames(
  entities: Array<{ county: string }>
): string[] {
  const set = new Set<string>();
  for (const e of entities) {
    if (e.county && e.county !== "Unknown") set.add(e.county);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
