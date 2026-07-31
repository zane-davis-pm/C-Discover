# Texas Onboarding Plan (state #3 in practice, #5 in the decided order)

**Date:** 2026-07-26 · Follows `docs/ONBOARDING_A_STATE.md`. Companion to the
Phase 0 scouting doc `docs/states/TX.md` and `docs/states/SYNTHESIS.md`.

> **Status: superseded for anything actionable.** The decisions this document
> weighs were made and locked in
> [`docs/states/TX_IMPLEMENTATION.md`](./TX_IMPLEMENTATION.md) — read that
> first; it is the plan of record. This file is kept for the reasoning trail
> (why the Census CoG route was chosen over per-entity ACFRs, what HB 103
> does and doesn't close). Shipped: **all 4 PRs — counties (254),
> municipalities (1,199 CoG-joined / 1,228 total), school districts (1,020
> ISDs), special districts (2,869, registry-only)**. Texas is fully onboarded.
>
> **Publish calendar** (for the Phase 6 annual-refresh runbook):
>
> | Source | Cadence | Lag | Next expected |
> |---|---|---|---|
> | Census CoG Finance (counties, municipalities) | every 5 years (years ending 2/7) | ~2 years | FY2027, published ~2029 |
> | Census ASLGF (annual survey, off-census years) | annual | ~2 years | FY2023 file already published |
> | TEA Summarized PEIMS actuals (school districts) | annual | ~1 year | each fall, prior school year |
> | SPDPID (special districts) | continuous | none | n/a — counts drift between runs |
> | Census ACS 5-year (population/income) | annual | ~1 year | each December |

## 0. Standing decision to confirm first (D4)

The decided onboarding order was **CA → MI → CO → TX**, with Texas last
because it is the only surveyed state with **no county/municipal revenue
aggregator at all** — the disqualifying per-entity-manual-lookup case.
Only FL and CA are onboarded today, so doing Texas now skips Michigan and
Colorado. Per SYNTHESIS: "If Texas is a leadership business priority despite
this, that's the scoping conversation flagged under D4." This plan assumes
that conversation has happened (or documents what it needs to decide —
see §1's fiscal-source tradeoff, which is the substance of it).

## 1. What changed since Phase 0 scouting (July 2026 re-check)

1. **HB 103 (89th Legislature, 2025)** created the Local Government Bond,
   Tax and Project Transparency Database, with a one-time historical
   submission (tax years 2015–2025) due Jan 1, 2026. It covers bond
   elections, voter-approved tax rates, ballot language, and project
   spending — **still not general revenue/expenditure**. It does not close
   the gap; it may become a useful supplemental source later.
2. **The gap-closer the state-source scouting couldn't see: the Census
   Bureau's Government Finances program** (a national source, like ACS and
   TIGER, so it was out of scope for the per-state scouting pass). The
   **2022 Census of Governments (CoG), Finance component** publishes
   per-unit individual files with revenue (incl. property tax revenue) and
   expenditure item codes for **every** local government — all 254 TX
   counties, all ~1,220 municipalities, and special districts. Bulk CSV
   download, no manual per-entity lookup. The intervening **Annual Survey
   of State & Local Government Finances** (FY2023 published; ~11.7k-unit
   national sample) covers all large units annually between CoG years.
3. **SPDPID does carry some financial fields** after all: the
   `data.texas.gov` Socrata dataset (`vtc6-p2xa`, "Special Purpose District
   Entities") includes gross receipts, cash/temporary investments, total
   debt, and tax rates per district — self-reported and unverified, and
   still no clean total_revenue/total_expenditure, but more than the
   "registry only" reading in `TX.md`.
4. TEA now also publishes a **Summarized PEIMS Actual Financial Data**
   workbook (one .xlsx, 2008-09 through 2024-25, per-district totals) —
   which may let the school-district adapter skip the 985k-row raw-CSV
   rollup entirely.

## 2. Fiscal source decision per entity type

### Counties (254) and municipalities (~1,220)

**Recommended: Census of Governments 2022 individual-unit finance file**
as `fiscal_source` for `total_revenue`, `total_expenditure`, and
`property_tax_revenue` (item code T01), with `fiscal_year: 2022`.

- Pro: bulk, aggregated, complete coverage, scriptable — converts Texas
  from "disqualifying" to "acceptable" under the manual-but-aggregated
  standard.
- Con: **vintage**. FY2022 figures in a 2026 product, and the next full
  CoG is FY2027 (published ~2029). Between CoG years, the Annual Survey
  refreshes only sampled/large units — so a hybrid refresh (Annual Survey
  where present, CoG otherwise, per-entity `fiscal_year` varying) is
  possible but adds complexity. **This vintage tradeoff is the D4
  leadership call**: stale-but-complete Census data vs. shipping TX
  counties/munis with null revenue + `data_gaps` (schema permits it —
  total_revenue is nullable-universal per SYNTHESIS — but it's a weak
  product for the two most prominent entity types).
- Fallback if rejected: ship nulls with `gapReasons: "no_state_aggregator"`
  and revisit if Texas ever mandates centralized ACFR filing.

Join keys: CoG unit IDs are Census "individual unit" government IDs, not
FIPS. Counties resolve trivially (name → county FIPS). Municipalities need
the Census Governments Integrated Directory (GID → place) crosswalk or,
failing that, FL's documented `name_match_key` fallback against TIGERweb
places — expect a handful of name-normalization edge cases at ~1,220
places (e.g. "City of", punctuation, duplicate names across counties).

### School districts (~1,020 ISDs)

**TEA PEIMS Actual Financial Data** — the one strong state source.
Primary: the Summarized PEIMS Actuals .xlsx (per-district totals,
2024-25 available). If a needed field (e.g. property-tax detail or
fund-level scoping) isn't in the summarized workbook, fall back to the
raw single-file CSV (~985k rows/yr) with FASRG fund/object rollup logic —
CA's SACS adapter is the precedent for a heavier school-finance ETL.
Cross-check totals against NCES F-33.

- `join_key`: TEA 6-digit county-district number (adapter-defined, CA CDS
  precedent — TX districts are many-per-county and cross county lines, so
  the FL 1:1 county-FIPS scheme doesn't apply).
- `nces_id`: from NCES CCD/F-33 crosswalk.
- Enrollment: TEA enrollment reports (Fall PEIMS snapshot) as the
  `enrollment_pk12` seed; ADA if we want `enrollment_fte` (CA convention).
- **Scoping decision needed:** ISDs only, or include open-enrollment
  charters? PEIMS contains both. Recommend ISDs only for v1 (matches
  "school district" as a local-government concept); document in config.

### Special districts (thousands; MUDs dominate)

State-optional entity type. **Recommend shipping them, registry-first,
with financial data-gap flags** (the CO-style path SYNTHESIS endorsed):

- Registry: SPDPID via Socrata (`data.texas.gov` dataset `vtc6-p2xa`) —
  bulk, continuously updated. Gives name, taxpayer ID, website, entity
  type/purpose, tax rates, debt, gross receipts, cash investments.
- Do **not** attempt to merge TCEQ WDD/iWDD in v1: no confirmed bulk API,
  no canonical cross-ID to SPDPID. Note it as a future enrichment source.
- Financials: leave `total_revenue`/`total_expenditure` null with
  `gapReasons: "self_reported_registry_only"` (or similar). Optionally
  surface SPDPID gross receipts/debt later as distinct fields — do not
  masquerade gross receipts as total_revenue; it's self-reported and
  explicitly unverified. (CoG 2022 also covers special districts, so the
  same vintage-tradeoff option exists here if leadership wants numbers.)
- `join_key`: SPDPID Texas Taxpayer ID (stable, unique).
- Alternative if leadership balks at volume/quality: omit
  `special_district` from `entity_types` entirely for TX v1 — the schema
  supports it cleanly.

### Demographics & geography

Non-issues, per SYNTHESIS: Census ACS + TIGER/Line, driven by
`fips: "48"`. `geo.countySuffixStrip: / County$/` (standard).

## 3. `states/tx/config.js`

Copy `states/ca/config.js`'s shape (the second-state precedent, including
its header-comment PR log convention):

- `code: "tx"`, `name: "Texas"`, `fips: "48"`.
- `entity_types`: start with `["county"]` and grow per PR (CA precedent —
  never list a type before its adapter exists, or validate.js coverage
  rules fail on the empty array).
- `map`: `{ center: [31.0, -99.3], zoom: 6 }` (tune on first render).
- `regions`: recommend the standard 7 Texas travel/economic regions —
  Panhandle Plains, Prairies & Lakes, Piney Woods, Gulf Coast, South Texas
  Plains, Hill Country, Big Bend Country — via a 254-entry
  `REGION_MAP` (fips3 → region), same as CA's tourism-region approach
  (no single canonical state-agency region set; the Comptroller's 12
  economic regions are an alternative if 7 buckets feel too coarse for 254
  counties). Region type is already widened to `string` (Phase 4), so no
  `lib/` change.
- `COUNTY_NAMES`: 254 entries from Census `national_county2020.txt`.
- `sources` / `source_versions` (static strings, never `new Date()`):
  `census_cog_2022`, `tea_peims`, `spdpid`, plus `census_acs` /
  `tiger` ids matching core's conventions.
- `defaultSources` for cosmetic labeling of no-data entities.
- `schema` (see §5).

## 4. `states/tx/adapters/` + seeds — PR breakdown

Land as PR-sized changes, one entity type each (CA precedent):

1. **PR 1 — counties.** CoG individual-unit file (checked-in seed under
   `states/tx/seeds/` if the download is manual-but-aggregated; scripted
   fetch if the flat-file URL is stable). name→FIPS join. County seats
   from Census/TAC reference. 254 rows exactly.
2. **PR 2 — municipalities.** Same CoG source, GID→place-FIPS crosswalk,
   `name_match_key` fallback documented. `entity_subtype` from TIGER
   class codes ("city"/"town"/"village" — TX has all three).
3. **PR 3 — school_districts.** Summarized PEIMS xlsx seed +
   `_finalize_*` steps for enrollment and NCES crosswalk (CA seed-file
   pattern). PR 3.1-style follow-up acceptable for enrollment if needed.
4. **PR 4 — special_districts.** SPDPID Socrata fetch (live API — no seed
   needed), data-gap financials.
5. **PR 5 (optional/ongoing) — contacts.** Website/procurement-URL
   curation seeds, post-`build_entities` patch step per FL. At 254
   counties this is tractable; at 1,220 municipalities it's a
   backlog item, not a launch blocker (`website` nullability differs from
   FL — see §5).

Adapter hygiene: zero references to other states' sources; each runnable
standalone; emit `tmp/tx/{entity_type}.intermediate.json` per
`core/lib/intermediate-format.md`.

## 5. Validation bounds (`schema`)

- `counties`: `expectedCount: 254` (fixed since 1931 — safe to pin).
  `requiredNonNull`: do **not** copy FL's `website` requirement until the
  contacts seed exists; add a coverageRule instead.
- `municipalities`: `minCount: 1150`, `maxCount: 1300` (~1,220 actual;
  incorporations drift). Coverage rules for population and revenue
  (revenue ≥ ~95% if CoG path chosen — CoG is nominally complete but
  expect a few nonrespondent/imputed units).
- `school_districts`: `minCount: 990`, `maxCount: 1060` if ISD-only
  (~1,020; consolidations drift), revenue coverage ~100% (PEIMS is
  mandatory reporting).
- `special_districts`: loose `minCount` (SPDPID only includes districts
  over the $250k/bonds threshold — the count is a floor on "all special
  districts," document that); `gapReasons` for financial fields;
  `validPurposes` from SPDPID entity-type vocabulary.
- Set all thresholds deliberately — FL's numbers encode its Tier 1/Tier 2
  EDR split and must not be copied.

## 6. Wiring + verification

- Add TX to `public/data/states.json` (code, name, entity_types as
  shipped, map, the 7 regions). `run_all.sh` discovers adapters
  automatically.
- Checklist per `ONBOARDING_A_STATE.md` §6: clean `--state tx` run;
  `validate.js tx` zero errors; spot-check ≥5 entities per type against
  primary sources (for counties/munis, spot-check CoG numbers against a
  few published ACFRs — this doubles as the vintage-quality evidence for
  the D4 conversation); `grep -rni "comptroller|tea\.texas|texas" scripts/pipeline/core/`
  returns nothing; `npm run build` clean with no `lib/`/`app/`/
  `components/` changes.

## 7. Open questions / risks

1. **D4 vintage call (blocking PR 1–2):** is FY2022 CoG revenue data
   acceptable for TX counties/munis, clearly labeled with
   `fiscal_year: 2022`? Refresh path is weak until FY2027 CoG (~2029).
2. **Charter schools in or out** of `school_districts` (recommend out).
3. **Ship special districts or omit** for v1 (recommend ship,
   registry-first with data gaps).
4. **Region set**: 7 travel regions vs. Comptroller's 12 economic regions.
5. **CoG municipality crosswalk quality** — budget a day for GID→place
   matching; fall back to name matching per FL precedent.
6. Publish-calendar note for the eventual Phase 6 refresh runbook:
   PEIMS actuals ~1yr lag (2024-25 out now); SPDPID continuous;
   Annual Survey ~2yr lag; ACS annual.
