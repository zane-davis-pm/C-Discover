# C-Discover — Deep Dive Dashboard Revamp Specification

**Version:** Draft 1.0  
**Date:** 2026-07-01  
**Status:** Proposed for implementation  
**Scope:** Static deep-dive dashboards backed by richer pre-built source data

---

## 1. Purpose

The current deep dive feature improves entity detail presentation, but it still relies almost entirely on the same summary fields displayed in explore tables. The next version should turn deep dives into source-grounded analytical dashboards that expose the most useful granular facts from official public reports while preserving C-Discover's constraints:

- No runtime API calls.
- No AI/NLP features.
- No scoring, ranking, recommendations, or lead qualification.
- All data remains pre-built static JSON under `/public/data/`.
- Every displayed statistic has a source, year, and gap state.
- Visualizations stay neutral, comparable, accessible, and inspectable.

The feature is intended to help users understand a jurisdiction's fiscal profile, demographic context, service footprint, and data coverage without leaving the app or manually opening source spreadsheets.

---

## 2. Research-Grounded Visualization Principles

This spec uses the following visualization principles as product requirements, not decorative preferences.

### 2.1 Quantitative Comparisons

Use 2D position and length for important quantitative comparisons. Bar charts, aligned dot plots, line charts, and bullet/strip charts should be the default. Avoid pie charts, donut charts, radial gauges, radar charts, 3D charts, and decorative area-based graphics for primary analysis because they make exact comparison harder.

Applied requirements:

- Use horizontal bars for category totals.
- Use line charts for time series.
- Use dot/strip plots for peer distributions.
- Use stacked bars only for part-to-whole composition with a limited number of stable categories.
- Do not use pie, donut, gauge, radar, or 3D charts in the deep dive.

Research basis:

- Nielsen Norman Group emphasizes that length and 2D position are easier to interpret quickly than area, angle, or circular forms.
- Microsoft Power BI dashboard guidance recommends clean, uncluttered dashboards, right chart selection, consistent axes/colors, and avoiding 3D and hard-to-read circular visuals.

### 2.2 Dashboard Information Architecture

The deep dive is an analytical dashboard, not an operational real-time dashboard. It should answer a small set of durable questions quickly and then allow the user to inspect source details.

Primary user questions:

1. What kind of jurisdiction or public entity is this?
2. What is its fiscal scale and fiscal mix?
3. How has its population, enrollment, or financial profile changed over time?
4. What service areas appear most materially important?
5. What official entry points and source documents support this record?
6. Which data is unavailable or low-confidence?

Applied requirements:

- Put identity, source years, and top-line scale first.
- Put composition and trends before raw source tables.
- Keep source ledgers and detailed values accessible, but not visually dominant.
- Avoid chart variety for its own sake.
- Keep mobile dashboards shorter and more sequential than desktop dashboards.

### 2.3 Accessibility

Charts must be useful without relying on hover, color alone, or a purely visual reading of the chart.

Applied requirements:

- Every chart has a visible title, source/year label, and short text summary.
- Every chart has an adjacent or expandable data table containing the same values.
- Color is never the only cue for category, series, or status.
- Interactive chart elements are keyboard reachable when interactive.
- Tooltip-only data is prohibited.
- SVG charts must expose accessible names and descriptions.
- Canvas-only charts are prohibited unless a full semantic table and text equivalent are present.

Research basis:

- W3C WAI guidance for complex images requires short and long text alternatives for charts and maps.
- Accessibility research on public dashboards highlights the need for discoverable metrics, keyboard access, semantic labels, plain-language summaries, and machine-readable tables.

### 2.4 Neutrality

The dashboard must remain descriptive. It may compare an entity to distributions or medians, but it must not assign value judgments.

Applied requirements:

- Do not display "best," "worst," "high opportunity," "low opportunity," "priority," or similar labels.
- Do not color fiscal or demographic values green/red to imply good/bad.
- Do not sort peer distributions by desirability.
- Do not generate written recommendations.
- Use neutral labels such as "entity value," "peer median," "statewide distribution," "available records," and "not reported."

