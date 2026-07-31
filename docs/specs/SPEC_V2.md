# C-Discover — Technical Specification

**Version:** 2.0
**Date:** 2026-06-26
**Status:** Draft
**Scope:** V2
**Prerequisite:** SPEC.md (V1) — all V1 acceptance criteria must be met before V2 work begins.

---

## Table of Contents

1. [V2 Scope Summary](#1-v2-scope-summary)
2. [Municipality Data Quality Fixes](#2-municipality-data-quality-fixes)
3. [School District Elevation](#3-school-district-elevation)
4. [Cross-Entity Navigation](#4-cross-entity-navigation)
5. [Map UX Improvements](#5-map-ux-improvements)
6. [Updated Data Model](#6-updated-data-model)
7. [Pipeline Changes](#7-pipeline-changes)
8. [Feature Requirements](#8-feature-requirements)
9. [Task Breakdown](#9-task-breakdown)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. V2 Scope Summary

V2 has four workstreams:

**A. Municipality Data Quality Fixes** — Three bugs in the current data pipeline make municipality data nearly unusable: all 411 municipalities have their entity type appended to their display name ("Alachua city"), all 411 have `county: "Unknown"`, and all 411 have `total_revenue: null`. Additionally, `pct_bachelors_plus` is fully populated from ACS but absent from the explore table. These are correctness failures, not feature gaps, and are the highest priority in V2.

**B. School District Elevation** — School districts are currently flagged as "discovery level" with a UI disclaimer. V2 promotes them to full decision-layer status on par with counties and municipalities: reliable financial data and removal of the disclaimer.

**C. Cross-Entity Navigation** — The four entity types are currently isolated silos. V2 adds navigation links from a county detail view to its related municipalities, school district, and special districts — using the existing URL state system.

**D. Map UX Improvements** — The current map has three issues: municipality popups lack a shortlist button and show no financial or demographic data; there is no municipality-level choropleth; and the zoom-gated layer control pattern is confusing. V2 fixes all three.

**Out of scope for V2** (deferred to V3): special district cohort grouping, side-by-side entity comparison, saved workspaces, and county ecosystem views.

---

## 2. Municipality Data Quality Fixes

### 2.1 Root Cause Analysis

All three pipeline bugs trace to the same source: the build script (`10_build_municipalities.js`) uses Census TIGER/ArcGIS GeoJSON as the canonical list. That GeoJSON stores names in Census format — "Jacksonville city", "Alford town", "Bay Harbor Islands town" — which appends the legal entity type as a suffix. The `normalize()` function in the build script strips *prefixes* ("city of", "town of") but not *suffixes* (" city", " town"), so name-based matching against EDR data fails universally.

**Bug 1 — Display name suffix:** `name` is stored as "Jacksonville city" instead of "Jacksonville". The `entity_subtype` field correctly captures "city" but the raw TIGER name is stored verbatim.

**Bug 2 — County = Unknown:** The build script resolves county from the EDR match (`edrMatch?.county`). Because EDR matching fails (Bug 1), every municipality falls through to the `|| "Unknown"` default.

**Bug 3 — Financial data null:** Same cause. EDR financial data is keyed by normalized name. Matching fails, so `total_revenue` and `total_expenditure` are null for all 411 municipalities — including the ~80 largest that have EDR seed records.

**Bug 4 — Missing column:** `pct_bachelors_plus` is populated for all 411 municipalities from ACS but is not rendered as a column in the municipality explore table or filterable in the filter panel.

### 2.2 Pipeline Fix — Name Normalization

The `normalize()` function must strip both prefixes and suffixes. The corrected logic:

```js
function stripEntityType(raw) {
  return raw
    .replace(/^(city\s+of|town\s+of|village\s+of)\s+/i, "")
    .replace(/\s+(city|town|village|cdp|borough|plantation)$/i, "")
    .trim();
}

function detectSubtype(raw) {
  const lower = raw.toLowerCase();
  if (/\btown\b/.test(lower)) return "town";
  if (/\bvillage\b/.test(lower)) return "village";
  if (/\bcity\b/.test(lower)) return "city";
  return "other";
}
```

The stored `name` field must use `stripEntityType(rawName)`. The `entity_subtype` field must use `detectSubtype(rawName)`. Both are derived from the raw TIGER name before storage.

### 2.3 Pipeline Fix — County Resolution

After fixing name normalization, EDR matching will succeed for the ~80 municipalities with EDR records, restoring their county values. However, the remaining ~330 municipalities still have no county source.

The fix is to add a Census TIGER place-to-county relationship lookup using the Census Gazetteer or relationship files. The Census Bureau publishes a Place-to-County relationship file that maps every place FIPS to its county FIPS. This is the authoritative, maintenance-free source.

**New script:** `03b_fetch_census_place_county.js`

```
Source: Census Gazetteer / Place-County Relationship File
URL: https://www2.census.gov/geo/docs/maps-data/data/rel2020/place/tab20_place20_county20_natl.txt
Format: tab-delimited, fields: GEOID_PLACE_20, GEOID_COUNTY_20, NAMELSAD_PLACE_20, NAMELSAD_COUNTY_20, AREALAND_PART
Output: /tmp/place_county_raw.json — Map<place_fips, county_name>
```

The build script joins on `place_fips` (already stored on each municipality) against this file to resolve `county`. No name matching required — FIPS is the join key.

### 2.4 Pipeline Fix — Financial Data

After fixing name normalization, the existing EDR seed data (~80 municipalities) will match and populate `total_revenue` and `total_expenditure` for those entities. The seed data values are FY 2022-23 estimates; a note in `data_gaps` should mark them as estimates where the actual EDR Excel download was not available.

For a complete dataset, script `05_fetch_edr_muni.js` should attempt to download and parse the actual EDR Municipal Fiscal Data Excel file. The seed fallback covers the largest municipalities for when the download is unavailable. This behavior is already in the script — the fix is purely upstream (name normalization allows the seed data to match).

For the ~330 smaller municipalities with no EDR record, `total_revenue` and `total_expenditure` remain null with `reason: "unavailable"` (EDR only reports municipalities above a reporting threshold).

### 2.5 UI Fix — Add % Bachelor's+ Column

The municipality explore table (EM-01) currently lists: Name, County, Population, Median HH Income, Per Capita Income, Total Revenue, Total Expenditure, Website, Shortlist.

V2 adds `% Bachelor's+` as a column between Per Capita Income and Total Revenue:

**Updated EM-01 column order:** Name | County | Population | Median HH Income | Per Capita Income | % Bachelor's+ | Total Revenue | Total Expenditure | Website | Shortlist

The filter panel must also gain a `% Bachelor's+` range slider (EM-02 update).

The URL param for this filter is `?bachelors_min=` / `?bachelors_max=` (consistent with the county URL pattern).

---

## 3. School District Elevation

### 3.1 Current State

In V1, school districts are flagged with a discovery-level UI notice: "School district data is provided at a discovery level in V1. Financial data may be incomplete." The underlying issue is that the FLDOE AFR pipeline script (`07_fetch_fldoe_afr.js`) falls back to seed data when the Excel download is unavailable, and the seed data has lower coverage and reliability than counties/municipalities.

### 3.2 V2 Changes

**Data pipeline:** Script `07_fetch_fldoe_afr.js` must be hardened to reliably download and parse the FLDOE Annual Financial Reports Excel file for all 67 school districts. The seed fallback may remain, but the seed data must cover all 67 districts with sourced figures (not estimates).

Fields that must be reliably populated for V2:
- `enrollment_pk12` — from FLDOE PK-12 data or EDR Education conference
- `enrollment_fte` — from EDR Education Estimating Conference
- `total_revenue` — from FLDOE AFR
- `total_expenditure` — from FLDOE AFR
- `expenditure_per_fte` — computed: `total_expenditure / enrollment_fte`
- `website` — official district website

**UI:** Remove the discovery-level notice (ESD-11 from V1 SPEC). School districts are a full decision layer in V2.

**No schema changes required.** The `SchoolDistrict` interface in V1 already includes all needed fields.

---

## 4. Cross-Entity Navigation

### 4.1 Design Principle

Navigation uses the existing URL state system. No new data structures or backend required. A "Related Entities" section in the county detail modal links to pre-filtered explore views. This is zero-cost to implement because the URL state system already supports county-level filtering on all three entity types.

### 4.2 County Detail Modal — Related Entities Section

The `EntityDetailModal` for counties gains a new "Related Entities" section at the bottom, rendered after all data fields.

```
Related Entities
────────────────────────────────────────────────────────
Municipalities (in [County Name])      [View all →]
  Links to /explore/municipalities?county=[CountyName]

School District                        [View →]
  Links to /explore/school-districts?county=[CountyName]
  Shows: district name, enrollment, expenditure per FTE inline

Special Districts ([count])            [View all →]
  Links to /explore/special-districts?county=[CountyName]
```

The municipality count and special district count are computed client-side from the already-loaded data arrays (no new fetch). The school district name is resolved from the school-districts data array by matching `county` field.

### 4.3 URL Patterns (no changes to existing URL state system)

```
County → Municipalities:     /explore/municipalities?county=[CountyName]
County → School District:    /explore/school-districts?county=[CountyName]
County → Special Districts:  /explore/special-districts?county=[CountyName]
```

These URL patterns are already supported by the V1 filter system. V2 simply adds UI entry points that construct and navigate to these URLs.

### 4.4 Reverse Navigation (Municipality → County)

The municipality detail modal gains a "Parent County" link:

```
Parent County: [County Name]  [View county →]
```

Links to `/explore/counties?q=[CountyName]` (pre-fills the text search). This is also zero-cost given the existing URL state system, conditional on Bug 2 being fixed (county resolution).

---

## 5. Map UX Improvements

### 5.1 Current Issues

**Issue 1 — Municipality popup is incomplete.** `MuniPopupContent` renders only: name, county, population, and a "View Details →" link. It has no shortlist button, no financial data, and no demographic data. County popups have shortlist buttons; municipality popups don't. This is inconsistent and makes the map less useful for list-building.

**Issue 2 — No municipality choropleth.** The map can only visualize county-level metrics. When the municipality layer is on, municipalities are all rendered in the same flat blue with no metric encoding. Users cannot use the map to visually compare municipalities by population, income, or revenue.

**Issue 3 — Zoom-gated layer control is confusing.** The municipality toggle button shows "(visible at zoom 8+)" inline in the button label. Users who enable the layer at low zoom see nothing happen and have no clear call to action. The zoom threshold itself is also aggressive — many Florida municipalities are large enough to be visible at zoom 7.

### 5.2 Fix — Municipality Popup

`MuniPopupContent` is updated to match the information density of county popups:

```
[Municipality Name]
County:           [County Name]
Population:       [Number]
Med. HH Income:   [Dollar]
Per Capita Inc.:  [Dollar]
% Bachelor's+:    [Percent]
Total Revenue:    [Dollar or "Unavailable"]

[View Details →]     [+ Shortlist] / [− Remove]
```

The shortlist button uses the same Zustand store (`useShortlist`) as county popups and explore table buttons. The `aria-label` convention from AGENTS.md applies.

Note: Financial data is null for most municipalities in V1. After Bug 3 is fixed (§2.4), `total_revenue` will be populated for the ~80 largest. For the rest, the popup renders "Unavailable" consistent with the gap label policy.

### 5.3 Fix — Municipality Choropleth Mode

When the municipality layer is enabled, the map enters **municipality choropleth mode**: municipalities are colored by the selected metric (same dropdown, same color scale logic) instead of rendered in flat blue. County polygons remain visible as a base layer but are desaturated (light gray borders, no fill) to provide geographic context without competing with the municipality colors.

**Metric support for municipalities:**
- Population ✓ (ACS, 100% populated)
- Median HH Income ✓ (ACS, 100% populated)
- Per Capita Income ✓ (ACS, 100% populated)
- % Bachelor's+ ✓ (ACS, 100% populated)
- Total Revenue — populated for ~80 municipalities post-fix; null municipalities render in null color
- Total Expenditure — same

The color scale for municipality choropleth is computed independently from the county scale. When muni layer is on, the legend updates to reflect municipality data ranges.

**Implementation notes:**
- `MuniLayer` receives `metric` and `municipalities` props (currently receives only `geojson` and `municipalities`).
- `buildChoroplethScale` in `lib/choropleth.ts` is already generic over any array with numeric fields — call it with the municipality array.
- When muni layer is on, `ChoroplethLayer` switches to a "base" style: `fillOpacity: 0`, `color: #d1d5db`, `weight: 0.5` (outline only, no fill).

### 5.4 Fix — Layer Control UX

**Remove the zoom threshold.** Municipalities are rendered at all zoom levels when the layer is toggled on. The previous threshold (zoom 8) was intended to avoid clutter at low zoom, but it confuses users more than it helps. Small municipalities at low zoom will simply overlap and be visually cluttered — this is acceptable and expected behavior for any GIS layer control. Users who want clarity at the state level will keep the layer off.

**Replace the inline "(visible at zoom 8+)" label** with a tooltip on hover.

**Updated toolbar layout:**
```
[Map icon]  Florida Map    Choropleth metric: [dropdown ▾]    [◎ Counties] [◎ Municipalities]
```

The layer selector becomes a segmented control or tab-style toggle: "Counties" and "Municipalities" as mutually exclusive options. This replaces the current pattern of an always-on county choropleth plus an optional additive municipality overlay. The new model is cleaner:

- **Counties mode (default):** County choropleth with selected metric. Municipality boundaries not shown.
- **Municipalities mode:** Municipality choropleth with selected metric. County boundaries shown as outlines only (no fill) for geographic context.

This eliminates the confusing "layers stacked on top of each other" model and makes the map's purpose clear: compare one entity type at a time.

**URL state update:**
```
/map?metric=median_hh_income&entity=municipalities
```
- `?entity=counties` (default, omit from URL)
- `?entity=municipalities`

Replaces the previous `?layer=municipalities` param. The `showMuniLayer` boolean prop on `MapView` becomes an `entity: "counties" | "municipalities"` prop.

---

## 6. Updated Data Model

### 6.1 Municipality (updated)

No interface changes. The V1 `Municipality` interface already has all required fields. The changes are purely in pipeline behavior:

- `name` — must be stored without entity type suffix (fix §2.2)
- `county` — must be populated via FIPS-based join (fix §2.3)
- `total_revenue`, `total_expenditure`, `fiscal_year`, `fiscal_source` — must be populated for all EDR-covered municipalities (fix §2.4)

### 6.2 CountyMetric (updated)

`pct_bachelors_plus` is already in `CountyMetric`. No change needed for the county map.

For the municipality map choropleth, a new `MunicipalityMetric` type is needed:

```typescript
// lib/types.ts — addition
export type MunicipalityMetric =
  | "population"
  | "median_hh_income"
  | "per_capita_income"
  | "pct_bachelors_plus"
  | "total_revenue"
  | "total_expenditure";

export const MUNICIPALITY_METRIC_LABELS: Record<MunicipalityMetric, string> = {
  population: "Population",
  median_hh_income: "Median HH Income",
  per_capita_income: "Per Capita Income",
  pct_bachelors_plus: "% Bachelor's+",
  total_revenue: "Total Revenue",
  total_expenditure: "Total Expenditure",
};
```

The metric dropdown on the map page renders the same options for both entity modes (the label set happens to be identical).

### 6.3 MapEntity (new)

The map page needs to track which entity type is active:

```typescript
// lib/types.ts — addition
export type MapEntity = "counties" | "municipalities";
```

### 6.4 MunicipalityFilters (updated)

```typescript
// lib/types.ts — addition to MunicipalityFilters
interface MunicipalityFilters {
  // ... existing fields ...
  pct_bachelors_plus: [number | null, number | null]; // NEW
}
```

Default: `pct_bachelors_plus: [null, null]`.
URL param: `?bachelors_min=` / `?bachelors_max=` (consistent with county URL naming).

---

## 7. Pipeline Changes

### 7.1 New Script

| Script | Description | Output |
|---|---|---|
| `03b_fetch_census_place_county.js` | Downloads Census place-to-county relationship file, builds `Map<place_fips, county_name>` | `/tmp/place_county_raw.json` |

### 7.2 Modified Scripts

| Script | Change |
|---|---|
| `05_fetch_edr_muni.js` | No logic change. After name normalization fix, seed data matching will succeed for ~80 municipalities. |
| `07_fetch_fldoe_afr.js` | Harden download logic; expand seed data to cover all 67 school districts with sourced figures. |
| `10_build_municipalities.js` | Fix `stripEntityType()` for display name; load `place_county_raw.json` and join on `place_fips` for county resolution; update `normalize()` to strip suffixes for EDR matching. |
| `11_build_school_districts.js` | Remove discovery-level warning comments. |
| `13_validate.js` | Add validation: zero municipalities with `county === "Unknown"`; zero municipalities with name ending in ` city`, ` town`, ` village`. |

### 7.3 Updated `run_all.sh`

Script `03b` must run after `03` (ACS fetch) and before `10` (municipality build):

```bash
node 03_fetch_census_acs.js
node 03b_fetch_census_place_county.js   # NEW
node 04_fetch_edr_county.js
node 05_fetch_edr_muni.js
...
node 10_build_municipalities.js         # now reads place_county_raw.json
```

---

## 8. Feature Requirements

Requirements use EARS format. V1 requirement IDs are unchanged. V2 requirements are prefixed `V2-`.

### 8.1 Municipality Data Quality

**V2-M-01:** THE SYSTEM SHALL display municipality names without entity type suffix. "Alachua city" must appear as "Alachua"; "Alford town" as "Alford"; "Bay Harbor Islands town" as "Bay Harbor Islands".

**V2-M-02:** THE SYSTEM SHALL display the correct parent county for every municipality. Zero municipalities may display "Unknown" as their county value.

**V2-M-03:** THE SYSTEM SHALL display `total_revenue` and `total_expenditure` for all municipalities covered by EDR reporting (approximately the 80 largest by budget). Municipalities below EDR reporting threshold shall display the "Unavailable" gap label.

**V2-M-04:** THE SYSTEM SHALL include `% Bachelor's+` as a sortable column in the municipality explore table, between Per Capita Income and Total Revenue.

**V2-M-05:** THE SYSTEM SHALL include a `% Bachelor's+` range slider in the municipality filter panel.

**V2-M-06:** WHEN a user sets `?bachelors_min=` or `?bachelors_max=` in the municipality explore URL, THE SYSTEM SHALL apply the filter and reflect it in the active filter count.

### 8.2 School District Elevation

**V2-SD-01:** THE SYSTEM SHALL NOT display any discovery-level disclaimer on the School Districts explore page.

**V2-SD-02:** THE SYSTEM SHALL display `total_revenue`, `total_expenditure`, and `expenditure_per_fte` for all 67 Florida school districts.

### 8.3 Cross-Entity Navigation

**V2-N-01:** WHEN a user opens the county detail modal, THE SYSTEM SHALL display a "Related Entities" section showing: the count of municipalities in that county (linked to `/explore/municipalities?county=[name]`), the name of the county's school district (linked to `/explore/school-districts?county=[name]`), and the count of special districts in that county (linked to `/explore/special-districts?county=[name]`).

**V2-N-02:** WHEN a user opens the municipality detail modal, THE SYSTEM SHALL display a "Parent County" link that navigates to `/explore/counties?q=[county_name]`.

**V2-N-03:** WHEN a user follows a cross-entity navigation link, THE SYSTEM SHALL land on the target explore page with the correct filter pre-applied and the result count reflecting that filter.

### 8.4 Map UX

**V2-MAP-01:** THE SYSTEM SHALL replace the municipality layer toggle with a Counties / Municipalities entity mode selector in the map toolbar.

**V2-MAP-02:** WHEN the map is in Counties mode, THE SYSTEM SHALL display county choropleth with the selected metric. No municipality polygons shall be rendered.

**V2-MAP-03:** WHEN the map is in Municipalities mode, THE SYSTEM SHALL display municipality polygons colored by the selected metric using a quantile choropleth scale. County polygons SHALL be rendered as outlines only (no fill) for geographic context.

**V2-MAP-04:** WHEN the map is in Municipalities mode and the selected metric has null values for some municipalities, THE SYSTEM SHALL render those municipalities in the null color (`#e5e7eb`) and include a "No data" entry in the legend.

**V2-MAP-05:** WHEN the map switches between Counties mode and Municipalities mode, THE SYSTEM SHALL update the legend to reflect the data range and entity type of the active layer.

**V2-MAP-06:** WHEN a user clicks a municipality polygon, THE SYSTEM SHALL display a popup containing: municipality name, county, population, median HH income, per capita income, % bachelor's+, total revenue (or gap label), a "View Details →" link, and a shortlist add/remove button.

**V2-MAP-07:** The municipality shortlist button in the map popup SHALL have `aria-label="Add [Name] to shortlist"` or `aria-label="Remove [Name] from shortlist"` consistent with AGENTS.md requirements.

**V2-MAP-08:** THE SYSTEM SHALL update the `?entity=` URL param when the user changes entity mode. WHEN the page loads with `?entity=municipalities`, THE SYSTEM SHALL render in Municipalities mode.

**V2-MAP-09:** Municipality polygons SHALL be rendered at all zoom levels when Municipalities mode is active. There is no minimum zoom threshold.

---

## 9. Task Breakdown

Tasks are ordered by dependency. Each is independently completable and verifiable.

### Phase 0: Municipality Pipeline Fixes

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V2-T-01 | Fix `stripEntityType()` in `10_build_municipalities.js` — strip ` city`, ` town`, ` village`, ` CDP` suffix from display name; update `detectSubtype()` accordingly | — | Re-run script; zero names end in ` city`, ` town`, ` village` |
| V2-T-02 | Write `03b_fetch_census_place_county.js` — download Census place-county relationship file; output `/tmp/place_county_raw.json` as `Map<place_fips, county_name>` | — | File exists; covers all FL place FIPS codes |
| V2-T-03 | Update `10_build_municipalities.js` to load `place_county_raw.json` and join on `place_fips` for county resolution | V2-T-01, V2-T-02 | Re-run; zero municipalities with `county === "Unknown"` |
| V2-T-04 | Update `run_all.sh` to include `03b` in correct sequence | V2-T-02 | `bash run_all.sh` completes; `municipalities.json` has correct county values |
| V2-T-05 | Update `13_validate.js` — add assertions: no `county === "Unknown"`, no names with entity-type suffix | V2-T-03 | Validation passes on corrected data |
| V2-T-06 | Add `pct_bachelors_plus` column to municipality explore table (between Per Capita Income and Total Revenue) | — | Column renders; sorts correctly |
| V2-T-07 | Add `pct_bachelors_plus` range slider to municipality filter panel and wire to URL state (`?bachelors_min=` / `?bachelors_max=`) | V2-T-06 | Filter narrows results; URL updates; roundtrip from URL restores slider state |

### Phase 1: School District Elevation

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V2-T-10 | Harden `07_fetch_fldoe_afr.js` — expand seed data to all 67 districts with sourced figures; verify `total_revenue`, `total_expenditure`, `expenditure_per_fte` populated for all 67 | — | `school-districts.json`: zero null `total_revenue` values; no discovery disclaimer warranted |
| V2-T-11 | Remove discovery-level UI notice from School Districts explore page (delete ESD-11 from V1) | V2-T-10 | Notice absent from rendered page |

### Phase 2: Cross-Entity Navigation

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V2-T-20 | Update `EntityDetailModal` for counties — add "Related Entities" section with municipality count + link, school district name + link, special district count + link | V2-T-03 (county names must work) | All three links navigate to pre-filtered explore pages; counts are accurate |
| V2-T-21 | Update `EntityDetailModal` for municipalities — add "Parent County" link | V2-T-03 | Link navigates to `/explore/counties?q=[name]`; county filter active |

### Phase 3: Map UX

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V2-T-30 | Add `MunicipalityMetric` type and `MUNICIPALITY_METRIC_LABELS` to `lib/types.ts`; add `MapEntity` type | — | TypeScript compiles; no errors |
| V2-T-31 | Replace `showMuniLayer: boolean` prop on `MapView` with `entity: MapEntity`; update `map/page.tsx` to pass `entity`; update URL param from `?layer=municipalities` to `?entity=municipalities` | V2-T-30 | Map renders in both modes; URL state correct |
| V2-T-32 | Replace muni toggle button in toolbar with Counties / Municipalities segmented control | V2-T-31 | Switching mode updates `?entity=` param and re-renders map |
| V2-T-33 | Update `ChoroplethLayer` — when `entity === "municipalities"`, switch to outline-only style (no fill) | V2-T-31 | In Municipalities mode, county polygons render as outlines only |
| V2-T-34 | Update `MuniLayer` — accept `metric: MunicipalityMetric` prop; compute choropleth scale from municipalities array; apply fill color per polygon; remove zoom threshold | V2-T-30, V2-T-31 | Muni polygons colored by metric in Municipalities mode; visible at all zoom levels |
| V2-T-35 | Update `MapLegend` — accept `entity` prop; display correct scale and label for active entity mode | V2-T-33, V2-T-34 | Legend shows municipality data ranges in Municipalities mode; updates on mode switch |
| V2-T-36 | Update `MuniPopupContent` — add median HH income, per capita income, % bachelor's+, total revenue (with gap label), shortlist add/remove button with correct `aria-label` | V2-T-03 (county must be populated) | Popup shows all fields; shortlist button adds/removes correctly; `aria-label` correct |
| V2-T-37 | Wire muni shortlist button in popup to Zustand store (same pattern as `ChoroplethLayer` county popup) | V2-T-36 | Adding muni from map popup reflects in shortlist count in nav; `/shortlist` shows the entry |

### Phase 4: Verification

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V2-T-40 | Re-run full pipeline (`bash run_all.sh`); confirm all V2 acceptance criteria in §10 | All pipeline tasks | All criteria pass |
| V2-T-41 | Verify V2-MAP requirements: both entity modes render correctly; legend updates; popups complete; shortlist works from map | All map tasks | V2-MAP-01 through V2-MAP-09 satisfied |
| V2-T-42 | Verify cross-entity navigation: all links navigate to correct pre-filtered pages; counts match actual data | All navigation tasks | V2-N-01 through V2-N-03 satisfied |
| V2-T-43 | Run `npx tsc --noEmit`; zero type errors | All implementation tasks | Clean build |
| V2-T-44 | Run `next build`; zero warnings or errors | V2-T-43 | Build artifact produced successfully |

---

## 10. Acceptance Criteria

V2 is complete when ALL of the following are true:

### Municipality Data Quality
1. Zero municipalities in `municipalities.json` have a `name` field ending in ` city`, ` town`, or ` village`.
2. Zero municipalities have `county: "Unknown"`.
3. All municipalities covered by EDR reporting have non-null `total_revenue` and `total_expenditure`.
4. The municipality explore table includes a `% Bachelor's+` column that sorts correctly.
5. The municipality filter panel includes a `% Bachelor's+` range slider wired to `?bachelors_min=` / `?bachelors_max=` URL params.
6. A filtered municipality URL containing `?bachelors_min=30` reproduces the same filtered result when opened in a new tab.

### School Districts
7. All 67 school districts have non-null `total_revenue`, `total_expenditure`, and `expenditure_per_fte`.
8. The discovery-level disclaimer is absent from the School Districts explore page.

### Cross-Entity Navigation
9. Every county detail modal shows a "Related Entities" section with accurate counts and working links for municipalities, school district, and special districts.
10. Every municipality detail modal shows a "Parent County" link that navigates to the correct county in the county explore view.
11. All cross-entity navigation links land with the correct filter pre-applied and the result count reflecting only entities in that county.

### Map UX
12. The map toolbar has a Counties / Municipalities mode selector replacing the old layer toggle.
13. In Counties mode, only county choropleth is visible; no municipality polygons are rendered.
14. In Municipalities mode, municipality polygons are colored by the selected metric; county polygons render as outlines only.
15. In Municipalities mode, municipalities with null values for the selected metric render in the null color (#e5e7eb).
16. The map legend updates correctly when switching between Counties and Municipalities mode.
17. Clicking a municipality polygon in Municipalities mode opens a popup with: name, county, population, median HH income, per capita income, % bachelor's+, total revenue (or gap label), "View Details →" link, and a functioning shortlist button.
18. The municipality shortlist button in the popup has the correct `aria-label` per AGENTS.md.
19. Municipality polygons are visible at all zoom levels when Municipalities mode is active.
20. `?entity=municipalities` in the map URL reproduces Municipalities mode when the page is loaded directly.

### Build
21. `npx tsc --noEmit` produces zero type errors.
22. `next build` completes with zero errors or warnings.
23. All V1 acceptance criteria from SPEC.md §12 remain satisfied.
