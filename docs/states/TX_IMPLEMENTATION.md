# Texas Implementation Plan (agent-executable)

**Date:** 2026-07-26. Supersedes the decision sections of `TX_PLAN.md` —
all decisions below are made and confirmed by Zane. Background:
`docs/states/TX.md` (scouting), `docs/states/SYNTHESIS.md`,
`docs/ONBOARDING_A_STATE.md` (the general runbook — read it first).
Reference implementations: `scripts/pipeline/states/fl/` (reference shape),
`scripts/pipeline/states/ca/` (second-state precedent, closest analog).

## Locked decisions — do not relitigate

1. **County + municipality financials come from the Census Bureau's 2022
   Census of Governments (CoG), Finance component, individual-unit files.**
   FY2022 vintage is accepted. Set `fiscal_year: 2022` on every
   county/municipality record. No per-entity ACFR downloads, ever.
2. **School district financials come from TEA's Summarized PEIMS Actual
   Financial Data workbook** (fall back to the raw PEIMS single-file CSV
   only if a required field is missing from the summarized workbook).
   ISDs only — **exclude open-enrollment charter schools.**
3. **Special districts ship registry-first** from SPDPID
   (data.texas.gov Socrata dataset `vtc6-p2xa`):
   `total_revenue`/`total_expenditure` stay null with a data-gap reason.
   Do not use SPDPID gross receipts as revenue. Do not integrate TCEQ.
4. **Contacts/procurement URLs are deferred** — not part of this work.
   Do not add `website` to `requiredNonNull` anywhere.
5. **Regions: the 7 standard Texas travel regions** (Panhandle Plains,
   Prairies & Lakes, Piney Woods, Gulf Coast, South Texas Plains,
   Hill Country, Big Bend Country).
6. Land the work as **4 sequential PRs** (counties → municipalities →
   school districts → special districts), CA-style: `entity_types` and
   `schema` in config only ever list types whose adapter exists in that PR.

## Global rules (from AGENTS.md / ONBOARDING_A_STATE.md — enforced)

- Nothing Texas-specific may touch `scripts/pipeline/core/`, `lib/`,
  `app/`, or `components/`. If a core change seems needed, it must be
  state-agnostic; expect none.
- Adapters emit `tmp/tx/{entity_type}.intermediate.json` conforming to
  `scripts/pipeline/core/lib/intermediate-format.md`. Each adapter runs
  standalone: `node scripts/pipeline/states/tx/adapters/<file>.js`.
- No references to any other state's sources inside `states/tx/`.
- `source_versions` are static strings (e.g. `"CoG FY2022, published 2024"`)
  — never computed timestamps.
- Manual-download sources get checked-in seed files under
  `states/tx/seeds/`, not giant literals in adapter code.

---

## PR 0 (part of PR 1): `states/tx/config.js` scaffold

Copy `states/ca/config.js`'s structure, including the header-comment PR
log convention. Contents:

- `code: "tx"`, `name: "Texas"`, `fips: "48"`.
- `map: { center: [31.0, -99.3], zoom: 6 }` (verify visually on first
  UI render; adjust so the whole state fits).
