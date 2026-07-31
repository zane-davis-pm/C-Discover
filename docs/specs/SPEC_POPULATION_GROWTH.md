# C-Discover — Population Growth Rate Feature Specification

**Version:** 1.0
**Date:** 2026-07-27
**Status:** Ready for implementation
**Scope:** Pipeline (core, state-agnostic) + FL adapter + types/UI. CA adapter is a documented follow-up, not in scope here.

---

## 1. Goal

Add a population growth rate to counties and municipalities, and have school districts / special districts inherit their parent county's rate (per product decision — districts do not get their own population series). Surface it as:

1. A new pipeline-computed field, `population_growth_rate` (annualized %, CAGR), on `County` and `Municipality`.
2. A populated `population_trend: DeepDiveSeriesPoint[]` series in each entity's deep-dive demographics (this field already exists in `lib/types.ts` and is currently always shipped empty — see `DEMOGRAPHIC_GAP_FIELDS` in `build_deep_dive.js`).
3. School districts and special districts get `population_growth_rate` (copied from their parent county) but NOT their own `population_trend` series — they don't have population-linked geography.

No new runtime API calls, no new UI framework, no scoring/ranking language. This follows the existing core/adapter pipeline pattern exactly — no new architecture.

---

## 2. Data source

**Census Bureau Population Estimates Program (PEP)**, `pep/population` dataset, same `CENSUS_API_KEY` already required by `core/fetch_census_acs.js`. No new env var, no new credential.

Confirmed request shape (verified live against `api.census.gov`, only failure was "Missing Key," meaning the variable/geography names below are valid):

```
GET https://api.census.gov/data/{vintage}/pep/population?get=NAME,POP,DATE_CODE,DATE_DESC&for=county:*&in=state:{fips}&key={CENSUS_API_KEY}
GET https://api.census.gov/data/{vintage}/pep/population?get=NAME,POP,DATE_CODE,DATE_DESC&for=place:*&in=state:{fips}&key={CENSUS_API_KEY}
```