---

## 3. Product Model

### 3.1 Deep Dive Surface

Replace or supplement `EntityDeepDiveModal` with a shareable detail route:

```text
/entity/[type]/[id]
```

Examples:

```text
/entity/county/county_alachua
/entity/municipality/muni_miami
/entity/school-district/sd_miami_dade
/entity/special-district/spd_SD001
```

The existing modal may remain as a quick preview, but the revamped dashboard should be a page-level experience because:

- It is too information-dense for a modal.
- It needs stable URLs for sharing and agent navigation.
- It needs tables, chart text equivalents, and source ledgers.
- It should support future export/print without cramped modal layout.

### 3.2 Navigation Entry Points

Add a "Deep dive" action wherever entity details are currently reachable:

- Explore table row action.
- Existing detail modal or deep dive modal.
- Compare page entity header.
- Shortlist table.
- Map popup.

The action must be a regular link to the static route. It must not depend on client-only state.

### 3.3 Static Data Loading

Dashboard pages must load data only from `/public/data/` JSON files.

Use this layered data model:

```text
/public/data/counties.json
/public/data/municipalities.json
/public/data/school-districts.json
/public/data/special-districts.json
```

These remain the lightweight explore indexes.

Add detail files:

```text
/public/data/deep-dive/counties/[id].json
/public/data/deep-dive/municipalities/[id].json
/public/data/deep-dive/school-districts/[id].json
/public/data/deep-dive/special-districts/[id].json
```

Each detail file contains normalized visual facts, source ledger entries, and data gaps for one entity.

---

## 4. Source Data Strategy

### 4.1 Current Limitation

Current pipeline scripts collapse source reports into a small number of fields:

- Counties: total revenue, total expenditure, property tax revenue, ACS summary demographics.
- Municipalities: total revenue, total expenditure for EDR-reporting municipalities, ACS summary demographics.
- School districts: total revenue, total expenditure, expenditure per FTE, enrollment.
- Special districts: registry fields and best-effort fiscal totals.

The source reports likely contain additional useful dimensions: categories, functions, funds, historical years, demographic breakdowns, and source metadata. The revamp should preserve those dimensions in detail JSON.

### 4.2 Source Priority

#### Priority 1: County and Municipality Fiscal Detail

Sources:

- `EDR_COUNTY`: EDR County Revenues & Expenditures.
- `EDR_MUNI`: EDR Municipal Revenues & Expenditures.

Target facts:

- Revenue by category.
- Expenditure by category/function.
- Property tax revenue.
- Intergovernmental revenue.
- Charges for services.
- Licenses, permits, fees, and special assessments where available.
- Utility/service tax revenue where available.
- Debt service and capital outlay where available.
- Multi-year revenue and expenditure totals.
- Per-resident fiscal measures.

#### Priority 2: Demographic and Market Context

Sources:

- `ACS_5YR`: Census ACS 5-Year.
- `EDR_DEMOG`: EDR Population and Demographic Data.
- `EDR_AREA_PROFILES`: EDR Area Profiles, if reliably downloadable.

Target facts:

- Population history and/or projections.
- Age bands.
- Household income distribution.
- Poverty.
- Educational attainment.
- Labor force / employment status.
- Industry or occupation mix, if available.
- Housing tenure and vacancy.
- Internet access, if available.
- Language spoken at home, if relevant and stable.

#### Priority 3: School District Enrollment and Finance Detail

Sources:

- `EDR_EDUC`: Education Estimating Conference enrollment.
- `FLDOE_AFR`: School District Annual Financial Reports.
- `FLDOE_PK12`: PK-12 Data Publications.

Target facts:

- Historical and projected enrollment.
- FTE enrollment.
- Revenue by source: federal, state, local, other.
- Expenditure by function: instruction, pupil personnel, instructional media, school administration, general administration, transportation, food service, facilities, debt service, capital.
- Expenditure per FTE over time.
- Fund balance or ending balance where available.

