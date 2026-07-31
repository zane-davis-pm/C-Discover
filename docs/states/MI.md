# Michigan — Source Inventory (Phase 0)

**Scale:** 83 counties · ~276-280 cities + ~253-257 villages · **~1,240 townships (no Florida equivalent)** · school districts via CEPI.

## County revenue/expenditure
Michigan Department of Treasury's **Form F-65** (Annual Local Unit Fiscal Report) is the closest analog to Florida's EDR data, and uniquely **covers counties, cities, villages, and townships in one uniform filing** (Uniform Budgeting and Accounting Act). Filed within 6 months of each unit's fiscal year-end.
- Filing/search portal (`treas-secure.state.mi.us`) is for local units to submit/search individual filings — not a bulk analytical source.
- **MI Community Financial Dashboard** (`micommunityfinancials.michigan.gov`) is Treasury's own public tool built on F-65 data, but is a JS single-page app; a direct fetch returned an empty shell — bulk access would require inspecting its backend API calls.
- **Likely best lead:** a Socrata instance at `mi-treasury.data.socrata.com` hosting per-year F-65 datasets (a 2014 dataset with ~2.15M rows was confirmed). Socrata implies a standard SODA API (CSV/JSON/XML) — **but current-year coverage was not confirmed**; needs a live crawl of the dataset catalog before assuming full automation.
- A legacy MSU Extension "F65 Fiscal Data Portal" exists but appears stale (covers only 2005-2011, page last substantively updated ~2013) — do not rely on it.

## Municipality revenue/expenditure
Same F-65 mechanism and same access paths/caveats as counties — no separate municipal-only system.

## School district finance
**Strong.** Michigan CEPI's Financial Information Database (FID), surfaced via MI School Data (`mischooldata.org/financial-data-files/`). Confirmed genuine bulk downloads: statewide ZIP archives per school year (2003-04 through 2024-25), covering revenue, balance sheet, expenditure, and ESP data for **all districts at once**. Predictable per-year URL pattern under a CMS media path (scriptable, though not a formal API — could change without notice). Format is mostly ZIP → Excel (.xlsx/.xlsm); pre-2011-12 files are DBF. Current release (2024-25) still being revised as of mid-2026 — roughly a 1-year lag. **NCES F-33** confirmed as a viable national fallback (~2-year lag, less granular).

## Special districts
**No Florida-equivalent registry exists.** Michigan's local-government structure absorbs much of what Florida handles via special districts into general-purpose **townships** instead (Michigan's unincorporated areas are township-governed, not county-governed as in Florida). What special-purpose entities do exist are fragmented across statutory categories with no single roster:
- County Drainage Districts (Drain Code of 1956) — each administered by a locally elected Drain Commissioner; no statewide financial roster.
- Downtown Development Authorities (DDAs, PA 197/PA 57) — TIF-funded, listed only at the county/local level (no statewide DDA registry found).
- Lake/Special Assessment Districts — ad hoc, county/township level.

**Practical implication:** the "special districts" entity type is likely state-optional for Michigan, or would need to be narrowly rescoped to drain districts/DDAs with manually assembled per-county lists — not a v1 priority.

## Auto-fetchable vs. manual summary
| Source | Access | Format | Cadence | Vintage lag |
|---|---|---|---|---|
| F-65 via mi-treasury Socrata | Likely API, current-year coverage unconfirmed | CSV/JSON | Annual | Unknown, needs live check |
| MI Community Financial Dashboard | Uncertain (JS SPA) | Web UI | Annual | Unknown |
| Legacy MSU F65 portal | Manual, stale | Web tool | Discontinued? | Very stale |
| CEPI FID | Scriptable bulk (predictable URLs) | ZIP → Excel/DBF | Annual | ~1 yr |
| NCES F-33 (fallback) | Bulk | CSV | Annual | ~2 yrs |
| Drain districts / DDAs | Manual, county-by-county | Varies | N/A | N/A |

## Schema implication
Michigan's ~1,240 **townships** are full general-purpose governments with no Florida analog. Decided (per Zane): townships are a `municipality` **subtype**, not a new entity type — `entity_subtype` extends to include `"township"` alongside `"city" | "town" | "village" | "other"`. This matches how F-65 already reports them (uniformly alongside cities/villages) and keeps the schema simpler than a fifth entity type, but does add a meaningfully larger record volume to the `municipality` table than Florida's structure implies.