- `vintage`: use `2023` (latest vintage with a stable, fully-populated county+place time series as of this writing — vintage 2024/2025 place-level data was still rolling out incrementally per Census's own release notes, so pin to 2023 now and bump the vintage in one place later).
- `DATE_CODE` / `DATE_DESC`: PEP returns one row per (geography, year) pair for every year since the last decennial census. For vintage 2023 that's `DATE_CODE` 1–5, spanning `4/1/2020` (census base) through `7/1/2023`. Use the **smallest** `DATE_CODE` as the base year and the **largest** as the latest year — don't hardcode code values, since they shift by vintage.
- Compute CAGR: `((popLatest / popBase) ** (1 / yearsElapsed) - 1) * 100`, rounded to 2 decimals. `yearsElapsed` = latest year minus base year (use the calendar year embedded in `DATE_DESC`, e.g. "7/1/2023" → 2023; base "4/1/2020" → 2020, so ~3.25 actual years — round `yearsElapsed` to the nearest whole year for the exponent, do not use fractional years, to keep it consistent with how a firm would sanity-check it by hand).
- Also keep every intermediate (geography, year, population) point — that's what feeds `population_trend`.

---

## 3. New/changed files

### 3.1 `scripts/pipeline/core/fetch_population_estimates.js` (new file)

Mirror the structure of `core/fetch_census_acs.js` exactly (same hard-fail-on-missing-key pattern, same `tmp/{state}/` output convention, state-agnostic — must pass the `grep -rni "edr|fldoe|floridajobs|florida" scripts/pipeline/core/` gate).

```js
// Usage: CENSUS_API_KEY=... node core/fetch_population_estimates.js <state-code>
// Output: tmp/{state}/population_estimates.json
//   { counties: [{ fips2, name, series: [{year, population}], growth_rate }],
//     places:   [{ place_fips, name, series: [...], growth_rate }],
//     vintage: 2023, source: "PEP" }
```

Fetch both `for=county:*` and `for=place:*` (same `in=state:{config.fips}` pattern as ACS). Group rows by geography id, sort by `DATE_CODE` ascending, take first/last for the CAGR calc per §2, keep the full sorted series for the trend chart. `county` row key = the 3-digit county FIPS suffix (matches `acs.counties[].county` join key already used in `fetch_census_acs.js`); `place` row key = the same zero-padded place FIPS join key `build_entities.js` already constructs (`${config.fips}${row.place.padStart(5,"0")}`).

Write with `writeJSON` from `./lib/fsutil.js`, same as `fetch_census_acs.js`.

### 3.2 `scripts/pipeline/core/build_entities.js`

Load the new file alongside the existing ACS load in `main()`:

```js
const popEst = loadJSON(join(tmpDir(stateCode), "population_estimates.json"), { counties: [], places: [], vintage: null, source: null });
```

Pass `popEst` into `buildCounties`/`buildMunicipalities`. Add these fields to the county object (next to the existing `population`/`population_year`/`population_source` block, ~line 113-115):

```js
population_growth_rate: popCountyRow?.growth_rate ?? null,
population_growth_years: popCountyRow ? `${popCountyRow.series[0].year}-${popCountyRow.series.at(-1).year}` : null,
population_growth_source: popCountyRow ? popEst.source : null,
```

Same three fields on the municipality object (next to its existing population block, ~line 194-196), keyed by the place-fips lookup, mirroring the existing `acsByPlace` map pattern.

Add `population_growth_rate` to `UNIVERSAL_NULLABLE.counties` and `UNIVERSAL_NULLABLE.municipalities` (line 22-23) so a missing value gets a proper `data_gaps` entry instead of silently passing validation.

For school districts and special districts (`buildSchoolDistricts`/`buildSpecialDistricts`), after building each entity, look up its parent county by matching `sd.county` / `spd.county` (already-set field, string name match) against the counties array built earlier in `main()`, and copy:

```js
sd.population_growth_rate = parentCounty?.population_growth_rate ?? null;
sd.population_growth_source = parentCounty ? "derived_county" : null;
```

This requires passing the already-built `counties` array into `buildSchoolDistricts`/`buildSpecialDistricts` (both currently only take `intermediate`) — add it as a parameter. Add `population_growth_rate` to `UNIVERSAL_NULLABLE.school_districts` and `.special_districts` too.

### 3.3 `scripts/pipeline/core/build_deep_dive.js`

Remove `"population_trend"` from `DEMOGRAPHIC_GAP_FIELDS` (line 78) for counties and municipalities only — keep it in the gap list for school/special districts (they never get a trend series, only the inherited rate).

In `buildCountyDeepDive`/the municipality equivalent, populate `demographics.population_trend` from the raw per-year series carried on the entity (you'll need to either (a) keep the full series on the entity object as an internal-only field the deep-dive builder reads before deep-dive build, or (b) have `build_entities.js` also write `tmp/{state}/population_estimates.json`'s series through to a side file `build_deep_dive.js` re-reads directly — **prefer (b)**, since `build_deep_dive.js` already reads pre-built `public/data/{state}/*.json` plus its own fresh reads, not internal-only entity fields. Load `tmp/{state}/population_estimates.json` again inside `build_deep_dive.js` and look up by the same fips/place-fips key used for `sourceRef`).

Each `DeepDiveSeriesPoint`:

```js
{ year: point.year, value: point.population, unit: "count", source_id: "PEP" }
```

Register the source: `addSource(config, "PEP", { publicationYear: popEst.vintage })` wherever `population_source`/`PEP` growth data is used for that entity.

`population_projection` stays empty / in the gap list — out of scope (no projection data source integrated).

### 3.4 `lib/types.ts`

Add to `County` and `Municipality` interfaces (next to existing `population`/`population_year`/`population_source` fields, ~line 100-102):

```ts
population_growth_rate: number | null;   // annualized % CAGR
population_growth_years: string | null;  // e.g. "2020-2023"
population_growth_source: "PEP" | null;
```

Add to `SchoolDistrict` and `SpecialDistrict` interfaces:

```ts
population_growth_rate: number | null;
population_growth_source: "derived_county" | null;
```

Add `population_growth_rate` to `CountyFilters`/`MunicipalityFilters` as a `RangeFilter` (mirror the existing `population: RangeFilter` field, ~line 287/319) — **optional for MVP**, see §5.

No changes needed to `DeepDiveSeriesPoint`/`CountyDeepDiveDemographics` — those interfaces already exist and already support this exact shape.

### 3.5 `scripts/pipeline/states/fl/config.js`

Add to `sources` (next to `ACS_5YR`, ~line 176):

```js
PEP: {
  source_name: "Census Population Estimates Program",
  source_url: "https://www.census.gov/programs-surveys/popest.html",
},
```

Add to `source_versions` (~line 222):

```js
PEP: "Vintage 2023",
```

Add `"population_growth_rate"` to `schema.counties.optionalFields` and `schema.municipalities.optionalFields`, and `"population_growth_rate"` to `schema.school_districts.optionalFields` / `schema.special_districts.optionalFields` (config.js, per §3.2 above — these already have an `optionalFields` array to extend).

Add a `coverageRules` entry for `schema.counties` (counties don't currently have one — municipalities do, at line ~261) requiring `population_growth_rate` to hit e.g. 90%+ non-null, matching the existing municipality population coverage-rule pattern and the "pair every new optional field with a coverage rule" lesson already documented in `AGENTS.md`.

### 3.6 `scripts/pipeline/run_all.sh`

Add the new fetch step in the same position as `fetch_census_acs.js` (state adapters → `fetch_geo.js` → `fetch_census_acs.js` → **`fetch_population_estimates.js`** → `build_entities.js` → …). It can run in parallel with/right after `fetch_census_acs.js` since both only depend on `config.fips`, not on each other's output.

---

## 4. Validation

- Run `node scripts/pipeline/core/validate.js fl` (or the full `run_all.sh --state fl`) — must exit 0 with the new coverage rules passing.
- Run `grep -rni "edr|fldoe|floridajobs|florida" scripts/pipeline/core/` — must return nothing (the new `fetch_population_estimates.js` file must not reference FL by name).
- Run `npm run pipeline:snapshot-check` — this WILL report a diff (new fields = intended data change); confirm the diff is exactly the new fields before committing the new golden snapshot.
- Run `npx tsc --noEmit` — must be clean after the `lib/types.ts` changes.

---

## 5. UI — required, not a stretch goal

`population_growth_rate` must show up everywhere `population`/other numeric metrics already show up: table column, sort, sidebar filter, entity detail card, CSV export, and (counties/munis only) the deep-dive trend chart. Treat every item below as "mirror the existing `population` (or, for districts, an existing numeric column like `enrollment_pk12`) wiring, field for field" — same components, same helpers, no new patterns.

### 5.1 Deep dive trend chart (counties + municipalities only)

`components/deep-dive/DeepDiveDashboard.tsx`: render `dd.demographics.population_trend` through the existing `LineChart` component (`components/deep-dive/charts.tsx`, already built for historical-vs-projected series, currently unused for population) — place it near the existing `demographic_benchmarks` block (~line 296 for counties, ~line 392 for municipalities). Also render the computed `population_growth_rate` as a plain metric/fact (use the existing `metric()`/fact-row pattern already used for other summary stats in `build_deep_dive.js`'s output, formatted with `formatPercent`). Skip rendering entirely (fall back to the existing gap-state UI) when the series is empty — this is expected for school/special districts and for any state where the PEP fetch hasn't run yet.

### 5.2 Entity detail card (`lib/entity-fields.ts`)

Add a `population_growth_rate` row directly under the existing `population` row in the "Demographics" section, for **both** the county block (~line 111-117) and the municipality block (~line 191-196) — same `row(entity, key, label, value, formatter)` helper, formatter is `formatPercent` (already imported/used at line 130 for `pct_bachelors_plus`). Label it `"Population Growth Rate"` and show the backing years, e.g. `(v) => \`${formatPercent(v as number)} (${entity.population_growth_years ?? "—"})\``.

Add the same row (without the years suffix, since it's inherited) to the school-district and special-district field blocks in the same file, sourced from `sourceLabel(entity.population_growth_source)` (i.e. `"derived_county"`), so users see it's a county-level figure, not district-specific.

### 5.3 Explore table column + sort (all four entity types)

Add a `population_growth_rate` column to the table `columns` array in all four explore pages, immediately after the existing `population` column (counties: `app/[state]/explore/counties/page.tsx` ~line 74-86; municipalities: `app/[state]/explore/municipalities/page.tsx` ~line 104-116) or after the first numeric column for school/special districts (`app/[state]/explore/school-districts/page.tsx` ~line 88; `app/[state]/explore/special-districts/page.tsx` ~line 100, which currently has no numeric metric column at all — this will be its first sortable numeric column). Column shape mirrors `population` exactly:

```tsx
{
  key: "population_growth_rate",
  label: "Pop. Growth",
  sortKey: "population_growth_rate",
  align: "right",
  render: (c) => (
    <span className={c.population_growth_rate == null ? "text-gray-400 italic text-xs" : ""}>
      {nullOrVal(c.population_growth_rate, c, "population_growth_rate", formatPercent)}
    </span>
  ),
},
```

`nullOrVal` and `formatPercent` are already imported in every one of these pages (used for `pct_bachelors_plus`/similar). Sorting works for free once `sortKey` is set, IF `lib/filters.ts`'s sort comparator (`compareNullable`, already generic over any numeric field) is reachable for this key — confirm the per-entity-type `sortFieldOptions`/switch (wherever each page enumerates valid `sort` values, alongside `"population"`) includes `"population_growth_rate"`.

### 5.4 Sidebar filter (all four entity types)

Add a `FilterRangeSlider` for `population_growth_rate` in each explore page's `FilterPanel`, immediately after the existing `Population` slider (counties ~line 292-298; municipalities ~line 329-ish) or after the first existing slider for school/special districts. Mirror exactly:

```tsx
<FilterRangeSlider
  label="Population Growth Rate (%)"
  value={filters.population_growth_rate}
  onChange={(v) => updateFilters({ ...filters, population_growth_rate: v, page: 1 })}
/>
```

Backing changes required for this to type-check and persist in the URL:

- `lib/types.ts`: add `population_growth_rate: RangeFilter` to `CountyFilters`, `MunicipalityFilters`, `SchoolDistrictFilters`, and `SpecialDistrictFilters` (all four already have a `RangeFilter`-typed field to mirror, e.g. `population` at ~line 287/319).
- `lib/url-state.ts`: add `"population_growth_rate"` to each entity type's serialize field list (mirror `"population"` at ~lines 84, 183, 456), add `serializeRange(params, "growth_min", "growth_max", filters.population_growth_rate)` next to the existing `serializeRange(params, "pop_min", "pop_max", filters.population)` calls (~lines 103, 201), and add the matching `population_growth_rate: [parseNum(params.get("growth_min")), parseNum(params.get("growth_max"))]` parse block next to `population`'s (~lines 156-158, 252-254). New URL params: `?growth_min=` / `?growth_max=`, documented in `AGENTS.md`'s "URL state rules" list alongside `pop_min`/`pop_max`.
- `lib/filters.ts`: the existing `inRange`/`compareNullable` helpers are already generic — no new filter logic needed, just make sure each entity type's filter function applies `inRange(entity.population_growth_rate, filters.population_growth_rate)` alongside the existing `population` check.

### 5.5 CSV export (`lib/export.ts`)

Add `"Population Growth Rate (%)": numOrEmpty(s.population_growth_rate)` next to the existing `Population`/`Population Year` columns (~line 86-87), for county and municipality exports. Add the same (without a "Year" pair) to school/special district export rows.

### 5.6 Map metric option (counties + municipalities, stretch — not blocking)

`app/[state]/map/page.tsx` and `lib/choropleth.ts` already support a small enum of choropleth metrics (`population`, `median_hh_income`, `total_revenue`, `pct_bachelors_plus`, at map/page.tsx ~line 43). Adding `population_growth_rate` as a fifth choropleth option is a natural follow-up but is **not required** for this feature to ship — call it out as a stretch item, don't block on it.

---

## 6. Explicit non-goals

- No population projections (no data source integrated for this).
- No per-district (school/special) population trend chart — rate only, inherited from parent county.
- No CA adapter changes — CA onboarding follows the same pattern later via `docs/ONBOARDING_A_STATE.md`, not part of this spec.
- No change to `run_all.sh`'s `--all` semantics beyond adding the one new step.
- Map choropleth metric option (§5.6) is optional/follow-up, not required to ship.
