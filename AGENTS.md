# AGENTS.md — C-Discover

## What this repo is
A Next.js 14 static web app for multi-state public-sector market intelligence
(Phase 3, PROJECT_PLAN_MULTISTATE.md — Florida is the first state; the
architecture supports more). No backend, no auth, no AI features. All data is
pre-built JSON in /public/data/{state}/.

## Tech stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui primitives (Radix UI)
- react-leaflet for maps (SSR disabled — dynamic import only, never import Leaflet at top level)
- Zustand for shortlist state (persisted to localStorage)
- PapaParse for CSV export
- chroma-js for choropleth color scale calculation
- Node.js scripts in /scripts/pipeline/ for data pipeline

## Critical constraints
- NEVER add runtime API calls. All data comes from /public/data/{state}/*.json.
- NEVER add AI/NLP features. The tool is intentionally neutral.
- NEVER add scoring, ranking, or recommendations.
- ALL filter and sort state must be reflected in URL query params (see SPEC.md §7).
- ALL entity table rows must have data-entity-id="[id]" on the <tr> element.
- ALL shortlist buttons must have aria-label="Add [Name] to shortlist" or "Remove [Name] from shortlist".
- NEVER import 'leaflet' or 'react-leaflet' at the top level of a file — always inside a dynamic() import with ssr: false.
- **NEVER hardcode a state code (e.g. "fl") outside a config/defaults location.**
  The only sanctioned hardcode is `DEFAULT_STATE` in `lib/data.ts` (used for
  legacy, pre-multi-state redirect targets that predate any state segment in
  the URL). Every loader, route, and link must be parameterized by a `state`
  value that ultimately traces back to the `[state]` route param or the
  loaded `states.json` manifest — never a literal string in a component.
- `wyn_url` exists on every entity (nullable placeholder, D6 in
  PROJECT_PLAN_MULTISTATE.md) but must NEVER be rendered in the UI until the
  WYN URL scheme is confirmed.

## Multi-state architecture (Phase 3 — PROJECT_PLAN_MULTISTATE.md §3.2)
- **Data layout:** `/public/data/{state}/` (lowercase USPS code, e.g. `fl`).
  All entity JSON, geo JSON, metadata.json, and the deep-dive/ tree live
  under the state directory. `/public/data/states.json` (NOT namespaced) is
  the manifest — see below.
- **Manifest (`/public/data/states.json`):** `{ states: StateConfig[] }`
  where `StateConfig = { code, name, entity_types, map: { center, zoom },
  regions }` (types in `lib/types.ts`). `entity_types` drives which
  explore-tab/nav links render for that state (special districts are
  state-optional — see docs/states/SYNTHESIS.md). `map` and `regions`
  replace all hardcoded Florida map-bounds/region-list constants.
- **Loaders (`lib/data.ts`, `lib/deep-dive-data.ts`):** every loader takes a
  `state: string` argument and fetches from `/data/{state}/...`. There is
  also `loadStatesManifest()` / `loadStateConfig(state)` for the manifest
  itself (fetched from `/data/states.json`, no state prefix).
- **Routing:** `explore`, `map`, `compare`, `shortlist`, `workspaces` all
  live under `app/[state]/`. `app/[state]/layout.tsx` validates the `state`
  param against the manifest (server-side fs read of states.json) and
  redirects unknown codes to `DEFAULT_STATE`. Pre-multi-state routes
  (`/explore/*`, `/map`, `/compare`, `/shortlist`, `/workspaces/[id]`) still
  exist as thin client-side redirect shells (`components/nav/LegacyRedirect.tsx`)
  that forward to `/{DEFAULT_STATE}${pathname}` preserving all query params.
  `app/entity/[type]/[id]` (the deep-dive bookmark redirect, predates
  multi-state) always targets `DEFAULT_STATE`'s explore path — there is no
  way to recover a state from that old URL shape.
- **State selector:** `components/nav/StateSelector.tsx`, rendered by
  `TopNav` only when `states.json` has more than one state. With Florida as
  the only state, it never mounts — single-state UX is visually unchanged.
  `lib/state-context.ts` (`useCurrentState()`) derives the current state
  client-side for nav components that live outside the `[state]` segment
  and can't receive `params.state` directly.
- **Shortlist/compare scoping:** `lib/shortlist.ts` and `lib/compare.ts`
  key membership/selection by `(state, id)`, not just `id`, so an entity id
  from one state can never register as already-selected in another state's
  view. `ShortlistSnapshot.state` and `AnyEntity.state` carry the state code
  through to every call site.

## Data files (read-only at runtime, per state)
- /public/data/{state}/counties.json         — County[]
- /public/data/{state}/municipalities.json   — Municipality[]
- /public/data/{state}/school-districts.json — SchoolDistrict[]
- /public/data/{state}/special-districts.json — SpecialDistrict[]
- /public/data/{state}/counties.geo.json     — GeoJSON FeatureCollection (county polygons)
- /public/data/{state}/municipalities.geo.json — GeoJSON FeatureCollection (muni polygons)
- /public/data/{state}/metadata.json         — { last_pipeline_run: string, source_versions: Record<string, string> }
- /public/data/{state}/deep-dive/{counties,municipalities,school-districts,special-districts}/{id}.json — AnyDeepDive (chart-rich detail; see below)
- /public/data/{state}/deep-dive/index.json  — DeepDiveIndex (coverage report)
- /public/data/states.json — StatesManifest (NOT namespaced — this is the manifest that defines the namespaces)

## Deep dive (card → full-screen overlay, not a separate page)
There are two detail layers, not three (see PROJECT_PLAN_MULTISTATE.md Phase 1.4/1.5):
`EntityDetailModal` (card: essentials only) → **Deep Dive** button → `EntityDeepDiveModal`
(full-screen overlay) which loads `AnyDeepDive` via `loadDeepDive()` and renders it with
`DeepDiveDashboard` (components/deep-dive/DeepDiveDashboard.tsx). `app/entity/[type]/[id]`
is a redirect-only route kept for old bookmarks — do not add new links to it.
Deep-dive JSON is built by `scripts/pipeline/core/build_deep_dive.js`, which runs after
`core/validate.js` in `run_all.sh`, reading the already-built
counties/municipalities/school-districts/special-districts.json.
Peer-distribution benchmarks (bullet/strip charts, `DistributionStrip` in
components/deep-dive/charts.tsx) are always computed at pipeline time in `build_deep_dive.js` and
shipped pre-computed — never compute peer statistics at runtime in a component.

## Types
All TypeScript interfaces are in /lib/types.ts. Do not redefine them inline.

## Key lib files
- /lib/types.ts         — all entity, filter-state, and state-manifest interfaces
- /lib/data.ts          — typed data loaders (fetch from /public/data/{state}/), DEFAULT_STATE constant
- /lib/deep-dive-data.ts — deep-dive loaders (fetch from /public/data/{state}/deep-dive/)
- /lib/state-context.ts — client-side useCurrentState()/useStatesManifest() for nav components
- /lib/entity-type-meta.ts — entityTypeExplorePath(state, type) and related segment maps
- /lib/filters.ts       — pure filter functions for each entity type
- /lib/url-state.ts     — serialize/deserialize URL params ↔ filter state
- /lib/shortlist.ts     — Zustand store (add/remove/clear/has, localStorage persisted, state-scoped)
- /lib/compare.ts       — Zustand store for compare selections (state-scoped)
- /lib/export.ts        — CSV generation with PapaParse
- /lib/choropleth.ts    — quantile color scale for map
- /lib/utils.ts         — cn() utility

## URL state rules (see SPEC.md §7)
- Path prefix: every explore/map/compare/shortlist/workspaces URL is
  prefixed with the state code, e.g. `/fl/explore/counties`,
  `/fl/map?metric=total_revenue`. Pre-multi-state (prefix-less) URLs
  redirect client-side to `/{DEFAULT_STATE}${originalPath}`, preserving
  every query param below unchanged.
- Text search: ?q=
- Regions: ?region=Northwest,Southeast  (comma-separated)
- County filter: ?county=Miami-Dade,Broward
- Range filters: ?pop_min=100000&pop_max=500000 (omit param if null/at data boundary)
- Sort: ?sort=population&dir=desc (omit if default)
- Pagination: ?page=2 (omit if page=1)
- Map metric: ?metric=median_hh_income
- Map muni layer: ?layer=municipalities

## Running the pipeline (Phase 3 Part B — core/adapter architecture)

```
scripts/pipeline/
  core/                  # state-agnostic — must never reference a specific
                          # state, source, or agency name (enforced by grep,
                          # see "Hard-fail contract" below)
    fetch_geo.js          # county + municipality boundaries (Esri + TIGERweb;
                          # both are national, parameterized by config.fips)
    fetch_census_acs.js   # Census ACS 5-year demographics + place→county spatial join
    build_entities.js     # consumes the intermediate format -> public/data/{state}/*.json
    validate.js            # schema-driven, hard-fail (see below)
    build_deep_dive.js    # deep-dive detail JSON + Phase 2 peer benchmarks
    lib/                  # shared helpers: paths, fsutil, hardfail, state-loader
    lib/intermediate-format.md  # the adapter <-> core contract, read this first
  states/
    fl/                   # the reference adapter state
      config.js           # FIPS, regions, schema bounds, source catalog, reference tables
      adapters/            # counties.js / municipalities.js / school_districts.js /
                          # special_districts.js — state-specific fiscal/registry
                          # data, emit tmp/{state}/*.intermediate.json
      contacts/            # website/procurement_url seed application (post-build patch)
      seeds/               # curated seed JSON (contact directories, special-district sample)
  run_all.sh             # --state <code> | --all
```

**Run it:** `bash scripts/pipeline/run_all.sh --state fl` (equivalently `npm run pipeline:run`).
`--all` runs every state listed in `public/data/states.json` (equivalently `npm run pipeline:run:all`).
Order per state: state adapters -> `core/fetch_geo.js` -> `core/fetch_census_acs.js`
(reads the geo files the previous step just wrote for its place→county join) ->
`core/build_entities.js` -> state contact-application scripts -> `core/validate.js` ->
`core/build_deep_dive.js` -> per-state `metadata.json` update.

**Intermediate format:** state adapters never write directly into `public/data/`.
They emit `tmp/{state}/*.intermediate.json` (see `core/lib/intermediate-format.md`
for the full per-entity-type schema and join-key rules) and `core/build_entities.js`
is the only thing that turns that, plus core's own ACS/geo fetch output, into the
final entity files.

**Hard-fail contract (Phase 5 design goal — loud, early, specific failures):**
- Missing `CENSUS_API_KEY` stops `core/fetch_census_acs.js` immediately with a
  named-variable error; there is no more silent fallback to seed demographic
  data (see "Known incident" below).
- `core/validate.js` is schema-driven off each state's `config.schema`
  (universal required fields, state-optional fields, row-count bounds,
  required-non-null fields, coverage thresholds, valid-value sets, and a
  numeric-type check) and prints the offending **file, field, and entity id**
  before exiting non-zero on any violation.
- `core/*.js` must never reference a specific state, agency, or source by
  name — enforced by `grep -rni "edr|fldoe|floridajobs|florida" scripts/pipeline/core/`
  returning nothing (this exact grep is the Part B merge gate's requirement #3;
  run it after touching anything in `core/`).

**Adding a state:** see `docs/ONBOARDING_A_STATE.md` (skeleton; full doc lands in Phase 6).

**Known incident (why the hard-fail contract exists):** a missing
`CENSUS_API_KEY` used to make `03_fetch_census_acs.js` (now retired) silently
fall back to seed county data and an *empty* places array — `municipalities.json`
would build with population/income = null for every row, with no non-zero
exit code anywhere in the pipeline. That failure mode is why `run_all.sh`
sources `.env.local` automatically but no longer tries to limp along without
the key.

## Golden snapshot regression gate (PROJECT_PLAN_MULTISTATE.md Phase 1.9)
After any pipeline change — especially the Phase 3 core/adapter refactor — run:
node scripts/pipeline/check_snapshot.js   (or: npm run pipeline:snapshot-check)
This diffs the regenerated /public/data against the last git-committed version,
field by field, ignoring known-volatile timestamp fields (last_updated, generated_at,
retrieved_at, last_pipeline_run) and a small float tolerance. A clean run means the
change reproduced the data bit-for-bit; any reported diff needs an explicit "this is
an intended data change" check before the new output is committed as the next
golden snapshot. Requires git history to diff against (exits 2, not a failure, if run
outside a git checkout or before any snapshot has ever been committed).

## Dev server
npm run dev

## Build
npm run build

## Type check
npx tsc --noEmit

## Known Phase 3 Part A limitation — RESOLVED in Phase 4 (CA onboarding PR 1)
`FloridaRegion` (lib/types.ts) was a Florida-specific literal union type used
for `County.region`/`Municipality`/etc. filter typing and `url-state.ts` enum
validation. UI region *options* were always correctly sourced from the loaded
`StateConfig.regions` (config-driven), but the underlying TypeScript type
wasn't regenericized to `string`, and — the part that wasn't just a type
nicety — `url-state.ts`'s `paramsToCountyFilters`/`paramsToMunicipalityFilters`
/`paramsToSchoolDistrictFilters`/`paramsToSpecialDistrictFilters` validated
the `?region=` URL param against the hardcoded `FLORIDA_REGIONS` array with
no way to pass a different state's regions in. California onboarding (Phase
4, PR 1: counties) hit exactly this the moment `region` values like "Bay
Area" existed: **fixed** —
- `lib/types.ts`: `County.region`, `CountyDeepDive.region`, and
  `{County,Municipality,SchoolDistrict,SpecialDistrict}Filters.regions` are
  now `string`/`string[]`. `fiscal_source` on all four entity types widened
  from a Florida-only source-id literal (e.g. `"EDR_COUNTY"`) to `string |
  null`. `FloridaRegion`/`FLORIDA_REGIONS` are kept (still valid, just no
  longer used to type multi-state fields) as the *default* parameter value
  described next.
- `lib/url-state.ts`: all four `paramsToXFilters(params, validRegions =
  FLORIDA_REGIONS)` now take an optional second argument — the current
  state's `StateConfig.regions` — instead of hardcoding `FLORIDA_REGIONS`.
  Every explore page passes `stateConfig?.regions` and re-parses when
  `stateConfig` finishes loading (added to that effect's dependency array).
  Omitting the argument still defaults to Florida's list, so this is
  backward compatible for any caller that hasn't been updated.
- `lib/data.ts`'s `buildCountyRegionMap` and `lib/filters.ts`'s
  `countyToRegion` parameter, plus the `Record<string, FloridaRegion>` state
  in the municipalities/school-districts/special-districts explore pages,
  widened to `Record<string, string>` to match.
- Verified via `npm run type-check` (clean) — a full `npm run build` could
  not run to completion in this sandbox (same per-command time-limit issue
  Phase 3's v2.3 changelog entry documented; background processes are also
  killed when the sandboxed shell call that spawned them exits, so it can't
  be worked around by backgrounding). Zane confirmed `npm run build` passes
  locally before this Phase 4 work started; re-verify locally after this
  change too given the scope of the lib/types.ts edit.

## CA onboarding PR 2-4 notes (municipalities, school districts, special districts)

All four CA entity types now build and validate clean. Three gotchas worth
knowing before touching these adapters again:

- **`Object.keys()` on a FIPS-code-keyed object is not alphabetical order,
  even though the object literal is written alphabetically.** Plain JS
  objects reorder any key that parses as a canonical non-negative integer
  string (no leading zero) to the front, in ascending numeric order, ahead
  of all other string keys — regardless of insertion order. `COUNTY_NAMES`
  in `states/ca/config.js` has keys `"001"`..`"115"`; the ones ≥100
  (`"101"`–`"115"`) have no leading zero and get silently hoisted to the
  front of `Object.keys(COUNTY_NAMES)`. `states/ca/adapters/school_districts.js`
  originally zipped CDE's 1-58 county-code sequence against
  `Object.keys(COUNTY_NAMES)`'s iteration order and got Los Angeles Unified
  mapped to Glenn County before this was caught. Fix: sort
  `Object.entries(COUNTY_NAMES)` by the *value* (county name) when you need
  a stable alphabetical position — never rely on plain-object key iteration
  order for anything position-sensitive, in this codebase or generally.
- **SCO ByTheNumbers datasets that look like a matched revenue/expenditure
  pair don't always share a column schema.** County and City
  Revenues/Expenditures do (`entity_name`/`fiscal_year`/`values` on both
  sides of each pair). Special Districts does not: Revenues uses
  `entity_name`/`fiscal_year`/`district_type`/`value` (singular); the field
  names Cities also used, `values` (plural), are county-only. Expenditures
  uses `entityname`/`fiscalyear`/`districttype2` (no underscores, "2"
  suffix) — different enough that copy-pasting a working query from one
  dataset to its "matching" pair will silently return zero rows or a SoQL
  column error. Always verify column names live (`?$limit=1`) against the
  *specific* dataset id before writing a new SCO adapter, never assume
  symmetry from a sibling dataset.
- **CDE's SACS Access DB doesn't need `mdbtools`.** Its self-extracting
  `.exe` is a ZIP-format SFX despite the extension (`unzip` reads it
  directly), and the pure-JS npm package `mdb-reader` (added as a
  devDependency) parses the extracted `.mdb` with no native/system
  dependency. It's slow at this file's scale (~1.6M rows in the `UserGL`
  table) — `Table.getData()`'s cost scales with its own `rowLimit`, not the
  `rowOffset`, so chunking by `rowOffset`/`rowLimit` is safe and cheap to
  resume if you're re-running the ETL somewhere with a tight per-command
  time limit. See `states/ca/seeds/_finalize_reference.js` for the full,
  documented, re-runnable procedure (also covers the revenue/expenditure
  SACS object-code ranges and why ADA — not headcount — is the
  `enrollment_fte` source for California).

**Verification note:** `check_snapshot.js` passed clean through CA PR 3 but
could not complete in this sandbox after PR 4 added ~4,750 more files (the
per-file `git show` diffing exceeds the sandbox's per-command time limit at
that file count) — re-run `npm run pipeline:snapshot-check` locally. Same
for `npm run build`, consistent with every other Phase 3/4 changelog entry's
sandbox-timeout note above.

## CA onboarding PR 3.1 note (school district PK-12 headcount enrollment)

`enrollment_pk12` shipped `null` for all 937 CA school districts from PR 3
through this follow-up — worth understanding why before touching CA
enrollment fields again:

- **ADA and PK-12 headcount enrollment are two different CDE datasets, not
  two names for the same number.** SACS (`states/ca/seeds/_finalize_reference.js`)
  is a *finance* dataset; it carries `K12ADA` (Average Daily Attendance)
  only because ADA drives LCFF funding, not because SACS tracks enrollment.
  True headcount enrollment is CDE's separate Census Day / CALPADS Fall 1
  collection (`cde.ca.gov/ds/ad/filesenrcensus.asp`). Don't assume a
  state's SACS-equivalent finance dataset also covers enrollment — check
  Phase 0-style before assuming a field is "done."
- **A field with no `coverageRule` can silently ship 100% null and still
  pass validation.** `enrollment_pk12` was listed in
  `schema.school_districts.optionalFields` but had no matching entry in
  `coverageRules` — `optionalFields` alone only suppresses the "null with
  no `data_gaps` entry" failure, it does not check the *rate* of nulls the
  way `coverageRules` does. This is the same class of silent-regression
  risk the CENSUS_API_KEY incident documents elsewhere in this file. When
  adding a new optional field that's expected to be populated most of the
  time, add a `coverageRules` entry too, not just `optionalFields`.
- **A shared `enrollment_source` field can't fully describe two
  differently-sourced enrollment metrics.** `enrollment_fte` (ADA, from
  SACS) and `enrollment_pk12` (headcount, from CALPADS) now come from two
  different CDE sources for the same district, but `SchoolDistrict` has one
  `enrollment_source` field. It's set to the headcount source
  (`CDE_CALPADS_ENR`) whenever headcount is available, matching the field's
  literal meaning and FL's convention — but this makes the FTE metric's
  displayed source citation in the deep-dive UI technically imprecise for
  the 931 districts that have both values (still correct for the 6
  ADA-only districts). Not fixed here; would need a second
  `enrollment_fte_source` field, out of scope for closing the headcount
  gap. Flagged for Zane in the PROJECT_PLAN_MULTISTATE.md v2.7 entry.
- **An unregistered `source_id` silently renders with an empty citation,
  not an error.** `build_deep_dive.js`'s `sourceRef()` falls back to
  `{ source_name: sourceId, source_url: "" }` for any id not in
  `config.sources` — `"CDE_SACS_ADA"` had been used as a `source_id` since
  PR 3 without ever being registered there, so every CA district's
  deep-dive page cited it with a blank name/URL. Caught and fixed
  alongside this PR; worth grepping `config.sources` against every
  string literal used as an `enrollment_source`/`fiscal_source` value
  when auditing a state's citations.
- **`defaultSources` key names must match what `build_deep_dive.js` (a
  state-agnostic core file) actually reads**, not whatever a state's PR
  author names them. `states/ca/config.js` had `schoolDistrictFiscal`
  where `build_deep_dive.js` reads `config.defaultSources.schoolFiscal`
  (matching FL's key name) — the lookup silently resolved to `undefined`
  for CA rather than erroring. Renamed to match FL; also added the
  previously-missing `schoolEnrollment` key. When adding a new state,
  copy FL's `defaultSources` key names exactly rather than inventing
  parallel ones, even if a different name reads more naturally for that
  state's source.

See `states/ca/seeds/_finalize_enrollment.js` for the full ETL methodology
and the reproducible regeneration procedure for future academic years.

## Disposable scripts
`scripts/migrate_data_layout.js` — one-off Phase 3 Part A migration script
that moved the pre-multi-state flat `/public/data/*` layout into
`/public/data/fl/*` and backfilled `state`/`wyn_url` onto existing records.
Already run once; kept for history/reference only. Do not run again and do
not add it to any regular pipeline invocation — Part B's adapter pipeline
is the real source of this layout going forward.

## File to read first
`docs/specs/SPEC.md` — full technical specification, all requirement IDs (G-01, EC-01…), and the complete task breakdown.

## Documentation map
Docs referenced by name throughout this file and in code comments (e.g. "SPEC.md §7") live under `docs/`:

- `docs/specs/` — SPEC.md, SPEC_V2.md, SPEC_V3.md, SPEC_DEEP_DIVE_DASHBOARD.md
- `docs/planning/` — PROJECT_PLAN_MULTISTATE.md, MIGRATION_PLAN.md, PROD_READINESS_PLAN.md, SONNET_PHASE3_PROMPTS.md
- `docs/product/` — overview, constitution, data sources, JTBD/PR-FAQ/MoSCoW, strategic plan, UX recommendations
- `docs/ONBOARDING_A_STATE.md` and `docs/states/` — state onboarding guide and per-state research
