# Onboarding a new state (skeleton)

**Status:** skeleton captured during Phase 3 Part B, while the core/adapter
contract is fresh. The full runbook (with per-state screenshots, a QA
checklist, and the annual-refresh runbook) is Phase 6 per
`PROJECT_PLAN_MULTISTATE.md`. Decided onboarding order: **California → Michigan
→ Colorado → Texas** (`docs/states/SYNTHESIS.md`).

Florida (`scripts/pipeline/states/fl/`) is the reference adapter state —
copy its shape, not its content, when starting a new state.

## 0. Scout the state's sources first

Before writing any code, repeat Phase 0's scouting exercise for the new
state (a per-state doc already exists for CA/TX/MI/CO in `docs/states/`):

- Where do county/municipal revenue figures come from? Auto-fetchable
  API/bulk export, or manual-but-aggregated (acceptable), or per-entity manual
  lookup (disqualifying — flag to leadership per D4's Texas precedent)?
- What's the school-district finance equivalent of an AFR?
- Does a special-districts registry exist and does the concept map cleanly,
  or does it need to ship state-optional / with a data-gap flag (see CO)?
- Is a township/borough/parish-style entity actually a `municipality` subtype
  (extend the union, don't add a new entity type — see Michigan's decision)?

## 1. `states/{code}/config.js`

Copy `states/fl/config.js`'s shape. Required:

- `code`, `name`, `fips` (2-digit state FIPS — drives `core/fetch_geo.js` and
  `core/fetch_census_acs.js`, both national sources).
- `entity_types` — omit `"special_district"` entirely if the state doesn't
  ship one (state-optional entity type, not just state-optional fields).
- `map` (`{ center, zoom }`) and `regions` (must match whatever the state's
  adapters assign per county/entity — see `AGENTS.md`'s note on
  `FloridaRegion` needing to widen to `string` once a state's regions don't
  fit the current literal union).
- `geo.countySuffixStrip` — the regex used to normalize county polygon names
  for the ACS place→county spatial join (Florida strips `" County"`;
  Louisiana would need `" Parish"`, Alaska `" Borough"`, etc.)
- `sources` — every source id the adapters/build_deep_dive reference, with a
  human-readable name + URL.
- `source_versions` — vintage/version stamps per source, surfaced in
  `metadata.json` and `deep-dive/index.json`. Keep these static/deterministic
  strings, not a live timestamp (a past version of this file used
  `new Date()` for two of these and produced spurious daily snapshot drift —
  don't repeat that).
- `defaultSources` — fallback source ids used only for cosmetic labeling
  when an entity has no data at all in that category.
- `schema` — per entity-type-key (`counties`, `municipalities`,
  `school_districts`, `special_districts`): `expectedCount` (exact row-count
  bound) or `minCount`/`maxCount`, `optionalFields` (state-optional fields,
  still get a `data_gaps` entry when null), `requiredNonNull` (fields that
  must never be null, e.g. Florida requires `website` on every county),
  `coverageRules` (percentage-threshold checks, e.g. population/website
  coverage), `validRegions` / `validPurposes` (closed vocabularies), and
  `gapReasons` (override the default `"unknown"` reason for specific fields
  — Florida uses `"unavailable"` for special-district financials).

## 2. `states/{code}/adapters/`

One file per entity type, each exporting a `build*Registry()` function and
runnable standalone (`node states/{code}/adapters/counties.js`). Each adapter:

- Fetches/parses that state's fiscal and registry sources (whatever Step 0
  found — bulk Excel export, Socrata API, scraped export, etc.)
- Emits `tmp/{code}/{entity_type}.intermediate.json` per
  `core/lib/intermediate-format.md`'s schema, keyed by a stable `join_key`
  (FIPS where the state's source has it; a normalized name only as a documented
  fallback when it genuinely doesn't — see Florida's municipality adapter).
- Contains **zero** references to another state's sources — this is a
  per-adapter-directory rule as much as a `core/` rule; keep it clean from
  the start.

If a source requires a manual download (acceptable per the
manual-but-aggregated standard — see `docs/states/SYNTHESIS.md`), the
adapter should read a checked-in seed file under `states/{code}/seeds/`
rather than embedding a giant literal array, matching Florida's special
district adapter pattern.

## 3. `states/{code}/contacts/` (if applicable)

Website/procurement-URL curation is inherently manual, per-state seed data.
If the state has it, follow Florida's pattern: a seed JSON keyed by the
entity's stable id, applied as a post-`build_entities` patch step (not part
of the adapter output — contacts aren't sourced from any of the state's
official data feeds).

## 4. Wire into `run_all.sh`

Nothing to change in `run_all.sh` itself — it already discovers
`states/{code}/adapters/*.js` and `states/{code}/contacts/*.js`
automatically. Add the state's code to `public/data/states.json` so
`--all` picks it up.

## 5. Validation bounds

Set `expectedCount` (or `minCount`/`maxCount`) for every entity type the
state ships, matching the state's actual known counts (e.g. county count).
Set `coverageRules` thresholds deliberately — don't copy Florida's numbers
verbatim; they reflect Florida's specific Tier 1/Tier 2 EDR-reporting split.

## 6. First run + verification checklist

1. `bash scripts/pipeline/run_all.sh --state {code}` completes cleanly.
2. `node scripts/pipeline/core/validate.js {code}` — zero errors.
3. Spot-check a handful of entities against the state's own published source
   figures (not just "the pipeline didn't crash").
4. `grep -rni "edr|fldoe|floridajobs|florida" scripts/pipeline/core/` still
   returns nothing — if adding this state required a `core/` change, that
   change must stay state-agnostic.
5. `npm run build` clean (no `lib/`/`app/`/`components/` changes should be
   needed for a new state — Phase 3 Part A's contract is that adding a state
   is a config + adapter change only).
6. Add the state to `public/data/states.json`'s manifest; the UI's state
   selector picks it up automatically once there's more than one state.

## Open questions for the full Phase 6 doc

- Per-state publish-calendar notes (when does each state release updated
  fiscal data, so the annual refresh can be timed sensibly).
- The "upload replacement seed file" runbook path for manual-download
  sources, for a non-engineer admin assistant (Phase 5 D5).
- A template `{state}.md` scouting doc structure, generalized from
  `docs/states/CA.md`/`TX.md`/`MI.md`/`CO.md`.
