# C-Discover — Technical Specification

**Version:** 1.0  
**Date:** 2026-06-26  
**Status:** Approved for implementation  
**Scope:** V1

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Architecture Decisions](#2-architecture-decisions)
3. [Data Model](#3-data-model)
4. [Data Pipeline Plan](#4-data-pipeline-plan)
5. [Feature Requirements](#5-feature-requirements)
6. [Application Architecture](#6-application-architecture)
7. [URL State Design](#7-url-state-design)
8. [Map Specification](#8-map-specification)
9. [Shortlist & Export Specification](#9-shortlist--export-specification)
10. [AGENTS.md Context File](#10-agentsmd-context-file)
11. [Task Breakdown](#11-task-breakdown)
12. [Acceptance Criteria](#12-acceptance-criteria)

---

## 1. Project Summary

C-Discover is a static Next.js web application that provides a fast, credible, and structured reference tool for identifying Florida public-sector clients. It covers four entity types — counties, municipalities, school districts, and special districts — and surfaces demographic, financial, and access data sourced from official Florida and federal sources.

The tool is intentionally neutral: it presents data without scoring, ranking, or AI-generated recommendations. It must be navigable by both human users and external AI agents (via clean URL state and semantic HTML).

**V1 Scope:**
- All 67 Florida counties (full data)
- All Florida municipalities (~400, full data)
- All 67 school districts (discovery-level: enrollment + basic financials)
- All Florida special districts (discovery-level: name, type, county, website)
- Interactive map (counties + municipalities)
- Shortlist builder + CSV export

**Out of scope for V1:**
- Authentication / user accounts
- Server-side rendering of dynamic data
- AI/NLP features of any kind
- Scoring, ranking, or recommendations
- Cross-entity navigation (V2)
- Special district cohort grouping (V3)

---

## 2. Architecture Decisions

### 2.1 Framework

**Decision:** Next.js 14, App Router, TypeScript, deployed to Vercel.

**Rationale:**
- Static export (`next export`) means zero backend cost; all data is pre-built JSON.
- App Router enables layouts and per-segment loading states with minimal boilerplate.
- TypeScript enforces the data contract between the pipeline and the UI at compile time.

### 2.2 Data Strategy

**Decision:** All data pre-fetched at build time and stored as static JSON files in `/public/data/`. No runtime API calls.

**Rationale:**
- Eliminates dependency on third-party API uptime during use.
- Enables instant filter response with no network latency.
- Refresh cycle (manual re-run of data pipeline scripts) is acceptable given that source data (EDR, Census ACS 5-year) is updated annually.

### 2.3 Map Library

**Decision:** [react-leaflet](https://react-leaflet.js.org/) with OpenStreetMap tiles.

**Rationale:**
- No API key required.
- Well-supported with Next.js (dynamic import to skip SSR).
- Handles GeoJSON polygon rendering and choropleth coloring natively.

### 2.4 State Management

**Decision:** URL query params for all filter/sort state. Zustand for shortlist state, persisted to `localStorage`.

**Rationale:**
- URL state makes every filtered view shareable and agent-navigable by direct URL construction.
- Zustand + localStorage means the shortlist survives page refreshes without a backend.

### 2.5 Styling

**Decision:** Tailwind CSS + shadcn/ui component primitives.

**Rationale:** Fast to build clean, consistent UI. shadcn components (Table, Select, Slider, Badge, Dialog) match the "structured, comparable" design principle without custom CSS overhead.

### 2.6 Export

**Decision:** Client-side CSV generation using PapaParse.

**Rationale:** No server needed. Works offline. Produces clean, Excel-compatible output.

---

## 3. Data Model

All entities share a common base. Entity-specific fields extend the base.

### 3.1 Base Entity

```typescript
interface BaseEntity {
  // Identity
  id: string;                    // e.g. "county_alachua", "muni_miami", "sd_miami_dade", "spd_sw_fl_water"
  type: "county" | "municipality" | "school_district" | "special_district";
  name: string;                  // Display name, e.g. "Alachua County", "City of Miami"
  county: string;                // Parent county name (for municipalities, SDs, special districts)

  // Access
  website: string | null;

  // Data governance
  last_updated: string;          // ISO date string of last data refresh
  data_gaps: DataGap[];          // List of fields with missing/unavailable data
}

type DataGapField = string;      // Field name that has a gap
type DataGapReason = "unknown" | "unavailable" | "not_applicable";

interface DataGap {
  field: DataGapField;
  reason: DataGapReason;
}
```

### 3.2 County

```typescript
interface County extends BaseEntity {
  type: "county";
  fips: string;                         // 5-digit FIPS code, e.g. "12001"
  county_seat: string | null;

  // Demographics — Source: Census ACS 5-Year (most recent available, ~2022)
  population: number | null;
  population_year: number | null;
  population_source: "ACS_5YR" | "EDR";
  median_hh_income: number | null;      // dollars
  per_capita_income: number | null;     // dollars
  income_year: number | null;
  income_source: "ACS_5YR";
  pct_bachelors_plus: number | null;    // 0–100, percent of adults 25+
  education_year: number | null;
  education_source: "ACS_5YR";
  poverty_rate: number | null;          // 0–100, percent below poverty line
  poverty_year: number | null;

  // Financials — Source: EDR County Fiscal Data (most recent fiscal year)
  total_revenue: number | null;         // dollars
  total_expenditure: number | null;     // dollars
  property_tax_revenue: number | null;  // dollars
  fiscal_year: number | null;           // e.g. 2023
  fiscal_source: "EDR_COUNTY";

  // Geography
  lat: number;
  lon: number;                          // centroid, for map fallback
  area_sq_miles: number | null;
  region: FloridaRegion;               // see enum below
}

type FloridaRegion =
  | "Northwest"
  | "Northeast"
  | "Central West"
  | "Central East"
  | "Southeast"
  | "Southwest"
  | "South";
```

### 3.3 Municipality

```typescript
interface Municipality extends BaseEntity {
  type: "municipality";
  place_fips: string;                   // Census place FIPS
  entity_subtype: "city" | "town" | "village" | "other";

  // Demographics — Source: Census ACS 5-Year
  population: number | null;
  population_year: number | null;
  median_hh_income: number | null;
  per_capita_income: number | null;
  income_year: number | null;
  pct_bachelors_plus: number | null;
  poverty_rate: number | null;
  income_source: "ACS_5YR";

  // Financials — Source: EDR Municipal Fiscal Data
  total_revenue: number | null;
  total_expenditure: number | null;
  fiscal_year: number | null;
  fiscal_source: "EDR_MUNI";

  // Geography
  lat: number;
  lon: number;
}
```

### 3.4 School District

```typescript
interface SchoolDistrict extends BaseEntity {
  type: "school_district";
  nces_id: string;                      // NCES district ID
  fips: string;                         // County FIPS (school districts are county-level in FL)

  // Enrollment — Source: FLDOE PK-12 Data / EDR Education Estimating Conference
  enrollment_pk12: number | null;       // Total PK-12 enrollment
  enrollment_year: string | null;       // School year, e.g. "2023-24"
  enrollment_fte: number | null;        // Full-time equivalent students
  enrollment_source: "FLDOE" | "EDR_EDUC";

  // Financials — Source: FLDOE School District Annual Financial Reports
  total_revenue: number | null;
  total_expenditure: number | null;
  expenditure_per_fte: number | null;   // dollars per FTE student
  fiscal_year: number | null;
  fiscal_source: "FLDOE_AFR";

  // Access
  superintendent_name: string | null;
}
```

### 3.5 Special District

```typescript
interface SpecialDistrict extends BaseEntity {
  type: "special_district";
  sdid: string;                          // FloridaCommerce Special District ID
  purpose_category: SpecialDistrictPurpose;
  dependent: boolean | null;            // true = dependent on county/muni; false = independent
  charter_year: number | null;
  governing_board: string | null;        // Description of board type

  // Financials (V1: best-effort from DFS LOGERx, may be widely null)
  total_revenue: number | null;
  total_expenditure: number | null;
  fiscal_year: number | null;
  fiscal_source: "DFS_LOGERX" | null;
}

type SpecialDistrictPurpose =
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
```

### 3.6 Static File Layout

```
/public/data/
  counties.json              # County[]
  municipalities.json        # Municipality[]
  school-districts.json      # SchoolDistrict[]
  special-districts.json     # SpecialDistrict[]
  counties.geo.json          # GeoJSON FeatureCollection (county polygons)
  municipalities.geo.json    # GeoJSON FeatureCollection (municipality polygons)
  metadata.json              # { last_pipeline_run: string, source_versions: Record<string, string> }
```

All dollar figures are stored as integers (whole dollars). All percentages are stored as floats (e.g. `34.2` for 34.2%). Null means the data is not available; the corresponding `data_gaps` entry explains why.

---

## 4. Data Pipeline Plan

The pipeline is a set of Node.js or Python scripts in `/scripts/pipeline/`. Each script is independent, idempotent, and writes its output to `/public/data/`. Scripts are run manually (or in CI on a schedule) to refresh data.

### 4.1 Source Registry

| Source ID | Name | URL | Format | Entity Types | Fields |
|---|---|---|---|---|---|
| `EDR_COUNTY` | EDR County Revenues & Expenditures | https://edr.state.fl.us/Content/local-government/data/revenues-expenditures/stwidefiscal.cfm | Excel/CSV download | County | total_revenue, total_expenditure, property_tax_revenue |
| `EDR_MUNI` | EDR Municipal Revenues & Expenditures | https://edr.state.fl.us/Content/local-government/data/revenues-expenditures/munifiscal.cfm | Excel/CSV download | Municipality | total_revenue, total_expenditure |
| `EDR_EDUC` | EDR Education Estimating Conference — PreK-12 Enrollment | https://www.edr.state.fl.us/Content/conferences/publicschools/index.cfm | Excel download | School District | enrollment_pk12, enrollment_fte |
| `EDR_DEMOG` | EDR Population & Demographic Data | https://edr.state.fl.us/Content/population-demographics/data/index-floridaproducts.cfm | Excel/CSV download | County, Municipality | population |
| `ACS_5YR` | Census ACS 5-Year Estimates | https://api.census.gov/data/2022/acs/acs5 | REST API (JSON) | County, Municipality | median_hh_income, per_capita_income, pct_bachelors_plus, poverty_rate, population |
| `FLDOE_AFR` | FLDOE School District Annual Financial Reports | https://www.fldoe.org/finance/fl-edu-finance-program-fefp/school-dis-annual-financial-reports-af.stml | Excel download | School District | total_revenue, total_expenditure, expenditure_per_fte |
| `FLDOE_PK12` | FLDOE PK-12 Data Publications | https://www.fldoe.org/accountability/data-sys/edu-info-accountability-services/pk-12-public-school-data-pubs-reports/ | Excel/CSV | School District | enrollment_pk12 |
| `FLORIDACOMMERCE_SD` | FloridaCommerce Official Special District List | https://www.floridajobs.org/community-planning-and-development/special-districts/special-district-accountability-program/official-list-of-special-districts | Excel download | Special District | name, county, sdid, purpose, website, dependent, charter_year |
| `DFS_LOGERX` | DFS LOGERx Public Reports | https://logerx.myfloridacfo.gov/LogerX/PublicReportsMenu | Web / CSV | Special District | total_revenue, total_expenditure (best-effort) |
| `FL_GEO_COUNTIES` | Florida County Boundaries | https://florida-office-of-broadband-flbroadband.hub.arcgis.com/datasets/florida-county-boundaries/explore | GeoJSON (ArcGIS) | County | geometry |
| `FL_GEO_MUNIS` | Florida Municipal Boundaries | https://services6.arcgis.com/B8iKcMs83hgqommE/ArcGIS/rest/services/city_boundaries/FeatureServer | GeoJSON (ArcGIS FeatureServer) | Municipality | geometry |

### 4.2 Pipeline Scripts

```
/scripts/pipeline/
  01_fetch_county_geo.js          # Downloads FL_GEO_COUNTIES → /public/data/counties.geo.json
  02_fetch_muni_geo.js            # Downloads FL_GEO_MUNIS → /public/data/municipalities.geo.json
  03_fetch_census_acs.js          # Calls Census ACS API for FL counties + places → /tmp/acs_raw.json
  04_fetch_edr_county.js          # Downloads EDR_COUNTY Excel, parses → /tmp/edr_county_raw.json
  05_fetch_edr_muni.js            # Downloads EDR_MUNI Excel, parses → /tmp/edr_muni_raw.json
  06_fetch_edr_education.js       # Downloads EDR_EDUC Excel, parses → /tmp/edr_educ_raw.json
  07_fetch_fldoe_afr.js           # Downloads FLDOE_AFR Excel, parses → /tmp/fldoe_afr_raw.json
  08_fetch_special_districts.js   # Downloads FLORIDACOMMERCE_SD Excel → /tmp/sd_raw.json
  09_build_counties.js            # Merges ACS + EDR_COUNTY + geo centroids → counties.json
  10_build_municipalities.js      # Merges ACS + EDR_MUNI → municipalities.json
  11_build_school_districts.js    # Merges EDR_EDUC + FLDOE_AFR → school-districts.json
  12_build_special_districts.js   # Cleans sd_raw → special-districts.json
  13_validate.js                  # Schema validation on all four output files; prints gap report
  run_all.sh                      # Runs scripts 01–13 in order
```

### 4.3 Census ACS API Variables

The following ACS 5-year variables are fetched for Florida counties (geographic level: `county:*&in=state:12`) and Florida places (geographic level: `place:*&in=state:12`):

| Variable | Description | Maps To |
|---|---|---|
| `B01003_001E` | Total population | `population` |
| `B19013_001E` | Median household income | `median_hh_income` |
| `B19301_001E` | Per capita income | `per_capita_income` |
| `B15003_022E` | Bachelor's degree (pop 25+) | numerator for `pct_bachelors_plus` |
| `B15003_023E` | Master's degree (pop 25+) | numerator for `pct_bachelors_plus` |
| `B15003_024E` | Professional degree (pop 25+) | numerator for `pct_bachelors_plus` |
| `B15003_025E` | Doctorate degree (pop 25+) | numerator for `pct_bachelors_plus` |
| `B15003_001E` | Total population 25+ (denominator) | denominator for `pct_bachelors_plus` |
| `B17001_002E` | Population below poverty level | numerator for `poverty_rate` |
| `B17001_001E` | Total population for poverty status | denominator for `poverty_rate` |

Base URL: `https://api.census.gov/data/2022/acs/acs5`  
No API key required for reasonable request volumes; add key via env var `CENSUS_API_KEY` if rate-limited.

### 4.4 Data Gap Policy

- A field is set to `null` when data is not available or cannot be reliably matched.
- The `data_gaps` array must include an entry for every null field.
- Reasons:
  - `"unknown"` — data exists somewhere but was not found in pipeline sources
  - `"unavailable"` — data does not exist or is not publicly reported
  - `"not_applicable"` — the field is structurally inapplicable to this entity
- The validation script (`13_validate.js`) must print a gap summary report after every pipeline run.

### 4.5 Key Matching / Deduplication Rules

- **Counties:** Matched by FIPS code across all sources. GeoJSON features matched by county name (normalized: lowercase, stripped of "County").
- **Municipalities:** Matched by Census place FIPS. EDR data matched to Census places by name (normalized: lowercase, stripped of "city of / town of"). Unmatched EDR rows flagged in pipeline log.
- **School districts:** Matched by county FIPS (FL school districts are strictly county-level).
- **Special districts:** FloridaCommerce ID (`sdid`) is the primary key. No cross-source merging required for V1.

---

## 5. Feature Requirements

Requirements use EARS format: `WHEN [trigger], THE SYSTEM SHALL [response]` or `THE SYSTEM SHALL [behavior]`.

### 5.1 Global

**G-01:** THE SYSTEM SHALL render all pages as static HTML with no server-side per-request computation.

**G-02:** THE SYSTEM SHALL display a "Data last updated: [date]" indicator in the footer on every page, sourced from `metadata.json`.

**G-03:** THE SYSTEM SHALL label all data points with their source (tooltip or footnote) on entity detail views.

**G-04:** THE SYSTEM SHALL display gap labels ("Unknown", "Unavailable", "N/A") in place of null values — never blank cells or dashes alone.

**G-05:** THE SYSTEM SHALL be navigable without JavaScript for static content (entity lists, detail views). Filters and the map require JavaScript; this is acceptable.

**G-06:** WHEN a user copies a URL from any filtered/sorted table view, THE SYSTEM SHALL reproduce the exact same filter state when that URL is opened in a new tab or browser.

**G-07:** THE SYSTEM SHALL use semantic HTML (`<table>`, `<th scope>`, `<nav>`, `<main>`, `<section>`, `aria-label`) throughout so that external agents can locate and interact with page elements by role and label.

### 5.2 Navigation

**N-01:** THE SYSTEM SHALL provide a persistent top navigation bar with four links: Counties, Municipalities, School Districts, Special Districts.

**N-02:** THE SYSTEM SHALL provide a persistent top navigation bar link to the Map view.

**N-03:** THE SYSTEM SHALL provide a persistent shortlist indicator in the navigation bar showing the current shortlist count (e.g. "Shortlist (4)").

**N-04:** WHEN the shortlist count is greater than zero, THE SYSTEM SHALL make the shortlist indicator a clickable link to `/shortlist`.

### 5.3 Explore — Counties

**EC-01:** THE SYSTEM SHALL display all 67 Florida counties in a sortable table with the following columns: Name, Population, Median HH Income, Per Capita Income, % Bachelor's+, Total Revenue, Total Expenditure, Region, Website, Shortlist.

**EC-02:** THE SYSTEM SHALL provide the following filter controls in a sidebar or filter bar:
- Region (multi-select checkboxes: Northwest, Northeast, Central West, Central East, Southeast, Southwest, South)
- Population (range slider: min/max)
- Median HH Income (range slider: min/max)
- Per Capita Income (range slider: min/max)
- Total Revenue (range slider: min/max)
- Total Expenditure (range slider: min/max)
- % Bachelor's+ (range slider: min/max)
- Text search (matches county name)

**EC-03:** WHEN a user applies any filter, THE SYSTEM SHALL update the table immediately (client-side) and update the URL query params to reflect the new filter state.

**EC-04:** WHEN a user clicks a county row, THE SYSTEM SHALL display a detail panel or modal with all county fields, source citations, and gap labels.

**EC-05:** WHEN a user clicks the "Add to Shortlist" button on a county row or detail view, THE SYSTEM SHALL add that county to the shortlist and update the shortlist count in the nav bar.

**EC-06:** WHEN a county is already in the shortlist, THE SYSTEM SHALL display a "Remove" button in place of the "Add" button.

**EC-07:** THE SYSTEM SHALL allow sorting by any numeric column (ascending/descending) by clicking column headers.

**EC-08:** THE SYSTEM SHALL display the active filter count ("3 filters active") adjacent to the filter controls.

**EC-09:** THE SYSTEM SHALL display a "Clear all filters" button WHEN any filter is active.

**EC-10:** THE SYSTEM SHALL display the result count ("Showing 12 of 67 counties") above the table.

### 5.4 Explore — Municipalities

**EM-01:** THE SYSTEM SHALL display all Florida municipalities in a sortable table with the following columns: Name, County, Population, Median HH Income, Per Capita Income, Total Revenue, Total Expenditure, Website, Shortlist.

**EM-02:** THE SYSTEM SHALL provide the following filter controls:
- County (multi-select, searchable dropdown)
- Region (multi-select, derived from county)
- Population (range slider)
- Median HH Income (range slider)
- Per Capita Income (range slider)
- Total Revenue (range slider)
- Total Expenditure (range slider)
- Text search (matches municipality name)

**EM-03 through EM-10:** Same behavior as EC-03 through EC-10, applied to municipalities.

**EM-11:** THE SYSTEM SHALL paginate municipality results at 50 rows per page WHEN the result count exceeds 50, with prev/next controls and a page indicator. Pagination state shall be reflected in the URL (`?page=2`).

### 5.5 Explore — School Districts

**ESD-01:** THE SYSTEM SHALL display all 67 Florida school districts in a sortable table with columns: Name, County, PK-12 Enrollment, FTE Enrollment, Total Revenue, Total Expenditure, Expenditure per FTE, Website, Shortlist.

**ESD-02:** THE SYSTEM SHALL provide the following filter controls:
- County (multi-select, searchable dropdown)
- Region (derived from county)
- Enrollment (range slider)
- Expenditure per FTE (range slider)
- Total Revenue (range slider)
- Text search

**ESD-03 through ESD-10:** Same behavior as EC-03 through EC-10, applied to school districts.

**ESD-11:** THE SYSTEM SHALL display a discovery-level notice on the School Districts page: "School district data is provided at a discovery level in V1. Financial data may be incomplete."

### 5.6 Explore — Special Districts

**ESPD-01:** THE SYSTEM SHALL display all Florida special districts in a sortable table with columns: Name, County, Purpose Category, Dependent/Independent, Charter Year, Website, Shortlist.

**ESPD-02:** THE SYSTEM SHALL provide the following filter controls:
- County (multi-select, searchable dropdown)
- Region (derived from county)
- Purpose Category (multi-select checkboxes)
- Dependent/Independent (toggle)
- Text search

**ESPD-03 through ESPD-08:** Same behavior as EC-03 through EC-08, applied to special districts.

**ESPD-09:** THE SYSTEM SHALL paginate special district results at 50 rows per page.

**ESPD-10:** THE SYSTEM SHALL display a discovery-level notice: "Special district data is provided at a discovery level in V1. Financial data is not available for most districts."

### 5.7 Map View

See Section 8 for full map specification.

**MAP-01:** THE SYSTEM SHALL display an interactive map of Florida as the default view at `/map`.

**MAP-02:** THE SYSTEM SHALL default to showing county boundaries with a choropleth fill.

**MAP-03:** THE SYSTEM SHALL allow the user to switch the choropleth metric via a dropdown: Population, Median HH Income, Per Capita Income, Total Revenue, Total Expenditure, % Bachelor's+.

**MAP-04:** THE SYSTEM SHALL allow the user to toggle municipality boundaries on/off as a layer over the county layer.

**MAP-05:** WHEN a user clicks a county on the map, THE SYSTEM SHALL display a popup with: county name, selected metric value, population, and a link to the county's explore detail view.

**MAP-06:** WHEN a user clicks a municipality boundary on the map, THE SYSTEM SHALL display a popup with: municipality name, county, population, and a link to the municipality's explore detail view.

**MAP-07:** THE SYSTEM SHALL display a legend showing the choropleth color scale and metric label.

**MAP-08:** THE SYSTEM SHALL provide zoom and pan controls. The initial zoom shall frame all of Florida.

### 5.8 Shortlist & Export

See Section 9 for full specification.

**SL-01:** THE SYSTEM SHALL maintain a single shortlist that can contain a mix of entity types (counties, municipalities, school districts, special districts).

**SL-02:** THE SYSTEM SHALL persist the shortlist to `localStorage` so it survives page refreshes.

**SL-03:** THE SYSTEM SHALL display all shortlisted entities on `/shortlist` in a grouped table (grouped by entity type).

**SL-04:** THE SYSTEM SHALL allow the user to remove individual entities from the shortlist on the `/shortlist` page.

**SL-05:** THE SYSTEM SHALL allow the user to clear the entire shortlist.

**SL-06:** WHEN the user clicks "Export to CSV", THE SYSTEM SHALL download a CSV file named `c-discover-shortlist-[YYYY-MM-DD].csv` containing all shortlisted entities with their key fields. See Section 9.2 for exact column spec.

**SL-07:** THE SYSTEM SHALL display source citations for each field in the CSV as a separate column ("Source").

---

## 6. Application Architecture

### 6.1 Directory Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout: nav bar, footer, shortlist provider
│   ├── page.tsx                    # Redirect to /explore/counties
│   ├── explore/
│   │   ├── layout.tsx              # Explore layout: entity type tabs
│   │   ├── counties/
│   │   │   └── page.tsx            # County explore page
│   │   ├── municipalities/
│   │   │   └── page.tsx
│   │   ├── school-districts/
│   │   │   └── page.tsx
│   │   └── special-districts/
│   │       └── page.tsx
│   ├── map/
│   │   └── page.tsx                # Map view
│   └── shortlist/
│       └── page.tsx                # Shortlist + export
├── components/
│   ├── nav/
│   │   ├── TopNav.tsx
│   │   └── ShortlistIndicator.tsx
│   ├── explore/
│   │   ├── EntityTable.tsx         # Generic sortable table (typed via generics)
│   │   ├── FilterPanel.tsx         # Sidebar filter controls
│   │   ├── FilterRangeSlider.tsx
│   │   ├── FilterMultiSelect.tsx
│   │   ├── FilterTextSearch.tsx
│   │   ├── ActiveFilterBadge.tsx
│   │   ├── ResultCount.tsx
│   │   ├── EntityDetailModal.tsx   # Detail view (all fields, sources, gaps)
│   │   ├── ShortlistButton.tsx
│   │   └── Pagination.tsx
│   ├── map/
│   │   ├── MapView.tsx             # Dynamic-imported Leaflet map
│   │   ├── ChoroplethLayer.tsx
│   │   ├── MuniLayer.tsx
│   │   ├── MapPopup.tsx
│   │   └── MapLegend.tsx
│   └── shortlist/
│       ├── ShortlistTable.tsx
│       └── ExportButton.tsx
├── lib/
│   ├── data.ts                     # Typed loaders for all four JSON files
│   ├── filters.ts                  # Pure filter functions (county, muni, sd, spd)
│   ├── url-state.ts                # Serialize/deserialize URL params ↔ filter state
│   ├── shortlist.ts                # Zustand store
│   ├── export.ts                   # CSV generation with PapaParse
│   ├── choropleth.ts               # Color scale calculation for map
│   └── types.ts                    # All TypeScript interfaces (mirrors Section 3)
├── public/
│   └── data/
│       ├── counties.json
│       ├── municipalities.json
│       ├── school-districts.json
│       ├── special-districts.json
│       ├── counties.geo.json
│       ├── municipalities.geo.json
│       └── metadata.json
└── scripts/
    └── pipeline/
        ├── 01_fetch_county_geo.js
        ├── 02_fetch_muni_geo.js
        ├── 03_fetch_census_acs.js
        ├── 04_fetch_edr_county.js
        ├── 05_fetch_edr_muni.js
        ├── 06_fetch_edr_education.js
        ├── 07_fetch_fldoe_afr.js
        ├── 08_fetch_special_districts.js
        ├── 09_build_counties.js
        ├── 10_build_municipalities.js
        ├── 11_build_school_districts.js
        ├── 12_build_special_districts.js
        ├── 13_validate.js
        └── run_all.sh
```

### 6.2 Data Loading Pattern

All data files are fetched once at the page component level using `fetch('/data/counties.json')` inside a `use client` component, or passed as props from a server component that reads the file directly. For V1, the simpler approach is:

```typescript
// lib/data.ts
export async function loadCounties(): Promise<County[]> {
  const res = await fetch('/data/counties.json');
  return res.json();
}
```

Each explore page calls the relevant loader on mount and stores in local state. Filtering is then pure client-side computation on the in-memory array.

### 6.3 Filter State Shape

```typescript
// County filter state (example — each entity type has its own)
interface CountyFilters {
  search: string;
  regions: FloridaRegion[];
  population: [number | null, number | null];     // [min, max]
  median_hh_income: [number | null, number | null];
  per_capita_income: [number | null, number | null];
  total_revenue: [number | null, number | null];
  total_expenditure: [number | null, number | null];
  pct_bachelors_plus: [number | null, number | null];
  sort_field: keyof County;
  sort_dir: "asc" | "desc";
  page: number;
}

const DEFAULT_COUNTY_FILTERS: CountyFilters = {
  search: "",
  regions: [],
  population: [null, null],
  median_hh_income: [null, null],
  per_capita_income: [null, null],
  total_revenue: [null, null],
  total_expenditure: [null, null],
  pct_bachelors_plus: [null, null],
  sort_field: "population",
  sort_dir: "desc",
  page: 1,
};
```

### 6.4 Shortlist Store

```typescript
// lib/shortlist.ts
interface ShortlistStore {
  items: ShortlistItem[];
  add: (entity: BaseEntity) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

interface ShortlistItem {
  id: string;
  type: BaseEntity["type"];
  name: string;
  county: string;
  // Snapshot of key fields at time of add (so export works without re-loading all data)
  snapshot: Record<string, string | number | null>;
}
```

---

## 7. URL State Design

All filter, sort, and pagination state lives in URL query parameters. This makes every filtered view shareable and predictable for both humans and agents.

### 7.1 Parameter Naming Convention

```
/explore/counties
  ?q=miami                          # text search
  &region=Northwest,Northeast       # comma-separated enum values
  &pop_min=100000                   # range min (null = omit param)
  &pop_max=500000                   # range max
  &income_min=50000
  &income_max=80000
  &pci_min=30000
  &revenue_min=100000000
  &expenditure_min=100000000
  &bachelors_min=25
  &sort=population                  # sort field key
  &dir=desc                         # sort direction

/explore/municipalities
  ?q=fort
  &county=Miami-Dade,Broward        # comma-separated county names
  &region=Southeast
  &pop_min=10000
  &sort=median_hh_income
  &dir=desc
  &page=2                           # pagination

/explore/school-districts
  ?county=Duval
  &enrollment_min=50000
  &sort=expenditure_per_fte
  &dir=asc

/explore/special-districts
  ?county=Palm+Beach
  &purpose=Water+%2F+Wastewater,Fire+%2F+Rescue
  &dependent=false
  &sort=name
  &dir=asc
  &page=3

/map
  ?metric=median_hh_income          # choropleth metric
  &layer=municipalities             # optional: show muni layer
```

### 7.2 Serialization Rules

- Null / empty / default values are **omitted** from the URL (keeps URLs clean).
- Range params where min = data minimum or max = data maximum are omitted.
- Multi-value params use comma-separated strings in a single param.
- `sort` defaults are omitted (`population desc` for counties, `enrollment desc` for school districts, etc.).
- `page=1` is omitted.

### 7.3 Agent Navigation Notes

The tool is designed so that an external agent can:
1. Navigate to a filtered view by constructing a URL directly (e.g. `/explore/counties?region=Southeast&pop_min=200000`).
2. Locate table rows by their `data-entity-id` attribute on `<tr>` elements.
3. Locate the "Add to Shortlist" button via `aria-label="Add [Name] to shortlist"`.
4. Locate the export button via `aria-label="Export shortlist to CSV"`.
5. Read filter state by parsing URL params without needing to inspect DOM.

---

## 8. Map Specification

### 8.1 Library

react-leaflet v4 + Leaflet v1.9. Loaded via Next.js `dynamic(() => import('./MapView'), { ssr: false })` to avoid SSR hydration issues with the Leaflet DOM.

Tile provider: OpenStreetMap (no API key). Tile URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.

### 8.2 Default State

- Center: `[27.8, -81.5]` (geographic center of Florida)
- Zoom: `7` (frames all of Florida with padding)
- Active layer: Counties choropleth
- Default metric: Population
- Municipality layer: Off

### 8.3 Choropleth Behavior

- Color scale: 5-step sequential scale using `chroma-js` or hardcoded Tailwind color classes.
- Counties with null values for the selected metric: rendered in light gray (`#e5e7eb`).
- Scale is computed across non-null values only, using quantile breaks (5 equal-count buckets).
- Legend shows 5 color swatches with the corresponding value ranges.

### 8.4 County Click Popup

```
[County Name]
[Metric Label]: [Formatted Value]
Population: [Number]
Median HH Income: [Dollar]
[View Details →]  (links to /explore/counties?q=[name])
[+ Add to Shortlist]
```

### 8.5 Municipality Layer

- Rendered as semi-transparent blue polygons on top of county layer.
- Only visible at zoom level 8+; hidden at lower zoom to avoid visual clutter.
- Click popup: municipality name, county, population, "View Details →" link.

### 8.6 GeoJSON Optimization

- County GeoJSON: simplified to ~50KB total using `mapshaper` or `topojson` during the pipeline. Target: < 500KB before gzip.
- Municipality GeoJSON: simplified to ~150KB total. Target: < 1MB before gzip.
- Both files loaded lazily (not blocking initial map render).

---

## 9. Shortlist & Export Specification

### 9.1 Shortlist Page Layout

```
/shortlist

[Clear All]                                [Export to CSV]

Counties (3)
  [Table: Name | County | Population | Median HH Income | Total Revenue | Website | Remove]

Municipalities (2)
  [Table: Name | County | Population | Median HH Income | Total Revenue | Website | Remove]

School Districts (1)
  [Table: Name | County | Enrollment | Expenditure per FTE | Total Revenue | Website | Remove]

Special Districts (5)
  [Table: Name | County | Purpose | Dependent? | Website | Remove]
```

### 9.2 CSV Export Column Specification

The exported CSV includes one row per shortlisted entity. All entity types are in the same flat file; columns not applicable to an entity type are left blank.

| Column | Source |
|---|---|
| Entity Type | `type` |
| Name | `name` |
| County | `county` |
| Population | `population` |
| Population Year | `population_year` |
| Median HH Income | `median_hh_income` |
| Per Capita Income | `per_capita_income` |
| % Bachelor's+ | `pct_bachelors_plus` |
| Poverty Rate | `poverty_rate` |
| Total Revenue | `total_revenue` |
| Total Expenditure | `total_expenditure` |
| Fiscal Year | `fiscal_year` |
| PK-12 Enrollment | `enrollment_pk12` (school districts only) |
| FTE Enrollment | `enrollment_fte` (school districts only) |
| Expenditure per FTE | `expenditure_per_fte` (school districts only) |
| Purpose Category | `purpose_category` (special districts only) |
| Dependent/Independent | derived from `dependent` |
| Website | `website` |
| Demographics Source | `income_source` |
| Financials Source | `fiscal_source` |
| Data Gaps | `data_gaps` field names joined by "; " |

Dollar values in the CSV are formatted as integers (no dollar sign, no commas) for machine readability. A separate "human-readable" format option is not required in V1.

---

## 10. AGENTS.md Context File

The following file shall be created at the repo root as `AGENTS.md`. It provides persistent context for any AI agent working in this codebase.

```markdown
# AGENTS.md — C-Discover

## What this repo is
A Next.js 14 static web app for Florida public-sector market intelligence.
No backend, no auth, no AI features. All data is pre-built JSON in /public/data/.

## Tech stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- react-leaflet for maps (SSR disabled, dynamic import only)
- Zustand for shortlist state (persisted to localStorage)
- PapaParse for CSV export
- Node.js scripts in /scripts/pipeline/ for data pipeline

## Critical constraints
- NEVER add runtime API calls. All data comes from /public/data/*.json.
- NEVER add AI/NLP features. The tool is intentionally neutral.
- NEVER add scoring, ranking, or recommendations.
- ALL filter and sort state must be reflected in URL query params (see SPEC.md §7).
- ALL entity table rows must have data-entity-id="[id]" on the <tr> element.
- ALL shortlist buttons must have aria-label="Add [Name] to shortlist" or "Remove [Name] from shortlist".

## Data files (read-only at runtime)
- /public/data/counties.json — County[]
- /public/data/municipalities.json — Municipality[]
- /public/data/school-districts.json — SchoolDistrict[]
- /public/data/special-districts.json — SpecialDistrict[]
- /public/data/counties.geo.json — GeoJSON FeatureCollection
- /public/data/municipalities.geo.json — GeoJSON FeatureCollection
- /public/data/metadata.json — pipeline metadata

## Types
All TypeScript interfaces are in /lib/types.ts. Do not redefine them inline.

## Running the pipeline
cd scripts/pipeline && bash run_all.sh

## Dev server
npm run dev

## Build
npm run build

## Tests
npm test (Vitest, if configured)

## File to check first
SPEC.md — full technical specification, requirement IDs (G-01, EC-01, etc.), and task breakdown.
```

---

## 11. Task Breakdown

Tasks are ordered by dependency. Each task is independently completable and verifiable.

### Phase 0: Foundations

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-00 | Create AGENTS.md at repo root | — | File exists, contains all sections from §10 |
| T-01 | Initialize Next.js 14 project (TypeScript, Tailwind, App Router) | — | `npm run dev` serves on localhost:3000 |
| T-02 | Install dependencies: react-leaflet, leaflet, zustand, papaparse, shadcn/ui | T-01 | `npm ls` shows all packages |
| T-03 | Create `/lib/types.ts` with all interfaces from §3 | T-01 | TypeScript compiles with zero errors |
| T-04 | Create root layout with TopNav (4 explore links + Map + Shortlist indicator) and Footer with "Data last updated" | T-01 | Nav renders; shortlist count shows 0 |

### Phase 1: Data Pipeline

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-10 | Script 01: Fetch county GeoJSON from FL_GEO_COUNTIES → counties.geo.json | — | File exists; valid GeoJSON; 67 features |
| T-11 | Script 02: Fetch municipality GeoJSON from FL_GEO_MUNIS → municipalities.geo.json | — | File exists; valid GeoJSON |
| T-12 | Script 03: Fetch Census ACS 5-year for all FL counties and places → /tmp/acs_raw.json | — | File contains FIPS, population, income, education vars for all 67 counties and FL places |
| T-13 | Script 04: Download and parse EDR county fiscal data → /tmp/edr_county_raw.json | — | File contains revenue, expenditure, property tax for all 67 counties |
| T-14 | Script 05: Download and parse EDR municipal fiscal data → /tmp/edr_muni_raw.json | — | File contains revenue, expenditure for FL municipalities |
| T-15 | Script 06: Download and parse EDR education enrollment data → /tmp/edr_educ_raw.json | — | File contains enrollment, FTE for 67 school districts |
| T-16 | Script 07: Download and parse FLDOE AFR (financial reports) → /tmp/fldoe_afr_raw.json | — | File contains revenue, expenditure, exp/FTE for 67 school districts |
| T-17 | Script 08: Download FloridaCommerce special districts list → /tmp/sd_raw.json | — | File contains all FL special districts with name, county, sdid, purpose |
| T-18 | Script 09: Build counties.json from ACS + EDR county + centroids | T-10, T-12, T-13 | 67 records; schema matches County interface; `data_gaps` present |
| T-19 | Script 10: Build municipalities.json from ACS + EDR muni | T-12, T-14 | All FL municipalities; schema matches Municipality interface |
| T-20 | Script 11: Build school-districts.json from EDR educ + FLDOE AFR | T-15, T-16 | 67 records; schema matches SchoolDistrict interface |
| T-21 | Script 12: Build special-districts.json from sd_raw | T-17 | All FL special districts; schema matches SpecialDistrict interface |
| T-22 | Script 13: Validate all four output files; print gap report | T-18, T-19, T-20, T-21 | Zero schema errors; gap report printed |
| T-23 | Create run_all.sh to execute T-10 through T-22 in order | T-22 | `bash run_all.sh` completes; all four JSON files written |

### Phase 2: Core Data Layer

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-30 | Create `/lib/data.ts` with typed loaders for all four JSON files | T-03, T-18–T-21 | TypeScript compiles; loaders return typed arrays |
| T-31 | Create `/lib/url-state.ts`: serialize/deserialize filter state ↔ URL params (all four entity types) | T-03 | Unit tests: roundtrip encode/decode produces identical filter objects |
| T-32 | Create `/lib/filters.ts`: pure filter functions for each entity type | T-03 | Unit tests: each filter function produces correct subsets |
| T-33 | Create `/lib/shortlist.ts`: Zustand store with add/remove/clear/has, persisted to localStorage | T-03 | Store updates; persists across page refresh |

### Phase 3: Explore Pages

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-40 | Build generic `EntityTable` component with sort and `data-entity-id` on each `<tr>` | T-04 | Sorts correctly; rows have correct data attrs |
| T-41 | Build `FilterPanel` with `FilterRangeSlider`, `FilterMultiSelect`, `FilterTextSearch` | T-04 | Controls render; changes emit filter state |
| T-42 | Build `EntityDetailModal` with all fields, source citations, gap labels | T-04 | Modal opens on row click; shows all fields |
| T-43 | Build `ShortlistButton` component | T-33 | Adds/removes from store; label changes correctly |
| T-44 | Build Counties explore page (`/explore/counties`) | T-30–T-32, T-40–T-43 | All EC-01–EC-10 requirements satisfied |
| T-45 | Build Municipalities explore page (`/explore/municipalities`) | T-30–T-32, T-40–T-43 | All EM-01–EM-11 requirements satisfied |
| T-46 | Build School Districts explore page (`/explore/school-districts`) | T-30–T-32, T-40–T-43 | All ESD-01–ESD-11 requirements satisfied |
| T-47 | Build Special Districts explore page (`/explore/special-districts`) | T-30–T-32, T-40–T-43 | All ESPD-01–ESPD-10 requirements satisfied |

### Phase 4: Map

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-50 | Create `/lib/choropleth.ts`: quantile color scale calculation | T-03 | Unit test: 67 counties bucketed into 5 equal-count groups |
| T-51 | Build `MapView.tsx` (dynamic import, Leaflet base + OSM tiles) | T-04 | Map renders Florida on `/map`; no SSR errors |
| T-52 | Build `ChoroplethLayer.tsx`: county polygons with metric-based fill | T-50, T-51 | Choropleth colors correct; legend matches; null counties gray |
| T-53 | Build `MuniLayer.tsx`: municipality polygons, hidden below zoom 8 | T-51 | Muni polygons appear at zoom 8+; toggle works |
| T-54 | Build `MapPopup.tsx` for county and municipality click | T-52, T-53 | Popup shows correct fields; "View Details" link works; "Add to Shortlist" works |
| T-55 | Build `MapLegend.tsx` | T-52 | Legend visible; updates when metric changes |
| T-56 | Wire metric dropdown to URL param `?metric=` | T-51 | URL updates on metric change; metric restored from URL on load |

### Phase 5: Shortlist & Export

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-60 | Create `/lib/export.ts`: CSV generation from shortlist items | T-03, T-33 | Unit test: CSV matches column spec in §9.2 |
| T-61 | Build `ShortlistTable.tsx` grouped by entity type | T-33 | All entity types shown in separate sections |
| T-62 | Build `ExportButton.tsx` with aria-label and PapaParse CSV download | T-60 | CSV downloads; filename correct; columns match §9.2 |
| T-63 | Build `/shortlist` page | T-61, T-62 | SL-01 through SL-07 satisfied |

### Phase 6: Verification

| ID | Task | Depends On | Verification |
|---|---|---|---|
| T-70 | Audit all pages for G-01 through G-07 compliance | T-44–T-47, T-56, T-63 | Each requirement checked off |
| T-71 | Verify all URL state roundtrips for all four entity types | T-31, T-44–T-47 | Copy URL from filtered view; open in new tab; identical results |
| T-72 | Verify agent-navigability: `data-entity-id` on all rows; `aria-label` on all shortlist buttons | T-44–T-47 | `document.querySelectorAll('[data-entity-id]')` returns correct count |
| T-73 | Run `next build` with no TypeScript errors | All | Build succeeds; zero type errors |
| T-74 | Verify gap labels appear for null fields (spot-check 5 entities with known gaps) | T-44 | "Unknown" / "Unavailable" shown; no blank cells |
| T-75 | Verify GeoJSON file sizes meet targets (§8.6) | T-10, T-11 | counties.geo.json < 500KB; municipalities.geo.json < 1MB before gzip |

---

## 12. Acceptance Criteria

The V1 release is complete when ALL of the following are true:

1. `next build` completes with zero TypeScript errors and zero warnings.
2. All 67 counties appear in the county explore table with at least: population, median HH income, total revenue, and website populated (or explicitly gap-labeled).
3. All Florida municipalities appear in the municipality explore table.
4. All 67 school districts appear with enrollment data.
5. All Florida special districts appear with name, county, purpose, and website (or gap labels).
6. Every filtered/sorted view is fully reproducible from its URL alone.
7. The map renders county choropleth for all six supported metrics; null-value counties are gray.
8. The municipality layer toggles on/off and popups show correct data.
9. A shortlist can be built with entities from all four entity types, exported to CSV, and the CSV columns match §9.2.
10. `data-entity-id` attributes are present on all `<tr>` rows in all four explore tables.
11. `aria-label` attributes are present on all shortlist add/remove buttons.
12. The "Data last updated" footer indicator reflects the last pipeline run date from `metadata.json`.
13. All source citations are visible on entity detail views.
14. Gap labels ("Unknown", "Unavailable", "N/A") appear for every null field — no blank cells.
