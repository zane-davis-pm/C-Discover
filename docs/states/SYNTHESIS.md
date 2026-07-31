# Phase 0 Synthesis — State Source Scouting

**Date:** 2026-07-13 · Companion to `PROJECT_PLAN_MULTISTATE.md` §3 Phase 0. Per-state detail in `CA.md`, `TX.md`, `MI.md`, `CO.md`.

## Cross-state finding: fiscal data is the risk, exactly as hypothesized

Demographics (Census ACS) and geography (TIGER/Line) are national and confirmed non-issues in all four states — no further scouting needed there. Revenue/expenditure data is where the four states diverge sharply from Florida's clean EDR model and from each other:

| State | County/muni finance | School district finance | Special districts |
|---|---|---|---|
| **CA** | Auto-fetchable API/bulk (SCO ByTheNumbers, Socrata) — best of the four | Manual only (Access DB unpack) but fresh (~6-12mo lag) | Financials auto-fetchable; registry roster exists but typology is messy (independent/dependent/JPA) |
| **TX** | **No aggregator exists at all** — per-entity ACFRs only | Strong bulk (TEA PEIMS) | Two overlapping, non-cross-referenced, unverified registries; no revenue/expenditure field |
| **MI** | Partial — F-65 covers all unit types uniformly, but confirmed bulk/API access unverified (Socrata lead untested for current year) | Strong bulk (CEPI FID) | **No registry concept maps cleanly** — absorbed into townships instead |
| **CO** | Partial — Compendium has the right fields but access is session-based Excel export, not a stable API | Strong bulk (CDE K12 Financial Transparency) | Registry exists (Socrata) but **no financial data at all** for special districts |

**Pattern:** every state has *a* school-district finance source that's workably bulk (CA the partial exception, format not access). Every state's county/municipal finance and special-district picture is meaningfully worse than Florida's, in different ways — Texas has no aggregator, Michigan's is unverified, Colorado's lacks special-district financials, and even California (the best case) has a messier special-district typology.

**Manual-download is acceptable when the source is aggregated.** Confirmed with Zane: a manual step is fine as long as the file/export covers all entities of a type in one shot (e.g. Colorado's LGIS multi-entity Excel export, Michigan's CEPI statewide ZIP, California's SACS per-year Access DB). What's disqualifying is a source that requires a separate manual lookup **per municipality/district** — Texas's per-county ACFR situation is the only state surveyed that falls into that category for county/municipal finance.

## Universal vs. state-optional field split (proposal)

**Universal fields** (present across all five entities surveyed, safe to keep as required schema fields):
- Population, population year, source (ACS — already universal)
- Median household income, education %, poverty rate (ACS — already universal)
- Entity name, website, geographic centroid/boundary (TIGER/Line — universal)
- Total revenue — present as a concept everywhere, but **confidence/completeness varies by state** (see below); keep as a nullable universal field with a `data_gaps` entry when unavailable, rather than requiring it.

**State-optional fields:**
- `total_expenditure`, `property_tax_revenue` — reliably available in CA/MI/CO for counties+munis; not centrally available at all for TX counties/munis; not available for special districts in CO. Model as optional per entity-type-per-state, not a blanket required field.
- `per_capita_income` — already being dropped from UI per Phase 1.2; no state-specific issue found, but note it's derived from the same ACS source everywhere so this is a UI decision, not a data-availability one.

**Entity-type optionality:**
- `special_district` should be treated as **state-optional as an entity type**, not just field-optional. Florida's clean, single, complete special-district registry is the exception, not the rule. CA has messy typology; TX has fragmented/unverified/overlapping registries; MI has no registry concept at all (townships absorb the role); CO has a registry but no financial data. Recommend v1 either omits special districts for non-FL states or ships them with an explicit "financials unavailable" data-gap flag rather than blocking on it. **Agreed with Zane.**
- **`township` is a `municipality` subtype, not a new entity type.** Zane's call: Michigan's ~1,240 townships are municipalities (they're full general-purpose local governments providing municipal-level services), so they should populate the existing `municipality` entity type with `entity_subtype` extended to include `"township"` (alongside the current `"city" | "town" | "village" | "other"`), not a separate top-level entity type. This keeps the schema simpler and matches how F-65 already reports them — uniformly alongside cities/villages, not as a distinct category.

## State onboarding order (decided)

Per Zane, the onboarding order is: **California → Michigan → Colorado → Texas.** This matches the data-availability ranking from this scouting pass:

1. **California (state #2).** Best-in-class, confirmed-working, auto-fetchable API for county **and** city finance (SCO ByTheNumbers/Socrata) — the single biggest risk category across all four states, solved cleanly here. School district finance requires an ETL step (Access DB unpack) but is real, bulk, and has good vintage lag — a one-time engineering cost, not an ongoing manual burden. Special districts are messier typologically than Florida's but the underlying financial data is on the same auto-fetchable platform as counties/cities.
2. **Michigan (state #3).** F-65 covers counties, cities, and townships uniformly (townships now folding into `municipality` per the schema decision above, so this is one clean adapter, not two). Bulk/API access via the Socrata lead needs a quick live-technical-check (an hour of engineering time, not a spike) before committing; worst case, fall back to CEPI-style scripted bulk download, which is confirmed working for school finance already.
3. **Colorado (state #4).** County/municipal finance via DOLA's Compendium/LGIS is a manual-but-aggregated Excel export (acceptable per the standard above) rather than a live API — plan for a scraped-export step in the adapter, not a clean integration. School district finance (CDE K12 Financial Transparency) is strong and bulk. Special-district financials are the one real gap (no aggregated source at all); plan to ship special districts with a data-gap flag for CO specifically.
4. **Texas (state #5, last).** No county/municipal revenue aggregator exists at all — the only state surveyed where getting `total_revenue` would require per-entity ACFR collection rather than one aggregated download, which is the disqualifying case per the manual-download standard above. School district finance (TEA PEIMS) is strong on its own, but doesn't offset the county/city gap. If Texas is a leadership business priority despite this, that's the scoping conversation flagged under D4 — not a surprise, since Phase 0 surfaced it in advance.

## Exit criteria check (against Phase 0's stated bar)

"Schema design in Phase 3 can cite at least 3 states' actual sources for every universal field" — met for population/income/education/poverty (ACS, all 4 states) and for total_revenue at the county/municipality level (CA, MI, CO confirmed; TX is the outlier, which is itself the actionable finding, not a gap in the research). Special-district and township handling is flagged above as needing entity-type-level, not just field-level, flexibility in the Phase 3.1 schema.