#### Priority 4: Special District Registry and Financial Coverage

Sources:

- `FLORIDACOMMERCE_SD`: Official List of Special Districts.
- `DFS_LOGERX`: DFS LOGERx Public Reports.

Target facts:

- Registry identity.
- Purpose category.
- Dependent / independent status.
- Charter year.
- Governing board.
- Website.
- County.
- Latest available LOGERx fiscal totals.
- LOGERx coverage status.
- Same-purpose statewide and same-county cohort counts.

### 4.3 New Pipeline Outputs

Add normalized intermediate files under `tmp/`:

```text
tmp/edr_county_fiscal_facts.json
tmp/edr_muni_fiscal_facts.json
tmp/acs_demographic_facts.json
tmp/edr_demographic_facts.json
tmp/fldoe_afr_facts.json
tmp/edr_education_facts.json
tmp/dfs_logerx_facts.json
```

Add build outputs under `/public/data/deep-dive/`.

The original entity JSON files should remain compact and backwards compatible. Do not add large nested chart payloads to table-index files.

---

## 5. Data Contracts

All TypeScript interfaces must live in `/lib/types.ts`. Do not redefine inline.

### 5.1 Common Types

```typescript
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
```

### 5.2 Entity Detail Contracts

```typescript
export interface CountyDeepDive {
  id: string;
  type: "county";
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
  demographics: {
    population_trend: DeepDiveSeriesPoint[];
    population_projection: DeepDiveSeriesPoint[];
    age_bands: DeepDiveCategoryValue[];
    income_distribution: DeepDiveCategoryValue[];
    education_attainment: DeepDiveCategoryValue[];
    housing: DeepDiveCategoryValue[];
    labor_force: DeepDiveCategoryValue[];
  };
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export interface MunicipalityDeepDive {
  id: string;
  type: "municipality";
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
  demographics: CountyDeepDive["demographics"];
  sources: DeepDiveSourceRef[];
  data_gaps: DeepDiveDataGap[];
}

export interface SchoolDistrictDeepDive {
  id: string;
  type: "school_district";
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
```

### 5.3 Source Ledger Requirement

Every displayed value must trace to a `DeepDiveSourceRef` by `source_id`.

If a chart combines multiple sources, the chart must display all relevant source labels. If a chart contains derived values, the derived field must list its source inputs in `notes`.

Examples:

- `revenue_per_resident` derives from `EDR_COUNTY.total_revenue / ACS_5YR.population`.
- `property_tax_share` derives from `EDR_COUNTY.property_tax_revenue / EDR_COUNTY.total_revenue`.
- `expenditure_per_fte` may come directly from `FLDOE_AFR` or be derived from `total_expenditure / enrollment_fte`; the source ledger must say which.

---

## 6. Dashboard Information Architecture

### 6.1 Shared Layout

All entity dashboards use this high-level structure:

1. Header.
2. Snapshot.
3. Primary analytical section.
4. Context section.
5. Peer distribution section.
6. Access and source section.
7. Data coverage and source ledger.

Desktop layout:

- Constrained content width.
- Top snapshot in a dense metric grid.
- Primary charts in a two-column analytical layout where appropriate.
- Source ledger full-width at bottom.

Mobile layout:

- Single-column.
- Summary first.
- Charts stacked by importance.
- Tables collapsed behind "View data table" controls.

### 6.2 Header

Content:

- Entity name.
- Entity type.
- County / region where applicable.
- Last generated date.
- Latest source years shown as compact labels.
- Actions: shortlist toggle, compare checkbox where supported, official website, back to explore.

Requirements:

- Header must not include narrative recommendations.
- Header must include visible source currency: e.g. `ACS 2022`, `FY2023`, `Generated 2026-07-01`.

### 6.3 Snapshot

Purpose:

Show the few values needed to orient the user before reading charts.

County / municipality cards:

- Population.
- Median household income.
- Total revenue.
- Total expenditure.
- Revenue per resident.
- Fiscal year.

School district cards:

- PK-12 enrollment.
- FTE enrollment.
- Total revenue.
- Total expenditure.
- Expenditure per FTE.
- Fiscal year.

Special district cards:

- Purpose category.
- Dependent / independent.
- Charter year.
- Governing board.
- County.
- LOGERx coverage status.

Requirements:

- Cards must be compact.
- Cards must not use red/green semantic coloring.
- Each card must show source/year in a subdued but visible label.

---

## 7. Required Visualizations By Entity Type

### 7.1 County Dashboard

#### 7.1.1 Fiscal Composition

Visuals:

- Revenue by category: horizontal stacked bar or sorted horizontal bars.
- Expenditure by category: horizontal stacked bar or sorted horizontal bars.

Preferred default:

- Use sorted horizontal bars if categories exceed 6.
- Use stacked bar only when the source categories are stable and limited.

Important measures:

- Total revenue.
- Total expenditure.
- Property tax revenue.
- Property tax share of total revenue.
- Intergovernmental revenue.
- Charges for services.
- Public safety expenditure.
- Transportation expenditure.
- Physical environment expenditure.
- General government expenditure.
- Debt service / capital outlay where available.

#### 7.1.2 Fiscal Trend

Visuals:

- Line chart: revenue and expenditure over time.
- Optional neutral difference bars: revenue minus expenditure by year.

Requirements:

- Do not mix nominal and inflation-adjusted dollars unless clearly labeled.
- If only one year is available, show a single-year composition view and a clear data gap for missing trend.

#### 7.1.3 Per-Resident Profile

Visuals:

- Bullet/strip chart showing entity value against peer distribution for:
  - Revenue per resident.
  - Expenditure per resident.
  - Property tax revenue per resident.
  - Total expenditure per square mile if useful and available.

Requirements:

- Label as "statewide county distribution," not rank.
- Include peer count.

#### 7.1.4 Demographic Context

Visuals:

- Population history/projection line.
- Age-band horizontal bars.
- Education attainment bars.
- Income distribution bars if available.
- Housing tenure bars.

Avoid:

- Choropleth inside the entity deep dive unless it adds entity-specific context.
- Demographic labels that imply desirability.

### 7.2 Municipality Dashboard

Use the county dashboard structure with these municipality-specific adjustments:

- Compare to municipalities with available EDR fiscal records, not all municipalities when fiscal data coverage is partial.
- Always show coverage count: e.g. "Fiscal peer distribution based on 81 municipalities with EDR fiscal data."
- Add `contact_tier` only as a data-coverage/access field, not as a quality signal.
- Include county context: parent county and region.

Important measures:

- Total revenue and expenditure.
- Per-resident revenue and expenditure.
- Revenue/expenditure mix.
- Population trend.
- Median household income.
- Poverty rate.
- Education attainment.
- Housing tenure.

### 7.3 School District Dashboard

#### 7.3.1 Enrollment Profile

Visuals:

- Enrollment trend line.
- Enrollment projection line, visually distinct from historical actuals.
- FTE trend line if available.

Requirements:

- Historical and projected values must be visually and textually distinguished.
- If projections are unavailable, do not imply a forecast.

#### 7.3.2 Finance Profile

Visuals:

- Revenue by source stacked bar.
- Expenditure by function sorted bars.
- Expenditure per FTE trend line.
- Peer distribution strip chart for expenditure per FTE.

Important measures:

- Federal revenue.
- State revenue.
- Local revenue.
- Instruction expenditure.
- Instructional support expenditure.
- Administration expenditure.
- Transportation expenditure.
- Food service expenditure.
- Facilities/capital/debt expenditure.

#### 7.3.3 Enrollment and Finance Context

Visuals:

- Synchronized small multiples for enrollment and total expenditure over time.
- Avoid dual-axis charts unless no other design can communicate the relationship.

Requirements:

- Do not imply causation between enrollment and spending.
- Include source-year labels for enrollment and finance separately.

### 7.4 Special District Dashboard

Special districts have uneven data coverage, so the dashboard should focus first on registry and governance.