- `regions`: the 7 travel regions (decision #5).
- `REGION_MAP`: all 254 counties, fips3 → region. Build from the standard
  Texas Travel Region county assignments (Texas tourism/Travel Texas
  groupings). Every value must appear in `regions`.
- `COUNTY_NAMES`: all 254, from Census `national_county2020.txt`
  (COUNTYNAME with " County" stripped).
- `geo.countySuffixStrip`: `/ County$/`.
- `sources`: at minimum `census_cog_2022`, `tea_peims_summarized`,
  `spdpid`, plus the ACS/TIGER ids following FL/CA naming conventions.
  Each with human-readable name + URL.
- `source_versions`: static vintage strings per source.
- `defaultSources`: cosmetic fallback labels per category.
- `entity_types` and `schema`: grow per PR as specified below.

---

## PR 1 — Counties (254)

**Adapter:** `states/tx/adapters/counties.js`, exports
`buildCountyRegistry()`.

**Fiscal source:** CoG 2022 individual-unit finance file.
- Get it from the Census "State & Local Government Finance" public-use
  datasets (2022 survey year = full census). The download is a ZIP of
  fixed-format/CSV files plus documentation mapping **item codes** to
  amounts per government unit.
- If the file requires a manual browser download, check it in under
  `states/tx/seeds/` (it's aggregated, so this is acceptable); if a
  stable direct URL exists, fetch it in the adapter.
- Filter to state code TX (Census state code 44 in gov-finance ID
  schemes — verify against the file's own documentation, do not assume
  FIPS 48) and unit type = county.
- Roll up item codes to: `total_revenue` (Total Revenue aggregate),
  `total_expenditure` (Total Expenditure aggregate),
  `property_tax_revenue` (item code T01). Read the file's technical
  documentation for the exact aggregate definitions; document the chosen
  code list in the adapter header (CA's SACS adapter is the precedent for
  a methodology writeup in the header comment).
- `fiscal_year: 2022`, `fiscal_source: "census_cog_2022"`.

**Join:** CoG unit IDs are Census government IDs, not FIPS. For counties,
join on normalized county name → `COUNTY_NAMES` → 3-digit FIPS
(`join_key`). All 254 must resolve; fail loudly on any miss.

**Other fields:** `county_seat` from a checked-in reference seed
(Census/TAC list, `states/tx/seeds/county_seats.json`); `area_sq_miles`
null (core geo fills), `website`/`procurement_url` null (decision #4).

**Config in this PR:** `entity_types: ["county"]`;
`schema.counties`: `expectedCount: 254`;
`requiredNonNull`: name/region only (not website);
`coverageRules`: population ≥ 100%, total_revenue ≥ 95%
(CoG is nominally complete; a few imputed/nonrespondent units may be
missing — if actual coverage is lower, investigate before loosening);
`validRegions`: the 7 regions.

**Verify (every PR repeats this block):**
1. `node scripts/pipeline/states/tx/adapters/counties.js` standalone.
2. `bash scripts/pipeline/run_all.sh --state tx` clean.
3. `node scripts/pipeline/core/validate.js tx` — zero errors.
4. Spot-check ≥5 counties (include Harris, Dallas, and one tiny county)
   against their published ACFR figures — CoG numbers should be same
   order of magnitude; note comparison results in the PR description.
5. `grep -rniE "comptroller|texas|tea\.|spdpid" scripts/pipeline/core/`
   returns nothing.
6. `npm run build` clean, no changes outside `scripts/pipeline/states/tx/`
   + `public/data/states.json` + docs.

**Also in PR 1:** add TX to `public/data/states.json` with
`entity_types: ["county"]`, map, and the 7 regions (keep this file's
entity_types in sync with config as later PRs land).

---

## PR 2 — Municipalities (~1,220)

**Adapter:** `states/tx/adapters/municipalities.js`, exports
`buildMunicipalityRegistry()`. Same CoG source/rollup as PR 1, unit
type = municipality.

**Join (the hard part of this PR):**
- Preferred: crosswalk CoG government ID → Census place FIPS using the
  Census Governments Integrated Directory / government-units reference
  file if it carries place FIPS.
- Fallback (expected for at least some units): the documented
  `name_match_key` mechanism from `core/lib/intermediate-format.md` —
  set `join_key` = normalized name and let core match against TIGERweb
  places, exactly like `states/fl/adapters/municipalities.js`. Normalize
  consistently ("City of X" → "X", punctuation, casing). Log every
  unmatched unit; a small unmatched tail (<2%) is acceptable and becomes
  data gaps, but list them in the PR description.
- Watch duplicates: identical city names in different counties — use the
  CoG record's county to disambiguate.

**`entity_subtype`:** map from TIGER/Census class or the entity's legal
name ("city" / "town" / "village"; default "other"). Do not invent
subtypes; the union already supports these.

**Config:** add `"municipality"`; `schema.municipalities`:
`minCount: 1150`, `maxCount: 1300`; coverageRules: population ≥ 95%,
total_revenue ≥ 90%.

Verify block as PR 1 (spot-check Houston, San Antonio, one village).

---

## PR 3 — School districts (~1,020 ISDs)

**Adapter:** `states/tx/adapters/school_districts.js`, exports
`buildSchoolDistrictRegistry()`.

**Fiscal source:** TEA "Summarized PEIMS Actual Financial Data" .xlsx
(2008-09 through 2024-25) from TEA's PEIMS Financial Data Downloads page.
Manual download → seed file `states/tx/seeds/peims_actuals_fy2025.xlsx`
(or the latest year available). Use the most recent year;
`fiscal_year: 2025` (or matching), `fiscal_source: "tea_peims_summarized"`.
- Take per-district total revenue and total expenditure from the
  summarized columns. If `property_tax_revenue`-equivalent or another
  required field is absent, escalate before reaching for the 985k-row raw
  CSV — confirm the field is actually needed first.
- **Filter to ISDs only** (exclude charters — TEA district type field
  distinguishes them). Document the filter in the adapter header.

**Join/IDs:** `join_key` = TEA 6-digit county-district number (stable,
adapter-defined — CA CDS-code precedent; TX districts are
many-per-county so the FL county-FIPS scheme does not apply).
`nces_id` via the NCES CCD district crosswalk (bulk file; seed if manual).

**Enrollment:** TEA fall enrollment (PEIMS snapshot) as
`enrollment_pk12`; if only via manual report export, seed it and apply in
a `_finalize_enrollment.js` step (CA precedent, including the PR 3.1
follow-up pattern if it slips). `enrollment_fte` may stay null.
`expenditure_per_fte`: compute only if FTE/ADA is available; else null.
`superintendent_name`: null (defer with contacts).

**Config:** add `"school_district"`; `schema.school_districts`:
`minCount: 990`, `maxCount: 1060`; total_revenue coverage ≥ 99%
(PEIMS reporting is mandatory).

Verify block; cross-check ≥5 districts against NCES F-33 totals
(same order of magnitude; F-33 is a different vintage, exact match not
expected).

---

## PR 4 — Special districts (registry-only)

**Adapter:** `states/tx/adapters/special_districts.js`, exports
`buildSpecialDistrictRegistry()`.

**Source:** Socrata API, live fetch (no seed):
`https://data.texas.gov/resource/vtc6-p2xa.json` with `$limit` paging.
Inspect actual column names from the API before coding the parser.

**Fields:** `join_key` = Texas Taxpayer ID (verify uniqueness in-adapter;
fail loudly on duplicates). Name, website, purpose/entity type from the
dataset. `total_revenue`/`total_expenditure`: **always null**, with
`gapReasons` set to something like `"registry_self_reported_no_financials"`
via config. Do not map gross receipts/debt/cash into any revenue field.

**Config:** add `"special_district"`; `schema.special_districts`:
loose `minCount` (set from observed count minus safety margin — SPDPID
only includes districts over the $250k/bond threshold, so document that
the count is a floor, not the universe); `validPurposes` built from the
dataset's entity-type vocabulary; `gapReasons` for the financial fields.

Verify block. Note: SPDPID is continuously updated, so counts drift
between runs — that's why min/max, never expectedCount.

---

## Done means

- All 4 entity types render for TX in the UI with the state selector
  (no `lib/`/`app/`/`components/` changes).
- `validate.js tx` zero errors; snapshot diff between two consecutive
  runs on the same inputs is empty (no nondeterminism — the
  `source_versions` timestamp bug class).
- Spot-check notes recorded in each PR description.
- Update `docs/states/TX_PLAN.md` status header to point here, and add a
  short publish-calendar note (PEIMS ~1yr lag, annual; CoG next FY2027
  published ~2029; SPDPID continuous; ACS annual) for the future Phase 6
  refresh runbook.

**Status: all 4 PRs shipped (2026-07-27).** Counties (254), municipalities
(1,199 CoG-joined + 29 TIGER-only = 1,228 total), school districts (1,020
ISDs), special districts (2,869, registry-only) all build and validate
clean via `bash scripts/pipeline/run_all.sh --state tx` (run phase-by-phase
in this session; each phase — adapters, `fetch_geo`, `fetch_census_acs`,
`build_entities`, `validate`, `build_deep_dive`, metadata — completed with
zero errors) and `node scripts/pipeline/core/validate.js tx` reports
"✅ All validation checks passed for Texas." `docs/states/TX_PLAN.md`'s
status header and publish-calendar table are updated. `npm run build` was
attempted but could not be confirmed complete within this session's tooling
(no persistent long-running background process available) — no `app/`,
`lib/`, or `components/` files were touched by PR 4, so this is a
low-risk gap; re-run `npm run build` locally before deploying if you want
that final confirmation.
