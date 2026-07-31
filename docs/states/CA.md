# California — Source Inventory (Phase 0)

**Scale:** 58 counties · ~482 incorporated cities · 1,071 school districts (LEAs, per CDE directory) · 4,800+ special districts.

## County revenue/expenditure
Single authoritative, **auto-fetchable** source: California State Controller's Office "By the Numbers" open-data platform (Socrata), county-specific portal at `counties.bythenumbers.sco.ca.gov`. Sourced from the annual County Financial Transactions Report (Gov. Code §12463). Confirmed working CSV/JSON/XML/RDF download + SODA query API (e.g. dataset `uctr-c2j8`, "County – Expenditures," 2002-03 to 2023-24). Also mirrored on `lab.data.ca.gov` (CKAN, documented API). **Best-in-class of the four states surveyed.**

## Municipality revenue/expenditure
Same SCO Socrata platform, city-specific portal `cities.bythenumbers.sco.ca.gov`. Legal basis Gov. Code §53890-97, Cities Financial Transactions Report, all ~482 incorporated cities. Same bulk/API access as counties. Series 2002-03 to present.

## School district finance
**Weak link.** CDE's SACS (Standardized Account Code Structure) Annual Financial Data (`cde.ca.gov/ds/fd/fd/`) is the FLDOE-AFR equivalent but is distributed only as **self-extracting .exe files containing Access databases**, one per fiscal year — no per-district CSV/API. Requires an Access-DB-unpack ETL step (e.g. `mdbtools`). A per-LEA "SACS Data Viewer" exists for manual lookup only. Vintage lag is actually good (~6-12 months; FY24-25 posted by mid-2026). **NCES F-33** is a viable fallback but lags 2-3 years — worse than SACS despite the format hassle.

## Special districts
No single clean registry equivalent to Florida's, but usable candidates exist. Financial reporting: same SCO Socrata platform, `districts.bythenumbers.sco.ca.gov`, "4,800+" districts, published by Nov. 1 following fiscal year-end. Roster candidate: SCO's own "Special Districts Listing" Socrata dataset (same platform, API-accessible) — column schema (legal name/address/type) not yet verified. CSDA (trade association) has no public bulk registry. **Typology is more heterogeneous than Florida's**: independent vs. dependent districts, JPAs, Mello-Roos/CFDs — will require judgment calls on what counts as in-scope.

## Auto-fetchable vs. manual summary
| Source | Entity type | Access | Format | Cadence | Vintage lag |
|---|---|---|---|---|---|
| SCO ByTheNumbers | County | API/bulk | CSV/JSON/XML/RDF + SODA | Annual | ~1-2 yrs |
| SCO ByTheNumbers | City | API/bulk | CSV/JSON/XML/RDF + API | Annual | ~1-2 yrs |
| SCO ByTheNumbers | Special district | API/bulk | CSV/JSON/XML/RDF + API | Annual | by Nov 1 following FY end |
| CDE SACS | School district | Manual (Access DB unpack) | .exe → Access DB | Annual | ~6-12 mo |
| NCES F-33 | School district (fallback) | Bulk file | Fixed-width/CSV/SAS | Annual | ~2-3 yrs |

## Open uncertainties
- SCO Socrata column schema not inspected line-by-line (e.g. whether property tax revenue is broken out).
- No confirmed bulk API for a canonical special-district master list with type/address fields — SCO's "Special Districts Listing" is the best lead, unverified schema.