#### 7.4.1 Registry Profile

Visuals:

- Compact fact grid for purpose, county, dependent status, charter year, governing board, website.
- No chart required if facts are categorical.

#### 7.4.2 Cohort Context

Visuals:

- Purpose cohort count bars by county or statewide purpose.
- Dependency mix stacked bar: dependent vs independent for same purpose category.
- Charter-year histogram for same purpose category.

Requirements:

- Cohort visuals must be descriptive.
- Do not rank districts within a purpose cohort.

#### 7.4.3 Financial Coverage

Visuals:

- If LOGERx match exists: revenue/expenditure paired bars and fiscal year.
- If no match: coverage state panel explaining the gap.

Important measures:

- Latest total revenue.
- Latest total expenditure.
- Fiscal year.
- Match confidence / matching method if available.

---

## 8. Chart Component Requirements

### 8.1 Chart Library

Preferred approach:

- Build small SVG chart primitives in React for bars, lines, strips, and tables.
- Avoid introducing a large chart dependency unless implementation complexity becomes materially higher than maintaining local primitives.

Acceptable chart primitives:

- `HorizontalBarChart`
- `StackedBarChart`
- `LineChart`
- `DistributionStrip`
- `Sparkline`
- `DataTableDisclosure`
- `SourceNote`

Requirements:

- Components must be responsive.
- Components must use stable dimensions to prevent layout shift.
- Components must support keyboard-visible table equivalents.
- Components must not depend on browser-only APIs during server render unless wrapped as client components.

### 8.2 Formatting

Rules:

- Use compact financial labels in charts: `$1.2B`, `$850M`, `$42K`.
- Use full formatted values in tables: `$1,284,000,000`.
- Use one decimal place for percentages unless source precision requires otherwise.
- Use consistent units within a chart.
- Do not mix fiscal years and calendar years in the same chart without explicit labeling.

### 8.3 Color

Rules:

- Use a restrained categorical palette with sufficient contrast.
- Use the same category color across all charts of the same entity type.
- Do not use red/green as good/bad.
- Use line style, marker shape, labels, or grouping in addition to color.
- Use neutral gray for missing/unavailable data.

### 8.4 Empty and Partial States

Every chart must define:

- Full data state.
- Partial data state.
- No data state.

No data state copy must be neutral:

- "No category-level EDR fiscal data was available for this entity."
- "Only one fiscal year is available, so no trend is shown."
- "LOGERx financial data was not matched to this district in the current pipeline."

Do not use a blank chart area.

---

## 9. Pipeline Implementation Plan

### Phase 1: Source Audit and Schema Mapping

Tasks:

1. Download or locate the authoritative source workbooks for EDR county, EDR municipal, FLDOE AFR, EDR education, FloridaCommerce special districts, and DFS LOGERx.
2. Document worksheet names, header rows, category names, fiscal-year columns, and entity identifiers.
3. Create a source mapping file:

```text
scripts/pipeline/config/deep_dive_sources.json
```

This file should map raw source columns to normalized fact keys.

Acceptance criteria:

- Every proposed chart has a mapped source field or a documented data gap.
- Source mappings are versioned in the repo.
- The pipeline can print a coverage report before writing public data.

### Phase 2: Normalize Fact Tables

Tasks:

1. Add parser scripts:

```text
scripts/pipeline/16_fetch_edr_demographics.js
scripts/pipeline/17_build_county_fiscal_facts.js
scripts/pipeline/18_build_muni_fiscal_facts.js
scripts/pipeline/19_build_school_finance_facts.js
scripts/pipeline/20_build_special_district_finance_facts.js
```

2. Normalize data into long-form facts:

```typescript
{
  entity_type: "county",
  entity_id: "county_alachua",
  metric_key: "property_tax_revenue",
  category_key: "property_tax",
  value: 198000000,
  unit: "dollars",
  year: 2023,
  source_id: "EDR_COUNTY"
}
```

3. Preserve raw category labels and normalized category labels.

Acceptance criteria:

