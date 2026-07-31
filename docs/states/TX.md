# Texas — Source Inventory (Phase 0)

**Scale:** 254 counties (3.8x Florida's 67) · ~1,214 incorporated places (956 cities, 234 towns, 24 villages) · ~1,036 school districts · special districts in the thousands (MUDs alone).

## County revenue/expenditure
**No Florida-EDR equivalent — the single biggest risk finding across all four states.** Texas Comptroller's "Transparency" hub (`comptroller.texas.gov/transparency/local/`) aggregates several *separate*, narrower tools, none of which is a per-entity total-revenue/total-expenditure table:
- Local Entity Debt Lookup — debt only, self-reported.
- Local Government Bond, Tax and Project Transparency Database — bonds/tax rates/project spend, not general revenue.
- Truth-in-Taxation — per-county appraisal-district websites (254 separate sites), tax rates/budgets, not comprehensive revenue/expenditure, no central bulk endpoint.
- Biennial Comptroller report (Tax Code §5.09) — appraised/taxable values and tax rates by county/city/school district, published December of even years; adjacent but not a full financial-statement substitute.

**Practical implication:** total revenue/expenditure would require aggregating each county's own ACFR — no statewide aggregator exists. This is a materially bigger lift than Florida and should factor into whether Texas is recommended as state #2.

## Municipality revenue/expenditure
Same picture as counties — no dedicated bulk city revenue/expenditure file found. Cities publish their own ACFRs individually (e.g. Houston) with no statewide aggregator. Comptroller's "Transparency Stars" program recognizes cities/counties/districts that *voluntarily* post financial data — implies compliance is decentralized by design, not centrally collected.

## School district finance
**Strong — the one genuinely good bulk source in Texas.** TEA's PEIMS financial data: single CSV (~985k rows/year), multiple TXT files by PEIMS code table, or Access database, all confirmed bulk-downloadable (`tea.texas.gov/finance-and-grants/state-funding/...`). Coded by fund/function/object/organization/year/program-intent per FASRG — requires rollup logic to derive "total revenue/expenditure," not a flat field out of the box, but genuinely scriptable. **NCES F-33** confirmed viable as fallback/cross-check.

## Special districts
Messier than Florida, high volume, **two overlapping, non-cross-referenced registries**:
- Comptroller's Special Purpose District Public Information Database (SPDPID) — name, Tax ID, website, report year, debt/receipts flags, entity type, tax rates. **No total-revenue/expenditure field**; self-reported and explicitly not independently verified. Bulk download available via `data.texas.gov` (Socrata).
- TCEQ Water Districts Database (WDD/iWDD) — MUDs, water control/improvement districts, river authorities; location/contact/status only, no finance. Updated weekly, web/map viewer, no confirmed bulk API.

MUDs alone number in the thousands; no single canonical ID links SPDPID and TCEQ records for the same district.

## Auto-fetchable vs. manual summary
| Source | Access | Format | Cadence | Vintage lag |
|---|---|---|---|---|
| County/city finance (ACFRs, per-entity) | Manual, no aggregator | PDF | Annual | Varies |
| Truth-in-Taxation (254 county sites) | Manual, per-site | Varies | Annual | Ongoing |
| Comptroller biennial tax-rate report | Manual download | PDF | Biennial | ~1 yr |
| TEA PEIMS | Bulk download, no REST API | CSV/TXT/MDB | Annual | ~1 yr |
| NCES F-33 (fallback) | Bulk | CSV | Annual | ~1-2 yrs |
| SPDPID | Web UI + bulk via data.texas.gov (Socrata) | Socrata dataset | Continuous, self-reported | N/A |
| TCEQ iWDD | Web/map viewer only | HTML | Updated weekly | N/A |

## Recommendation input
Texas is the **weakest candidate for state #2** among the four surveyed: no county/city revenue aggregator exists at all (vs. CA/MI/CO which all have at least a partial one), and special districts are large, fragmented, and unlinked. School district finance (PEIMS) is strong, but that alone doesn't offset the county/city gap.
