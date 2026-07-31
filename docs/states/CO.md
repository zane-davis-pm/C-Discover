# Colorado — Source Inventory (Phase 0)

**Scale:** 64 counties · 273 active municipalities (198 towns, 73 cities, 2 consolidated city-counties: Denver, Broomfield) · 179 school districts + 1 Charter School Institute + 21 BOCES · special districts ~4,235 (Socrata dataset) to several-thousand depending on source, roughly 10-20x Florida's count.

## County revenue/expenditure
Colorado Dept. of Local Affairs (DOLA), Division of Local Government (DLG) publishes the **"County and Municipal Financial Compendium"** annually since 1975 — extracted from each local government's audited financial statement, with fields close to Florida EDR's (total revenue, total taxes incl. property tax, total operating expenditures, capital outlay, debt service, population, mill levy, assessed value). Landing page: `dlg.colorado.gov/county-and-municipal-financial-compendium`.
- Live query interface **LGIS "Active Colorado Local Government Finances"** supports **Excel export of search results** — bulk-ish, but session-based (JSF app with `jsessionid` URLs), not a stable REST/CSV endpoint. No confirmed single statewide flat file.
- DOLA's own disclaimer: data is "not GAAP-conformant… for general research purposes only."
- Related, narrower: Division of Property Taxation Annual Report (assessed values, mill levies, property tax revenue) — PDF only.

## Municipality revenue/expenditure
Same Compendium and LGIS finance search cover municipalities together with counties (it's explicitly "County **and Municipal**"). Same session-based/Excel-export access pattern, same caveats.

## School district finance
**Strong.** Colorado K12 Financial Transparency (CDE), mandated by HB10-1036/HB14-1292 (`cde.state.co.us/schoolview/financialtransparency/homepage`). Confirmed bulk downloadable files per fiscal year: District Level Data File, School Level Data File, Property Tax Breakdown File, ESSA Per-Pupil Spending File. Updated annually, **no later than July 1** with the prior fiscal year's data — ~12-month lag, comparable to FLDOE. **NCES fallback** viable but lags further and is less granular than CDE's own portal.

## Special districts
No single clean official list with full entity-level financial detail (unlike Florida), but a real, usable roster exists:
- DOLA Special Districts program (Title 32 Art. 1 filings, `dlg.colorado.gov/special-districts`) — compliance-oriented, not a downloadable entity dataset.
- **"All Special Districts in Colorado"** (Colorado Information Marketplace / Socrata, `data.colorado.gov`) — genuine SODA2 API, monthly automated update, ~4,235 records at initial publish. Explicitly labeled a "first version of effort toward an authoritative Statewide Special Districts Dataset" — boundaries digitized from scanned/PDF maps, "no guarantee of accuracy." A companion "Map of Metro Districts" dataset exists on the same platform.
- **Financial data gap:** special-district financials are **not** in the Compendium (that covers general/enterprise county-municipal activity only) — individual district audits are filed separately with DOLA with no confirmed aggregated financial extract. This is a real hole for the "total revenue/expenditure" fields at the special-district level specifically.

## Auto-fetchable vs. manual summary
| Source | Access | Format | Cadence | Vintage lag |
|---|---|---|---|---|
| DOLA Compendium/LGIS finance | Manual search + per-search Excel export | .xlsx | Annual | ~1-2 yrs (unclear) |
| DOLA Property Tax Annual Report | Manual | PDF | Annual | ~1 yr |
| CDE K12 Financial Transparency | Direct bulk download | Excel/CSV | Annual, by July 1 | ~1 yr |
| NCES fallback | Bulk | CSV | Annual | 2+ yrs |
| Special districts roster (data.colorado.gov) | Socrata SODA2 API | JSON/CSV | Monthly | Boundaries only, not financials |
| Special district financial filings | Manual, per-entity audits | PDF | Varies | Varies |

## Key risk flags
No confirmed single bulk/API source for county+municipal total revenue/expenditure (would likely require a scraped LGIS export workflow). Special-district financials have no aggregated source at all — that field may need to be deprioritized or manually sourced for Colorado specifically. Special-district registry itself carries an explicit "no guarantee of accuracy" disclaimer from DOLA, and volume (~4,235) will stress-test the special-district entity type harder than any other state surveyed.