- Facts are matched by FIPS, place FIPS, NCES/county FIPS, or special district ID.
- Unmatched rows are logged.
- Nulls are represented as data gaps, not silently omitted.

### Phase 3: Build Entity Detail JSON

Tasks:

1. Add builder script:

```text
scripts/pipeline/21_build_deep_dive_data.js
```

2. Emit per-entity JSON files under `/public/data/deep-dive/`.
3. Emit an index:

```text
public/data/deep-dive/index.json
```

Index contents:

```typescript
{
  generated_at: string;
  counts: Record<string, number>;
  source_versions: Record<string, string>;
  coverage: Record<string, {
    entities_total: number;
    entities_with_fiscal_detail: number;
    entities_with_demographic_detail: number;
    entities_with_trend_detail: number;
  }>;
}
```

Acceptance criteria:

- Every entity in existing public entity JSON has either a deep-dive file or an explicit "not generated" coverage entry.
- Entity detail files validate against TypeScript-compatible JSON schema.
- Detail generation does not mutate existing explore-index files except source metadata if needed.

### Phase 4: UI Implementation

Tasks:

1. Add route:

```text
app/entity/[type]/[id]/page.tsx
```

2. Add data loaders:

```typescript
loadCountyDeepDive(id)
loadMunicipalityDeepDive(id)
loadSchoolDistrictDeepDive(id)
loadSpecialDistrictDeepDive(id)
```

3. Add chart primitives under:

```text
components/deep-dive/
```

4. Link existing explore rows, modals, map popups, shortlist rows, and compare headers to the route.

Acceptance criteria:

- No top-level `leaflet` or `react-leaflet` imports are introduced.
- No runtime API calls are introduced.
- Static build succeeds.
- Dashboard route works by direct URL.
- Existing shortlist, compare, filter URL state, and table row requirements are not regressed.

### Phase 5: Accessibility, QA, and Documentation

Tasks:

1. Add chart data-table toggles.
2. Add source ledger.
3. Add data gap panels.
4. Verify keyboard access.
5. Verify mobile layout.
6. Add pipeline coverage report to docs.

Acceptance criteria:

- Every chart has visible source/year labels.
- Every chart has a text summary and data table.
- No data is available only on hover.
- Color is never the only encoding.
- `npm run build` and `npm run type-check` pass.

---

## 10. Feature Requirements

### 10.1 General

**DD-G-01:** THE SYSTEM SHALL provide a shareable deep-dive page for each entity with generated deep-dive data.

**DD-G-02:** THE SYSTEM SHALL load deep-dive data only from static JSON files under `/public/data/`.

**DD-G-03:** THE SYSTEM SHALL NOT add runtime API calls, AI/NLP features, scoring, ranking, or recommendations.

**DD-G-04:** THE SYSTEM SHALL display source, year, and data-gap information for every charted value.

**DD-G-05:** THE SYSTEM SHALL show a neutral no-data state wherever a chart cannot be rendered.

**DD-G-06:** THE SYSTEM SHALL include a source ledger on every deep-dive page.

### 10.2 Visualization

**DD-VIZ-01:** THE SYSTEM SHALL use bars, lines, dot/strip charts, or tables for primary quantitative displays.

**DD-VIZ-02:** THE SYSTEM SHALL NOT use pie charts, donut charts, radial gauges, radar charts, or 3D charts.

**DD-VIZ-03:** THE SYSTEM SHALL provide a data table equivalent for every chart.

**DD-VIZ-04:** THE SYSTEM SHALL NOT require hover to access any essential value.

**DD-VIZ-05:** THE SYSTEM SHALL NOT use color as the only means of encoding category, series, or status.

**DD-VIZ-06:** THE SYSTEM SHALL use consistent category ordering and colors for the same source categories across charts.

### 10.3 County

**DD-C-01:** THE SYSTEM SHALL display county fiscal revenue composition when category-level EDR data is available.

**DD-C-02:** THE SYSTEM SHALL display county expenditure composition when category-level EDR data is available.

