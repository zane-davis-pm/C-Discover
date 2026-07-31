# C-Discover → Power BI: Feature-to-DAX Scoping

**Status:** scoping pass only — no DAX written yet.
**→ See [Addendum](#addendum-modeling-against-consolidatedjson) for decisions made against the actual `consolidated.json` extract. Revised measure count: 41.**
**Scope of current tool:** 3 states (FL, CA, TX), 4 entity types, ~12,300 entity records + per-entity deep-dive JSON.

| State | Counties | Municipalities | School Districts | Special Districts |
|---|---|---|---|---|
| FL | 67 | 411 | 67 | 179 |
| CA | 58 | 482 | 937 | 4,752 |
| TX | 254 | 1,228 | 1,020 | 2,869 |

---

## 0. Model prerequisites (do these before any DAX)

These aren't user-facing features, but nearly every measure below assumes them. Getting them wrong roughly doubles the measure count.

| Prereq | Why it matters |
|---|---|
| **Unified `Entity` fact table** (all 4 types, one row per entity, type-specific columns nullable) vs. 4 separate tables | The app already treats these as one union (`AnyEntity`) for shortlist, compare, notes, and export. Four separate tables means writing every generic measure four times. **Recommend one wide `Entity` table + an `EntityType` dimension.** |
| **Unpivoted `EntityMetric` table** (`entity_id`, `metric_key`, `metric_label`, `value`, `unit`, `year`, `source_id`) | The tool renders fields as *rows* in three places (deep-dive sections, comparison table, shortlist table). Power BI matrices put fields on columns by default. Unpivoting collapses ~20 per-field display measures into 2–3 generic ones. **This is the single highest-leverage modeling decision.** |
| **`DataGap` table** (`entity_id`, `field`, `reason`) | The app never shows a blank — it shows "Unknown" / "Unavailable" / "N/A" per field. Needs its own table to preserve that. |
| **`DeepDiveSeries` / `DeepDiveCategory` / `DeepDiveBenchmark` tables** | Deep-dive JSON is nested (trends, category breakdowns, peer quartiles). Must be flattened in Power Query into 3 long tables. |
| **`Source` dimension** (`source_id`, `source_name`, `source_url`, `fiscal_year`, `retrieved_at`) | Source attribution is on *every* value in the current tool — it's a stated product principle, not decoration. |
| **`State` dimension** + `Region` bridge | Region lives on counties only; municipalities/school districts/special districts derive it via a county-name lookup (`buildCountyRegionMap`). Do this join in Power Query, not DAX. |
| **Composite key `state:entity_id`** | Entity IDs are only unique *within* a state. The app enforces this everywhere. A naive model will silently collide FL and TX records. |

---

## 1. Navigation & State Scoping

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **State selector (FL/CA/TX)** | Top-nav dropdown; every route is state-prefixed; all data scoped to one state | ✅ Slicer on `State` dimension, synced across pages | None |
| **Entity type tabs** | Counties / Municipalities / School Districts / Special Districts as separate pages, per-state entity-type availability from `states.json` | ✅ One report page per entity type, or a single page + `EntityType` slicer | None (but see M3 if you want dynamic tab labels) |
| **Per-state entity-type availability** | Nav hides entity types a state doesn't ship | ⚠️ Page navigation can't hide itself conditionally; use a bookmark/button strip with conditional formatting, or accept always-visible tabs that return "no data" | **M1 · Entity Type Available** — returns 1/0 for the selected state; drives button visibility. Depends on: `State.code`, `Entity.type` |
| **Data freshness banner** | Footer + nav badge showing `last_pipeline_run`, flags stale if > 395 days | ✅ Card visual | **M2 · Days Since Last Refresh** · **M3 · Data Freshness Status** (returns "Current" / "Refresh overdue" / "Pending"). Depends on: `Metadata.last_pipeline_run` |
| **Source version footer** | Lists source IDs + versions per state | ✅ Table visual on `Source` dimension | None |

---

## 2. Search & Filtering (the core interaction)

This is the hardest area to replicate faithfully. The current filter semantics are specific and Power BI's defaults differ.

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **Free-text name search** | Case-insensitive substring match on entity name; live as you type | ⚠️ **Partial.** Power BI has no native "contains" text box. Options: (a) slicer with search enabled — matches list items, works acceptably for name lists; (b) disconnected parameter table + measure filter — true contains, but slow at 4,752 rows and clunky UX; (c) Power Apps visual with a real text input. **Recommend (a); flag as a UX downgrade.** | **M4 · Name Search Match** (only if going route (b)) — `SEARCH()` against a disconnected search-term table. Depends on: `Entity.name` |
| **Region multi-select** | Checkbox list; counties filter directly, other types derive region from parent county | ✅ Slicer on `Region` | None (region resolved in Power Query per §0) |
| **County multi-select** | Checkbox list of county names, "Unknown" excluded | ✅ Slicer on `County` | None |
| **Numeric range filters** — population, median HH income, total revenue, % bachelor's+, pop. growth rate, enrollment, expenditure/FTE | Dual-ended min/max sliders, data-aware bounds | ✅ Numeric range slicers | None for the filtering itself. **M5 · Filter Bound Min** / **M6 · Filter Bound Max** if you want to display the data-aware extents as labels (`computeBounds` equivalent). Depends on: the filtered numeric column |
| **Null-exclusion semantics** | If a range bound is active, records with `null` in that field are **excluded**; if no bound is active, they're **included** | ⚠️ Power BI's numeric range slicer already excludes blanks — behavior matches by accident. **Verify per field; do not assume.** | None, if verified |
| **Purpose category filter** (special districts) | Multi-select over 10 fixed purpose categories | ✅ Slicer | None |
| **Dependent / Independent toggle** (special districts) | Tri-state: Dependent / Independent / All | ✅ Slicer on a `Dependency Label` calculated column | **CC1 · Dependency Label** (calculated column: "Dependent" / "Independent" / gap label) |
| **Active filter count badge** | "3 filters active" — counts non-default filter groups | ⚠️ Achievable but fiddly | **M7 · Active Filter Count** — `ISFILTERED()`/`ISCROSSFILTERED()` across ~7 slicer columns per entity type. **Needs one variant per entity type unless you unify the model.** Depends on: every slicer column |
| **Clear all filters** | Single button resets to defaults | ✅ Bookmark ("Clear all slicers" state) | None |
| **URL-persisted filter state** | Every filter/sort/page is encoded in the query string — shareable, bookmarkable links | ⚠️ **Partial.** Power BI supports URL query-string filters (`?filter=Table/Column eq 'x'`) but only for simple equality — **not range filters, not multi-select, not sort state**. Bookmarks cover saved *report-author* views, not ad-hoc user links. **Flag as a real capability loss.** | None (not solvable with DAX) |

---

## 3. Results Table

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **Sortable columns** | Click header to sort asc/desc | ✅ Native table/matrix sorting | None |
| **Nulls always sort last** | Regardless of sort direction, nulls go to the end | ⚠️ Power BI sorts blanks first ascending, last descending — **does not match**. | **CC2 · <Field> Sort Key** (calculated column per sortable numeric field, ~12 total across the four types) — pushes blanks to a sentinel. Sort the display column *by* this column. |
| **Gap labels instead of blanks** | Shows "Unknown" / "Unavailable" / "N/A" (italic, gray) sourced from `data_gaps[]`, never an empty cell | ⚠️ Achievable with a measure per displayed field — **or 1 generic measure if you unpivot (§0)** | **M8 · Metric Display Value** (generic, over the unpivoted `EntityMetric` + `DataGap` tables) — returns the formatted value or the gap label. Depends on: `EntityMetric.value`, `EntityMetric.unit`, `DataGap.reason` |
| **Value formatting** ($1.2B / 45K / 12.3%) | Compact, unit-aware formatting | ✅ Format strings, or folded into M8 | Covered by M8 |
| **Result count** | "Showing 42 of 67 counties" | ✅ Card | **M9 · Filtered Entity Count** · **M10 · Total Entity Count** (uses `ALLSELECTED` to ignore slicers). Depends on: `Entity[id]` |
| **Pagination** | Page size 67 (counties) / paged for larger types | ✅ Table visuals scroll natively — pagination is unnecessary and arguably better | None |
| **Row → detail drill** | Click row / name opens deep-dive modal | ✅ Drillthrough page or tooltip page | None |
| **Sticky actions column** | Website link, note, shortlist, compare checkbox per row | ❌ See §8/§9 — the shortlist, note, and compare controls are all writeback. Website link survives as a URL-formatted column. | None |

---

## 4. Summary Stats

The current tool is deliberately thin here — `/{state}` redirects straight to the counties table. There is **no summary/landing dashboard today**. Anything you add in Power BI is net-new scope, not a port. Worth deciding explicitly.

If you do build one, the obvious cards:

| Feature | DAX needed |
|---|---|
| Entity counts by type for the selected state | **M11 · Entity Count by Type** (or reuse M9 with a type filter) |
| Total population / revenue in current filter scope | **M12 · Total Population (Filtered)** · **M13 · Total Revenue (Filtered)**. Depends on: `Entity.population`, `Entity.total_revenue` |
| Data coverage % (share of entities with non-null fiscal data) | **M14 · Fiscal Coverage %** · **M15 · Data Gap Count**. Depends on: `DataGap`, `Entity.total_revenue` |

---

## 5. Map View

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **County choropleth** | Filled county polygons from `counties.geo.json`, colored by selected metric | ⚠️ **Problem area.** Power BI's Shape Map is still in preview/limited and needs TopoJSON; Azure Maps supports polygon layers but geo-boundary data must be a supported dataset or uploaded. **You have the polygons already — this is achievable but is the highest-effort visual in the port.** | **M16 · Selected Map Metric** (field-parameter driven switch across the 5 metrics). Depends on: `population`, `median_hh_income`, `total_revenue`, `pct_bachelors_plus`, `population_growth_rate` |
| **Municipality choropleth** | Same, from `municipalities.geo.json`; county outlines drop to outline-only | ⚠️ Same as above, ×2 layers with a toggle. Azure Maps can stack layers; Shape Map cannot. | **M17 · Map Layer Mode** (drives which layer renders). Depends on: a disconnected `MapMode` parameter table |
| **5-bucket quantile color scale** | Quantile (equal-count) breaks computed live across non-null values; nulls get a fixed gray | ⚠️ Power BI's default conditional formatting is min/max/percentile **gradient**, not equal-count quantile classes. Needs explicit bucketing. | **M18 · Quantile Bucket Index** (1–5, via `PERCENTILEX.INC` breaks) · **M19 · Quantile Bucket Color** (hex, for conditional formatting by field value) · **M20 · Legend Bucket Label** (formatted "50K – 100K" range strings). Depends on: the selected metric + `PERCENTILEX.INC` |
| **Metric dropdown** | 5 metrics, URL-persisted | ✅ Field parameter | Covered by M16 |
| **Click → popup with 5 metrics + actions** | Popup shows population, median HH income, revenue, bachelor's+, growth rate, plus "Deep dive" and "Add to shortlist" | ⚠️ Metrics: ✅ via tooltip page. Actions: "Deep dive" → ✅ drillthrough. "Add to shortlist" → ❌ writeback. | Reuses M8 |
| **Legend** | Inline in toolbar, entity-aware | ✅ Custom legend built from M20 in a table visual | Covered by M20 |

**Flag:** if polygon boundaries turn out to be a blocker, the fallback is a bubble map on `lat`/`lon` (which every entity record has). That is a visibly worse product for a tool whose whole point is comparing geographies.

---

## 6. Entity Detail / Deep-Dive Dashboard

The richest area. Backed by per-entity pre-computed JSON, so **most of the hard math is already done at pipeline time** — which is good news for Power BI, but means you should decide whether to (a) import the pre-computed values as data, or (b) recompute them in DAX. Importing is faster to ship; recomputing is what makes the model actually maintainable and integrable, which is your stated reason for the rebuild. **The measure list below assumes (b) — recompute.**

### 6a. Summary metric cards (all types)

| Feature | Power BI fit | DAX needed |
|---|---|---|
| 4–5 KPI cards (population, growth rate, median income, total revenue, total expenditure) with source + year footnotes | ✅ Cards / multi-row card | Reuses M8; **M21 · Source Attribution Label** (returns "Census ACS 5-Year (2022)"-style string for the driving field). Depends on: `Source` dimension |

### 6b. Fiscal composition

| Feature | Power BI fit | DAX needed |
|---|---|---|
| Revenue by category (stacked bar) | ✅ Stacked bar on `DeepDiveCategory` | **M22 · Category Value** · **M23 · Category % of Total** |
| Expenditure by category (stacked bar) | ✅ Same | Reuses M22/M23 |
| Revenue / expenditure trend (line) | ✅ Line chart on `DeepDiveSeries` | **M24 · Series Value**; **M25 · Series YoY Change** if you want deltas (the app doesn't show them today — net-new) |
| Per-resident metrics | ✅ Cards | **M26 · Revenue per Resident** · **M27 · Expenditure per Resident** · **M28 · Property Tax per Resident**. Depends on: `total_revenue`, `total_expenditure`, `property_tax_revenue`, `population` |
| Expenditure per FTE (school districts) | ✅ Card | **M29 · Expenditure per FTE**. Depends on: `total_expenditure`, `enrollment_fte` |

### 6c. Peer benchmarking ("distribution strip")

The app renders a custom strip showing the entity's value against peer min/Q1/median/Q3/max, with peer count. Peers = all same-type entities statewide.

| Feature | Power BI fit | DAX needed |
|---|---|---|
| Peer quartile distribution vs. entity value | ❌ **No native visual matches this.** Closest options: a box-and-whisker custom visual from AppSource (peer distribution, but awkward to overlay a single entity marker), or a horizontal bar built from measures. **Flag: this visual will not look like it does today without a custom visual.** | **M30 · Peer Min** · **M31 · Peer Q1** · **M32 · Peer Median** · **M33 · Peer Q3** · **M34 · Peer Max** · **M35 · Peer Count** · **M36 · Entity Percentile Rank vs Peers** · **M37 · Entity vs Peer Median Delta**. All depend on: the selected metric + `ALL(Entity)` filtered to same type/state |
| Peer coverage note ("57 counties in distribution") | ✅ Card | Covered by M35 |

### 6d. Demographics

| Feature | Power BI fit | DAX needed |
|---|---|---|
| Population trend line (2010–2019 PEP series) | ✅ Line chart | Reuses M24 |
| Population growth rate (annualized CAGR) | ✅ Card | **M38 · Population CAGR** — recomputed from the trend series over the selected year range. Depends on: `DeepDiveSeries` population points. *(Today this is pre-computed at pipeline time; recomputing makes the year window user-selectable, which is an upgrade.)* |
| Education attainment / poverty / income distribution | ✅ Bar charts on `DeepDiveCategory` | Reuses M22 |
| Demographic benchmarks vs state | ⚠️ Same visual problem as 6c | Reuses M30–M37 |

### 6e. Data gaps & source ledger

| Feature | Power BI fit | DAX needed |
|---|---|---|
| Data gaps table (field, reason, notes) | ✅ Table on `DataGap` | **M39 · Data Gap Count** (also serves §4) |
| Source ledger (name, URL, FY, retrieved date) | ✅ Table on `Source` with URL formatting | None |

---

## 7. Special District Cohort View

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **"By Purpose" directory** | List of 10 purpose categories with counts; click → switches to list view filtered to that purpose | ✅ Bar chart or table with cross-filtering (click-to-filter is native and arguably better) | **M40 · Purpose Cohort Count**. Depends on: `purpose_category` |
| **Same-purpose cohort context** (deep dive) | "N districts statewide, M in this county share this purpose" | ✅ Cards | **M41 · Purpose Count Statewide** · **M42 · Purpose Count in County**. Depends on: `purpose_category`, `county`, with `ALL()` overrides |
| **Dependency mix** (stacked bar) | Dependent vs Independent split within purpose cohort | ✅ Stacked bar | **M43 · Dependency Mix %** |
| **Charter-year distribution** (bar) | Charter years bucketed across the purpose cohort | ✅ Bar chart | **CC3 · Charter Year Bucket** (calculated column) + **M44 · Charter Year Bucket Count** |
| **List/cohort view toggle** | Segmented control, URL-persisted | ✅ Bookmark toggle | None |

---

## 8. Comparison

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **Select 2–4 same-type entities via row checkboxes** | Checkbox in each table row; selection held in memory, capped at 4, scoped per state + per type so cross-type comparison is structurally impossible | ⚠️ **Partial.** Multi-select in a slicer (Ctrl-click) gets you selection, but: no cap enforcement, no per-type scoping guard, no visual checkbox affordance. **The 4-entity cap and same-type guard become soft (a warning) rather than hard (impossible).** | **M45 · Compare Selection Count** · **M46 · Compare Guard Message** (returns "Select at least 2…" / "Limited to 4…" / blank). Depends on: `Entity[id]` selection state |
| **Side-by-side table: fields as rows, entities as columns** | Aligned rows across Identity / Demographics / Financials / Links sections, with per-section source attribution | ✅ **Matrix visual — but only if you unpivot (§0).** Rows = `EntityMetric.metric_label`, Columns = `Entity.name`, Values = display measure | **M47 · Compare Cell Value** (generic; folds gap labels + formatting). Largely reuses M8 |
| **Deliberately no scoring/ranking/"best value" highlighting** | Explicit product principle: "Compare, Not Be Told" | ✅ Just don't add conditional formatting. Worth writing down so a future report author doesn't "helpfully" add green/red. | None |
| **"Add all to shortlist"** | Bulk-adds compared entities | ❌ Writeback — see §9 | None |

---

## 9. Shortlist / Workspaces / Notes — ❌ **Does not port**

This is the biggest single gap and it isn't a DAX problem.

| Feature | What it does today | Power BI fit |
|---|---|---|
| **Shortlist (add/remove entities)** | Per-entity toggle, persisted in browser localStorage | ❌ **Not feasible in Power BI.** Requires user writeback. Workarounds: Power Apps visual writing to Dataverse/SQL/SharePoint, or a manually-maintained list table. Both are a materially different product. |
| **Named workspaces** | Multiple named, taggable shortlists; create/rename/delete; switcher in nav | ❌ Same — writeback. Power BI *personal bookmarks* are the nearest native thing and are a poor substitute (they save filter state, not entity collections). |
| **Per-entity free-text notes** | Notes attached to `state:entity_id`, survive workspace deletion | ❌ Same — writeback. |
| **Workspace JSON export/import** | Point-in-time snapshot file for manual sharing between teammates | ❌ Nothing equivalent. |
| **Snapshot-at-add-time semantics** | Shortlist stores a *copy* of the entity's values when added, so exports are stable even if the underlying data refreshes | ⚠️ Worth noting: this is a deliberate design choice that a live Power BI dataset structurally cannot reproduce — Power BI always shows current values. Whether that's a loss or an improvement is a product call. |

**If shortlists/workspaces are core to how partners actually use this tool, Power BI alone is the wrong target.** The realistic shape is Power BI for explore/analyze + a Power Apps visual (or a small backing table) for collection management. Worth confirming actual usage before committing.

---

## 10. Export

| Feature | What it does today | Power BI fit | DAX needed |
|---|---|---|---|
| **Shortlist CSV export** | 22 named columns in a fixed order, gap strings, notes column, dated filename | ⚠️ **Partial.** "Export data" from a visual gives you the visual's columns — so build a dedicated hidden export table visual whose columns match the spec exactly. No control over filename. Depends on shortlist existing at all (§9). | Reuses M8; column layout is a visual concern |
| **Workspace JSON export** | Structured file with `format_version`, workspace metadata, items, notes | ❌ Not available | None |
| **PDF / paginated report output** | Not in the current tool | ✅ Power BI can do this and the current tool cannot — a genuine upgrade if partners want leave-behinds | None |

---

## Summary

**Total DAX measures: 47** (M1–M47)
**Calculated columns: 3 named (CC1–CC3), plus ~12 nulls-last sort-key columns** — call it **~15 calculated columns**.

Rough split by effort:

| Band | Count | Notes |
|---|---|---|
| Trivial (counts, ratios, per-capita) | ~18 | M2, M9–M15, M22–M29, M39–M40 |
| Moderate (context manipulation, `ALL`/`ALLSELECTED`) | ~19 | M7, M16–M17, M30–M38, M41–M47 |
| Hard (quantile bucketing, percentile rank, generic display measure over unpivoted model) | ~10 | M8, M18–M20, M36, M47 |

**The measure count drops meaningfully (roughly 47 → ~35) if you commit to the unified `Entity` table + unpivoted `EntityMetric` model in §0.** If you keep four separate tables, several generic measures multiply by four instead.

### Poor fits — flag regardless of DAX complexity

1. **Shortlist / workspaces / notes (§9)** — not a DAX problem, a writeback problem. Needs Power Apps or a backing store. **This is the decision that should drive the go/no-go, not the DAX count.**
2. **Free-text search (§2)** — no native contains-search input. Search-enabled slicers are a workable but noticeably worse substitute.
3. **URL-shareable filter state (§2)** — Power BI URL filters handle equality only, not ranges or multi-select or sort. Partners who share filtered links today lose that.
4. **Polygon choropleth (§5)** — achievable via Azure Maps with your existing GeoJSON, but it's the highest-effort visual in the port and Shape Map is not a safe bet. Bubble-map fallback is a visible downgrade.
5. **Peer distribution strip (§6c)** — the measures are easy; the *visual* has no native equivalent. Needs a custom visual from AppSource or a hand-built bar approximation.
6. **Quantile (equal-count) color classes (§5)** — Power BI's conditional formatting is gradient/percentile-based by default; equal-count classing has to be built by hand (M18–M20).
7. **Hard constraints becoming soft (§8)** — the 4-entity cap and same-type-only comparison guard are structurally enforced in the app today. In Power BI they degrade to a warning message.

### Fields present in the data but not surfaced in the UI today

Free wins if you want them in the Power BI model — no new pipeline work, just unhidden columns:

- `per_capita_income` (counties, municipalities) — collected, never displayed
- `total_expenditure` — in the data and on deep-dive cards, but absent from every explore table
- `area_sq_miles`, `county_seat` (counties) — deep-dive only
- `population_source`, `education_year`, `poverty_year` — source/vintage metadata, only partially surfaced
- `procurement_url` — **present in every entity JSON record but referenced nowhere in the app and absent from `lib/types.ts`.** Currently always null. Likely a planned field; worth confirming before modeling it.
- `wyn_url` — CRM linkage placeholder, deliberately never rendered pending a decision (see `lib/types.ts`). Do not surface it in Power BI either until that's resolved.

### Things Power BI does better

Worth putting on the other side of the ledger: native cross-filtering (replaces the cohort click-through), scheduled refresh + integration with your other systems (your stated motivation), paginated/PDF export, drillthrough, and no pagination needed at any table size.

---

# Addendum: modeling against `consolidated.json`

Verified against the actual extract: **12,324 records, 50 fields, all 4 entity types × 3 states in one flat array.** This is the unified `Entity` table §0 recommended, which removes the largest modeling risk. IDs are globally unique (zero bare-ID collisions), so the `state:id` composite key is belt-and-braces rather than mandatory.

## Decisions taken

| Question | Decision |
|---|---|
| Deep-dive detail (not in the extract) | **Drop for v1.** Removes M22–M25 and M38. Fiscal-composition bars, revenue/expenditure trend lines, and the population trend line are out of scope. |
| Peer benchmarks | **Recompute live in DAX** from `consolidated.json`. Peer set responds to active slicers. M30–M37 become real measures rather than imported values. |
| Region for non-county entities | **Fix in Power Query** — strip the `" County"` suffix and merge region onto all types before load. |

## Required Power Query steps

1. **Expand `data_gaps[]`** — nested array on every record. Expands to a **43,802-row** `DataGap` table (`entity_id`, `field`, `reason`). Required for M8's gap labels.
2. **Normalize the county join key** — counties store `"Alameda County"`; municipalities, school districts, and special districts store `"Alameda"`. Strip the suffix, then merge `region` from the county rows onto the other 11,945 records. **This is the join most likely to silently half-work** — validate the match rate after the merge, don't assume it's 100%.
3. **Split out the `Source` dimension** from the 9 distinct `fiscal_source` values plus `income_source` / `enrollment_source` / `population_growth_source`. `source_name` / `source_url` / version strings live in `public/data/<state>/metadata.json`, **not** in the extract — pull them in separately.
4. **Add the `EntityType` and `State` dimensions** (4 and 3 rows respectively).

## Data-quality findings that change the build

### ⚠️ `purpose_category` has 45 distinct values, not 10

`lib/types.ts` declares a closed union of 10 purposes and `PurposeCohortView` iterates exactly those. The data has 45.

| State | Distinct purposes | Off the 10-value list |
|---|---|---|
| FL | 10 | 0 |
| CA | 12 | 6 |
| TX | 30 | 29 |

**5,393 special districts — 69% of all of them — carry a purpose outside the app's declared union.** The largest orphans are Community Services (1,332), Municipal Utility District (1,304), Joint Powers Authority (1,199), Emergency Services District (273), Cemetery (239).

This is a **pre-existing defect in the current app**, not a Power BI problem: the cohort directory renders 10 rows and those 5,393 districts are invisible in it. Worth fixing in the app regardless of the Power BI decision.

For the Power BI model, pick one before M40–M43 are written:
- **(a) Slice on the raw 45 values** — accurate, zero prep, but a 45-item slicer is unwieldy and FL/CA/TX categories aren't comparable to each other.
- **(b) Add a `PurposeGroup` rollup table** mapping 45 → ~12 comparable groups. **Recommended.** Cross-state comparison is the entire point of the tool, and TX's 30 categories are mostly finer-grained splits of the same handful of functions (water, utility, emergency, development).

### Coverage gaps that make some visuals not worth building

| Field | Non-null | Consequence |
|---|---|---|
| `charter_year` | **179 / 7,800 (2%)** | **Charter-year distribution chart is dead.** M44 and CC3 dropped. Only FL populates it. |
| `dependent` | 3,651 / 7,800 (47%) | Dependent/Independent slicer works but over half the districts land in the gap bucket. |
| `enrollment_fte`, `expenditure_per_fte` | 993 / 2,024 (49%) | Roughly half of school districts have no per-FTE figure. M29 needs a blank-safe path. |
| `total_revenue` | 8,851 / 12,324 (72%) | 3,473 entities have no fiscal data at all. Every revenue measure must handle this, and "Fiscal Coverage %" (M14) becomes a genuinely useful card rather than a nicety. |
| `region` | counties only | Resolved by PQ step 2. |
| `lat` / `lon` | counties + municipalities only | School and special districts **cannot** be mapped. Matches the app, which only maps those two layers. No action needed. |

### Units and conventions to lock in

- `population_growth_rate` is stored in **percentage points**, not decimal (range −17.83 to 32.12). Format as `0.0"%"` — do **not** apply a percentage format string that multiplies by 100.
- `pct_bachelors_plus` and `poverty_rate` follow the same convention.
- All growth rates derive from a single window, `2010-2019`. There is no year-over-year series in the extract, so growth is a static column, not a measure.
- `last_updated` is identical (`2026-07-27`) on all 12,324 rows — usable as the refresh date for M2/M3 without needing `metadata.json`.
- `entity_subtype` has 3 values (city 1,677 / town 380 / village 64) — no `township` or `other` in the current data despite the type union allowing them.

## Revised measure count

**41 measures** (from 47) and **~14 calculated columns**.

Dropped: **M22, M23, M24, M25** (deep-dive categories and trends), **M38** (population CAGR — now a static column), **M44** + **CC3** (charter year, 2% coverage).

Still open, but **not blocking the DAX**: the shortlist / workspaces / notes writeback question from §9, and the `PurposeGroup` rollup decision above.

---

## Addendum 2: final scope locked

| Question | Decision | Effect |
|---|---|---|
| `purpose_category` (45 values vs. 10 declared) | **No DAX for purpose cohorts.** `purpose_category` stays a plain slicer on the raw values; no rollup table, no cohort measures. | **M40–M43 dropped (−4)** |
| Map | **Polygon choropleth via Azure Maps.** GeoJSON already in `public/data/<state>/*.geo.json`. | M16–M20 retained |
| Free-text search | **Search-enabled slicer**, no measure. | **M4 dropped (−1)** |

### Final count: **36 measures**, ~13 calculated columns

Retained: M1–M3, M5–M21, M26–M37, M39, M45–M47.
Calculated columns: **CC1** (Dependency Label) + ~12 nulls-last sort keys.

Dropped across both addenda: M4 (text search), M22–M25 (deep-dive categories/trends), M38 (growth CAGR — static column), M40–M43 (purpose cohorts), M44 + CC3 (charter year).

### Known consequences of the purpose decision

The "By Purpose" cohort directory (§7) does **not** port. Purpose remains available as a filter, and Power BI's native click-to-cross-filter covers the click-through behavior, so the loss is the *directory view* and the deep-dive cohort context cards ("N districts statewide, M in this county share this purpose"), not purpose filtering itself.

Separately: the 45-vs-10 mismatch remains a live defect in the current app — `PurposeCohortView` iterates the 10 declared literals, so 5,393 special districts are invisible in that view today. Worth tracking independently of the Power BI work.

### Ready to write

No further inputs needed. `metadata.json` (source names/versions for M21) and the `.geo.json` boundary files are already in the repo — both are in `public/data/<state>/`.

Still open but **not blocking**: shortlist / workspaces / notes writeback (§9). None of the retained 36 measures depend on it. M45–M47 cover the comparison guard rails, which work off slicer selection and need no writeback.
