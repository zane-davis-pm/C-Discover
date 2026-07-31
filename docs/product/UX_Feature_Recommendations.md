# C-Discover — UX Feature Recommendations

*Based on review of the live app against its stated jobs: Discover & Scope, Trust & Defend, Compare (not be told), Export & Activate. User is a partner/pursuit-team member using the tool several times weekly — optimize for fast, low-friction scanning, not first-time orientation.*

## Shortlist & Export (highest priority)

- **Multiple named shortlists.** Currently one global list in `localStorage`. Partners run concurrent pursuits — add named lists with a switcher (e.g., "Panhandle Water Districts," "Q3 GTM — Central FL"). Still local, no backend needed yet.
- **Bulk actions.** Row checkboxes + "add N selected" / "add all filtered" to shortlist. One-click-per-row doesn't scale to a 400-row municipality table.
- **Notes field per shortlisted entity.** One-line "why this one," carried into CSV export.
- **Summary roll-up on the shortlist page.** e.g. "14 entities · combined population 2.1M · combined revenue $340M" — cheap to compute, pitch-ready.

## Explore Tables

- **Pin the name and shortlist columns** so they stay visible on horizontal scroll (tables run 8–9 columns wide).
- **Persistent visual state for shortlisted rows** (tinted row/checkmark) — right now status is only visible via one column icon.
- **Column picker.** Fields like poverty rate, property tax revenue, and fiscal year are modal-only; let users add them as sortable columns.
- **Saved filter presets** for repeat filter combinations (e.g., "Central FL, pop > 50k").
- **Persistent notes column, far right of every table.** Freeform text per entity, editable inline, not limited to shortlisted rows — persisted locally (same pattern as the shortlist store) so notes survive closing and reopening the tool.

## Detail Modal

- **Headline stat cards** (population, income, revenue) at the top before the full field list — currently one long undifferentiated scroll.
- **Prev/next navigation** to step through the current sorted/filtered list without closing the modal.
- **"Copy link to this entity"** — the app is already URL-navigable; surface that shareability explicitly.
- **Consistent fiscal-year labeling** on all dollar fields (population/enrollment already do this; financials don't).

## Map

- **Extend choropleth/popup coverage to school and special districts** — currently counties and municipalities only. Special districts are inherently spatial and purpose-based (water, fire, transportation); pairs naturally with the planned cohort-grouping feature.
- **Multi-select on map** (box/lasso) to bulk-add visible entities to shortlist.

## Navigation & Trust (revised)

- **Land on last-visited view**, not a hardcoded redirect to Counties — respects a frequent user's routine, no added screen.
- **No landing/orientation page.** A splash or dashboard solves a first-time-visitor problem at the cost of daily friction for a several-times-weekly user — skip it.
- **Sharpen the existing footer freshness indicator** (already ambient, zero-click) to visibly flag data older than 13 months, per the tool's own staleness threshold.

## Explicitly out of scope

Scoring, ranking, or any comparison view that produces a verdict — neutrality is the tool's differentiator versus a generic BI dashboard. Any "compare" feature should stay a raw side-by-side, never weighted.