**DD-C-03:** THE SYSTEM SHALL display county fiscal trends when multi-year EDR data is available.

**DD-C-04:** THE SYSTEM SHALL display county demographic context from ACS and/or EDR demographic sources.

**DD-C-05:** THE SYSTEM SHALL display neutral peer distribution context for per-resident fiscal measures when enough peer data exists.

### 10.4 Municipality

**DD-M-01:** THE SYSTEM SHALL display municipal fiscal composition when category-level EDR data is available.

**DD-M-02:** THE SYSTEM SHALL label municipal fiscal peer distributions with their actual coverage count.

**DD-M-03:** THE SYSTEM SHALL display demographic context for all municipalities with ACS place-level data.

**DD-M-04:** THE SYSTEM SHALL show explicit fiscal data gaps for municipalities without EDR fiscal records.

### 10.5 School District

**DD-SCH-01:** THE SYSTEM SHALL display enrollment trend and projection data when available.

**DD-SCH-02:** THE SYSTEM SHALL visually distinguish historical enrollment from projected enrollment.

**DD-SCH-03:** THE SYSTEM SHALL display school district revenue by source when FLDOE AFR category data is available.

**DD-SCH-04:** THE SYSTEM SHALL display school district expenditure by function when FLDOE AFR category data is available.

**DD-SCH-05:** THE SYSTEM SHALL display expenditure per FTE trend when available.

### 10.6 Special District

**DD-SPD-01:** THE SYSTEM SHALL prioritize registry, governance, purpose, and access facts for special districts.

**DD-SPD-02:** THE SYSTEM SHALL display same-purpose cohort counts statewide and by county.

**DD-SPD-03:** THE SYSTEM SHALL display dependency mix for same-purpose special districts.

**DD-SPD-04:** THE SYSTEM SHALL display LOGERx fiscal totals when matched.

**DD-SPD-05:** THE SYSTEM SHALL display a clear coverage state when LOGERx fiscal data is unmatched or unavailable.

---

## 11. Non-Goals

The revamp must not include:

- User accounts.
- Saved dashboards.
- Runtime data fetching.
- AI explanations or AI summaries.
- Recommendations.
- Lead scoring.
- Ranking entities by attractiveness.
- Automated outreach workflows.
- CRM integration.
- Editable user notes.
- PDF export in the initial implementation.

---

## 12. Implementation Task Breakdown

| ID | Task | Dependencies | Done When |
|---|---|---|---|
| DD-T-01 | Audit source workbooks and document available category/time-series fields | — | Source mapping notes exist |
| DD-T-02 | Add deep-dive source mapping config | DD-T-01 | Config maps raw fields to normalized fact keys |
| DD-T-03 | Add deep-dive TypeScript interfaces to `/lib/types.ts` | DD-T-02 | Types compile |
| DD-T-04 | Build EDR county fiscal fact parser | DD-T-02 | County fiscal facts emitted |
| DD-T-05 | Build EDR municipal fiscal fact parser | DD-T-02 | Municipal fiscal facts emitted |
| DD-T-06 | Expand ACS fact parser for demographic detail | DD-T-02 | ACS demographic facts emitted |
| DD-T-07 | Add EDR demographic parser if source is available | DD-T-01 | Population trend/projection facts emitted or gap documented |
| DD-T-08 | Build FLDOE AFR fact parser | DD-T-02 | School finance facts emitted |
| DD-T-09 | Build EDR education trend/projection parser | DD-T-02 | Enrollment facts emitted |
| DD-T-10 | Build DFS LOGERx matching parser | DD-T-02 | Special district finance facts emitted or coverage gaps logged |
| DD-T-11 | Build `/public/data/deep-dive/` entity JSON generator | DD-T-04 through DD-T-10 | Per-entity JSON exists |
| DD-T-12 | Add deep-dive data validation | DD-T-11 | Validation fails on broken source refs or missing gap entries |
| DD-T-13 | Add deep-dive data loaders | DD-T-11 | Loaders fetch static JSON |
| DD-T-14 | Build chart primitives | DD-T-03 | Bar, line, strip, source note, and table disclosure components exist |
| DD-T-15 | Build shared dashboard shell | DD-T-14 | Header, snapshot, source ledger, data gaps render |
| DD-T-16 | Build county dashboard sections | DD-T-15 | County page renders required charts |
| DD-T-17 | Build municipality dashboard sections | DD-T-15 | Municipality page renders required charts |
| DD-T-18 | Build school district dashboard sections | DD-T-15 | School page renders required charts |
| DD-T-19 | Build special district dashboard sections | DD-T-15 | Special district page renders required panels/charts |
| DD-T-20 | Add deep-dive route links across app | DD-T-16 through DD-T-19 | Explore, map, shortlist, compare link to route |
| DD-T-21 | Accessibility QA | DD-T-20 | Keyboard, text equivalents, and tables verified |
| DD-T-22 | Build/type-check verification | DD-T-21 | `npm run build` and `npm run type-check` pass |

---

## 13. Acceptance Criteria

1. Deep-dive pages are accessible by direct URL for all entities with generated detail files.
2. Existing explore indexes remain lightweight and backwards compatible.
3. No runtime API calls are introduced.
4. No AI/NLP/scoring/ranking/recommendation behavior is introduced.
5. Every chart shows source/year labels.
6. Every chart has a data table equivalent.
7. Every missing value is represented by a gap state.
8. County and municipality dashboards show fiscal composition when category-level EDR facts are available.
9. School district dashboards show enrollment and finance breakdowns when source facts are available.
10. Special district dashboards show registry/governance first and financial coverage status second.
11. The pipeline emits a coverage report for detail data.
12. `npm run build` passes.
13. `npm run type-check` passes.

---

## 14. Open Questions

1. Should deep-dive pages fully replace the existing `EntityDeepDiveModal`, or should the modal become a preview with a link to the page?
2. Which source workbooks can be reliably downloaded in CI, and which require manually staged files in `tmp/`?
3. Should fiscal dollars be shown as nominal source dollars only, or should the pipeline add inflation-adjusted optional views later?
4. How many historical years are consistently available for EDR county, EDR municipal, FLDOE AFR, and EDR education sources?
5. Should special district LOGERx matching be exact-ID only, or should it allow conservative name/county matching with a visible match-confidence field?
6. Should all deep-dive JSON files be generated individually, or should small entity types use bundled files for fewer static assets?

---

## 15. Reference Links

- Nielsen Norman Group: Dashboards, preattentive processing, and chart readability — https://www.nngroup.com/articles/dashboards-preattentive/
- Microsoft Power BI: Dashboard design best practices — https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips
- W3C WAI: Complex images and chart descriptions — https://www.w3.org/WAI/tutorials/images/complex/
- EDR County Revenues & Expenditures — https://edr.state.fl.us/Content/local-government/data/revenues-expenditures/stwidefiscal.cfm
- EDR Municipal Revenues & Expenditures — https://edr.state.fl.us/Content/local-government/data/revenues-expenditures/munifiscal.cfm
- EDR Population and Demographic Data — https://edr.state.fl.us/Content/population-demographics/data/index-floridaproducts.cfm
- EDR Area Profiles — https://edr.state.fl.us/Content/area-profiles/index.cfm
- Census ACS 5-Year — https://www.census.gov/data/developers/data-sets/acs-5year.html
- FLDOE Annual Financial Reports — https://www.fldoe.org/finance/fl-edu-finance-program-fefp/school-dis-annual-financial-reports-af.stml
- FLDOE PK-12 Data Publications — https://www.fldoe.org/accountability/data-sys/edu-info-accountability-services/pk-12-public-school-data-pubs-reports/
- FloridaCommerce Official List of Special Districts — https://www.floridajobs.org/community-planning-and-development/special-districts/special-district-accountability-program/official-list-of-special-districts
- DFS LOGERx Public Reports — https://logerx.myfloridacfo.gov/LogerX/PublicReportsMenu
