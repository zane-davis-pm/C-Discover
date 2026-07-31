# C-Discover — Technical Specification

**Version:** 3.0
**Date:** 2026-07-01
**Status:** Draft — pending partner/engineering signoff
**Scope:** V3
**Prerequisite:** SPEC.md (V1) and SPEC_V2.md (V2) — both substantially implemented and verified live in the current build (municipality data-quality fixes, school district elevation, cross-entity navigation, and map entity-mode toggle are already shipped; see current-state audit).
**Source of scope:** JTBD / PR-FAQ / MoSCoW analysis (C-Discover_JTBD_PRFAQ_MoSCoW.md), Must + Should items only. Could/Won't items are listed in §9 as explicitly deferred, not silently dropped.

---

## Table of Contents

1. [V3 Scope Summary](#1-v3-scope-summary)
2. [Access & Sourcing Data Backfill](#2-access--sourcing-data-backfill)
3. [Data Freshness & Staleness Indicator](#3-data-freshness--staleness-indicator)
4. [Special District Cohort View](#4-special-district-cohort-view)
5. [Entity Comparison View](#5-entity-comparison-view)
6. [Named, Taggable Local Workspaces](#6-named-taggable-local-workspaces)
7. [Updated Data Model](#7-updated-data-model)
8. [Pipeline Changes](#8-pipeline-changes)
9. [Deferred / Out of Scope for V3](#9-deferred--out-of-scope-for-v3)
10. [Feature Requirements](#10-feature-requirements)
11. [Task Breakdown](#11-task-breakdown)
12. [Acceptance Criteria](#12-acceptance-criteria)

---

## 1. V3 Scope Summary

V3 closes the one real gap found in the current-state audit (empty access fields) and adds the highest-value Should-have items from the MoSCoW analysis, without touching the two things that make C-Discover credible: it stays a static, backend-free site, and it still never scores, ranks, or recommends.

**Five workstreams, in priority order:**

**A. Access & Sourcing Data Backfill (Must)** — Populate `website` for all 67 counties and all 411 municipalities. Currently 0% populated for both entity types; this directly contradicts the "Access & Visibility" principle in the product's own Overview doc.

**B. Data Freshness & Staleness Indicator (Must)** — Make data age visible and scheduled, not just displayed. Today `metadata.json` has the date but there is no warning when it ages past a reasonable threshold, and the pipeline has no run schedule.

**C. Special District Cohort View (Should)** — Add a purpose-based grouped browsing mode. Purpose is already filterable; it is not yet *browsable as cohorts* (count-per-category directory with drill-in), which is what the roadmap and the JTBD "Discover & Scope" job actually call for.

**D. Entity Comparison View (Should)** — Side-by-side, same-entity-type comparison (2–4 entities), raw fields only, no scoring — extends "structured and comparable" without crossing into recommendation.

**E. Named, Taggable Local Workspaces (Should)** — Multiple named shortlists with tags, still local (no backend/auth), plus JSON export/import as a manual sharing mechanism between teammates. True multi-user shared workspaces require a backend and auth decision that is explicitly out of scope for this spec (§9).

**Out of scope for V3** (see §9 for the full list and reasoning): county ecosystem rollup view, PDF one-pager generation, CRM export destination, expanded special-district financial coverage beyond DFS LOGERx best-effort, and — permanently — scoring, ranking, AI-generated recommendations, outreach/relationship tracking, and cross-selling coordination tools.

---

## 2. Access & Sourcing Data Backfill

### 2.1 Root Cause

Unlike school districts (`11_build_school_districts.js` sources `website` from FLDOE seed data) and special districts (`12_build_special_districts.js` sources `website` from the FloridaCommerce list), no pipeline script has ever populated `website` for counties or municipalities. There is no missing upstream source causing this — it is simply an unbuilt step. The field is correctly typed and gap-labeled in the schema; it is just never written.

### 2.2 Approach

There is no single authoritative, machine-fetchable API that lists official government website URLs for all 478 FL counties/municipalities. The realistic approach is a **maintained seed file**, checked into the repo, versioned like code:

```
scripts/pipeline/seeds/county_contacts.json
scripts/pipeline/seeds/municipality_contacts.json
```

Each entry is keyed by the entity's stable ID (`fips` for counties, `place_fips` for municipalities):

```json
{
  "12001": {
    "website": "https://www.alachuacounty.us",
    "verified_date": "2026-07-01",
    "verified_by": "seed"
  }
}
```

`verified_by` distinguishes a manually confirmed entry (`"manual:<initials>"`) from an unverified placeholder (`"seed"`), so future audits can tell curated data from guessed data.

### 2.3 Coverage Targets (phased, not all-or-nothing)

Trying to hand-verify 478 URLs in one pass is not a well-scoped commitment. V3 sets tiered, checkable targets:

- **Counties: 100% (67/67).** Finite, stable, high-value — every county must have a verified `website`.
- **Municipalities — Tier 1 (the ~80 EDR-reporting / largest municipalities): 100% website.** These are the municipalities partners will shortlist most often.
- **Municipalities — Tier 2 (the remaining ~330 smaller municipalities): best-effort, target ≥50% website coverage at V3 launch, with the remainder explicitly gap-labeled `"unknown"` (not `"unavailable"`) so future pipeline runs know to keep trying rather than treating the gap as permanent.**

### 2.4 Validation

`13_validate.js` gains new checks:
- Fails the build if any county has `website: null` (hard requirement).
- Prints a coverage report: `X/67 counties`, `Y/411 municipalities (Tier 1: A/80, Tier 2: B/331)` for `website`.
- Flags any URL that doesn't parse as valid HTTPS.

---

## 3. Data Freshness & Staleness Indicator

### 3.1 Current State

`public/data/metadata.json` already carries `last_pipeline_run` and `source_versions`, and the footer displays "Data last updated: [date]." There is no threshold logic and no scheduled trigger to re-run the pipeline — a re-run today is a fully manual, unscheduled action.

### 3.2 Staleness Threshold & UI

- Add `STALENESS_THRESHOLD_DAYS = 395` (13 months — one annual refresh cycle plus a 1-month buffer) as a constant in `lib/utils.ts`.
- The footer computes `daysSince(last_pipeline_run)`. When it exceeds the threshold, the footer date renders with a visible warning style (amber background, warning icon) and the text changes to `"Data last updated: [date] — refresh overdue."`
- The same computed staleness state is exposed via a small badge in `TopNav` when stale, so the warning is visible from every page, not just the footer.

### 3.3 Scheduled Pipeline Runs

Add a GitHub Actions workflow (`.github/workflows/refresh-data.yml`) that runs `bash scripts/pipeline/run_all.sh` on a schedule (annually, aligned to when EDR/Census/FLDOE typically publish updated figures — first week of each calendar year) and opens a pull request with the resulting diff to `/public/data/*.json` rather than committing directly. Source data changes should go through the same review as any other change — this is not a case for silent auto-merge, since a bad upstream fetch (e.g., a partial Census response) could silently corrupt shortlisted figures partners are actively citing to clients.

---

## 4. Special District Cohort View

### 4.1 Current State

`purpose_category` (10 categories: Water/Wastewater, Fire/Rescue, Community Development, Transportation, Healthcare/Hospital, Library, Mosquito Control, Housing, Recreation/Parks, Other) is already a filterable multi-select on the Special Districts explore table. What's missing is a *browsable* cohort view — a partner scoping a pursuit around, say, water infrastructure shouldn't have to already know to filter by "Water / Wastewater"; they should be able to see all 10 categories with counts and pick one.

### 4.2 Design

Add a view toggle at the top of `/explore/special-districts`, next to the existing filter panel: **"List View"** (current table, default) and **"By Purpose"** (new).

**By Purpose view:**
```
Special Districts by Purpose

Water / Wastewater (34)         [View all →]
Fire / Rescue (28)              [View all →]
Community Development (41)      [View all →]
Transportation (12)             [View all →]
...
```
Each row is a purpose category with a live count (computed client-side from the already-loaded array — no new data fetch) and a link that applies `?purpose=<Category>` and switches to List View with that filter pre-applied. This reuses the existing filter/URL-state system entirely; it is a new landing layout over data and filtering logic that already exists.

The view mode itself is reflected in the URL: `?view=cohorts` (default is `?view=list`, omitted per the existing "omit defaults from URL" convention).

---

## 5. Entity Comparison View

### 5.1 Design Principle

Comparison must stay a **raw, aligned data view** — same fields side by side, no weighting, no computed "winner." This is the same discipline that governs the rest of the tool (§1, Job 3: "Compare, Not Be Told").

### 5.2 Interaction

- Each explore table row gains a comparison checkbox (in addition to the existing shortlist button), disabled/hidden once 4 entities of that type are selected (2–4 entity limit, same-type only — comparing a county to a special district produces a mismatched field set and isn't a supported use case).
- A persistent "Compare (n)" bar appears at the bottom of the explore page when ≥2 entities are selected, with a "Compare →" button.
- Clicking "Compare" opens `/compare?type=county&ids=county_alachua,county_duval` — a dedicated page (not a modal, so it's a shareable, bookmarkable URL consistent with the rest of the app's URL-state philosophy).

### 5.3 Comparison Page Layout

```
Comparing 3 Counties                                    [← Back to Explore]

                        Alachua County    Duval County    Broward County
Population              279,729           995,567         1,944,375
Median HH Income        $57,566           $61,224         $65,447
Per Capita Income       $35,684           $37,912         $39,801
% Bachelor's+           46.7%             31.2%           35.9%
Total Revenue           $671M             $2.1B           $4.8B
Total Expenditure       $644M             $2.0B           $4.6B
Region                  Northeast         Northeast        Southeast
Website                 [link]            [link]           [link]
                                                        [+ Add all to Shortlist]
```

Rows are the full field set for that entity type (same fields as `EntityDetailModal`), columns are the selected entities. Null values render with the standard gap label, never blank. A single "Add all to Shortlist" action is available; there is no per-cell highlighting, ranking, or "best value" styling — deliberately, to avoid any perception of the tool making a judgment call.

### 5.4 Reuse

`buildChoroplethScale`-style generic patterns don't apply here, but the field-rendering logic already built for `EntityDetailModal` should be extracted into a shared formatter so the comparison table and the detail modal render identical values for identical fields (no risk of the two views disagreeing on a formatted number).

---

## 6. Named, Taggable Local Workspaces

### 6.1 Scope Decision

The MoSCoW analysis called for "shared, taggable, persistent workspaces per pursuit." True multi-user sharing requires a backend and an auth model — both are explicit architecture decisions the product has deliberately avoided (SPEC.md §2.1–2.2: static export, zero backend cost, no runtime API calls; "Authentication/user accounts" listed as out of scope for V1). Reversing that is a bigger call than this spec should make unilaterally — it changes the hosting model, the cost structure, and the security surface of the tool.

**V3 delivers the local, no-backend version of this job**, which covers most of the actual pain (a partner working one pursuit at a time losing their shortlist to a second, unrelated pursuit) without the infra commitment:

### 6.2 Design

- The single global shortlist becomes **multiple named workspaces**, still stored in `localStorage` via the existing Zustand `persist` pattern — same mechanism, restructured data shape.
- Each workspace has: `id`, `name` (e.g., "Alachua County Q3 Pursuit"), `tags` (free-text, e.g., `["water infra", "priority"]`), `items` (same `ShortlistItem[]` as today), `created_at`, `updated_at`.
- A workspace switcher replaces the current single "Shortlist (n)" nav indicator: a dropdown showing all workspaces with item counts, a "+ New Workspace" action, and the active workspace highlighted.
- `/shortlist` becomes `/workspaces/[id]`, defaulting to the most-recently-updated workspace when a bare `/shortlist` link is followed (preserves existing bookmarks/links).

### 6.3 Sharing (without a backend)

- **Export Workspace (JSON)** — downloads the full workspace (name, tags, items with snapshots) as a `.json` file, separate from the existing CSV export (which remains for spreadsheet use).
- **Import Workspace (JSON)** — a teammate can load that file back in via a file picker, creating a new local workspace with the same contents. This is the manual, static-architecture-compatible answer to "shared" — it will not stay live-synced, and the UI should say so plainly ("Imported workspaces are a snapshot, not a live sync").

### 6.4 What This Explicitly Does Not Do

No real-time collaboration, no server-side storage, no user accounts. If partner feedback after V3 shows the JSON export/import pattern is too manual for how teams actually work together, that's the trigger to scope a proper backend + auth workstream as its own spec — not to quietly bolt one on here.

---

## 7. Updated Data Model

### 7.1 No changes to `BaseEntity`, `County`, or `Municipality` interfaces

`website` already exists on `BaseEntity`. §2 is a data-population fix, not a schema change.

### 7.2 New types — `lib/types.ts`

```typescript
// ─── Comparison ───────────────────────────────────────────────

export interface ComparisonState {
  type: EntityType;
  ids: string[]; // 2–4 entity IDs, same type
}

// ─── Workspaces (replaces single-shortlist model) ─────────────

export interface Workspace {
  id: string;              // e.g. "ws_" + crypto.randomUUID()
  name: string;
  tags: string[];
  items: ShortlistItem[];  // unchanged from V1/V2
  created_at: string;      // ISO date
  updated_at: string;      // ISO date
}

export interface WorkspaceExportFile {
  format_version: 1;
  exported_at: string;
  workspace: Workspace;
}
```

### 7.3 Contact seed types

```typescript
// scripts/pipeline internal — not part of the runtime app schema
interface ContactSeedEntry {
  website: string | null;
  verified_date: string;
  verified_by: string; // "seed" | "manual:<initials>"
}
```

---

## 8. Pipeline Changes

### 8.1 New Scripts

| Script | Description | Output |
|---|---|---|
| `14_apply_county_contacts.js` | Reads `seeds/county_contacts.json`, joins on `fips`, writes `website`/`data_gaps` into `counties.json` | Updates `counties.json` in place (post-09) |
| `15_apply_municipality_contacts.js` | Reads `seeds/municipality_contacts.json`, joins on `place_fips`, writes `website`/`data_gaps` into `municipalities.json`, tags each record `contact_tier: 1 \| 2` for coverage reporting | Updates `municipalities.json` in place (post-10) |

### 8.2 Modified Scripts

| Script | Change |
|---|---|
| `13_validate.js` | Add: hard-fail if any county `website === null`; print website coverage report (counties, muni Tier 1, muni Tier 2); validate all populated URLs are well-formed HTTPS |
| `run_all.sh` | Insert `14_apply_county_contacts.js` after `09_build_counties.js`; insert `15_apply_municipality_contacts.js` after `10_build_municipalities.js` |

### 8.3 New Files

```
scripts/pipeline/seeds/county_contacts.json         # 67 entries, manually curated
scripts/pipeline/seeds/municipality_contacts.json   # 411 entries, phased curation (§2.3)
.github/workflows/refresh-data.yml                  # scheduled annual pipeline run → PR
```

---

## 9. Deferred / Out of Scope for V3

Carried over from the MoSCoW analysis so nothing is silently dropped:

| Item | Category | Why deferred |
|---|---|---|
| County ecosystem rollup view (county + its municipalities + school district + special districts on one screen) | Could | Cross-entity nav (V2) already covers the underlying links; this is a UI convenience layer best sequenced after V3's comparison view proves out the pattern for aggregating multiple entities in one view |
| Structured PDF one-pager per entity | Could | Low effort but no dependency on anything else in V3; can be scoped independently at any time |
| CRM export destination (Salesforce/HubSpot push) | Could | Requires picking a specific CRM target and auth scopes — a partner/IT decision, not a product design decision |
| Expanded special district financial coverage beyond DFS LOGERx | Could | Bounded by what districts actually report to the state; ongoing data-quality work, not a buildable feature with a clear finish line |
| True multi-user, real-time shared workspaces | Should → deferred | Requires a backend + auth architecture decision (see §6.1) that should be its own spec, sized against actual demand after the local/JSON-export version (§6) ships |
| Scoring, ranking, or AI-generated recommendations | Won't (permanent) | Core differentiator vs. a generic BI dashboard — this is an identity decision, not a backlog item |
| Outreach / relationship / CRM tracking inside the tool | Won't (permanent) | Would turn C-Discover into a system of record, contradicting its "starting point, not decision engine" positioning |
| Cross-selling coordination tools | Won't (permanent) | Belongs to internal practice-management tooling, not this product |

---

## 10. Feature Requirements

EARS format. V3 requirements are prefixed `V3-`.

### 10.1 Access & Sourcing Data

**V3-A-01:** THE SYSTEM SHALL display a non-null `website` for all 67 counties.
**V3-A-03:** THE SYSTEM SHALL display a non-null `website` for all Tier 1 (EDR-reporting) municipalities.
**V3-A-04:** THE SYSTEM SHALL display a non-null `website` for at least 50% of Tier 2 municipalities at V3 launch, with the remainder gap-labeled `"unknown"`.
**V3-A-05:** WHEN `13_validate.js` runs, THE SYSTEM SHALL fail the build if any county has `website: null`.
**V3-A-06:** THE SYSTEM SHALL print a website coverage report (counties, muni Tier 1, muni Tier 2) after every pipeline run.

### 10.2 Data Freshness

**V3-F-01:** THE SYSTEM SHALL display a staleness warning in the footer and nav bar WHEN `last_pipeline_run` is more than 395 days old.
**V3-F-02:** THE SYSTEM SHALL run the data pipeline on an annual schedule via CI and open a pull request with the resulting data diff, rather than committing directly.

### 10.3 Special District Cohorts

**V3-C-01:** THE SYSTEM SHALL provide a "By Purpose" view toggle on the Special Districts explore page, in addition to the existing "List View."
**V3-C-02:** WHEN in "By Purpose" view, THE SYSTEM SHALL display all 10 purpose categories with a live count of special districts in each.
**V3-C-03:** WHEN a user clicks a purpose category in "By Purpose" view, THE SYSTEM SHALL switch to List View with that category applied as an active filter.
**V3-C-04:** THE SYSTEM SHALL reflect the active view mode in the URL (`?view=cohorts`), omitted when set to the default List View.

### 10.4 Comparison

**V3-CMP-01:** THE SYSTEM SHALL allow a user to select 2–4 entities of the same type from any explore table for comparison.
**V3-CMP-02:** WHEN 2 or more entities are selected, THE SYSTEM SHALL display a persistent "Compare (n)" action.
**V3-CMP-03:** WHEN a user clicks "Compare," THE SYSTEM SHALL navigate to `/compare?type=[type]&ids=[comma-separated ids]` displaying all fields for the selected entities as aligned columns.
**V3-CMP-04:** THE SYSTEM SHALL NOT apply any visual ranking, highlighting, or scoring to values in the comparison view.
**V3-CMP-05:** THE SYSTEM SHALL display gap labels for null values in the comparison view, consistent with G-04.
**V3-CMP-06:** THE SYSTEM SHALL allow adding all compared entities to a workspace in one action.

### 10.5 Workspaces

**V3-W-01:** THE SYSTEM SHALL support multiple named, persistent local workspaces, each with a name and free-text tags.
**V3-W-02:** THE SYSTEM SHALL provide a workspace switcher in the nav bar showing all workspaces with item counts.
**V3-W-03:** THE SYSTEM SHALL allow exporting a workspace as a JSON file containing its name, tags, and item snapshots.
**V3-W-04:** THE SYSTEM SHALL allow importing a workspace JSON file, creating a new local workspace from its contents.
**V3-W-05:** THE SYSTEM SHALL label imported workspaces as a point-in-time snapshot, not a live sync, in the UI.
**V3-W-06:** WHEN a user visits `/shortlist`, THE SYSTEM SHALL redirect to the most-recently-updated workspace at `/workspaces/[id]`.

---

## 11. Task Breakdown

### Phase 0: Access & Sourcing Data (Must)

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-01 | Curate `seeds/county_contacts.json` — 67 verified county websites | — | 67/67 entries present; all URLs resolve (manual spot-check + automated HTTPS format check) |
| V3-T-02 | Curate `seeds/municipality_contacts.json` Tier 1 (~80 EDR-reporting municipalities) | — | 80/80 Tier 1 entries present |
| V3-T-03 | Curate `seeds/municipality_contacts.json` Tier 2, targeting ≥50% of remaining ~331 | V3-T-02 | Coverage report shows ≥50% Tier 2 |
| V3-T-04 | Write `14_apply_county_contacts.js` | V3-T-01 | `counties.json` has `website` populated for all 67 after re-run |
| V3-T-05 | Write `15_apply_municipality_contacts.js`, tagging `contact_tier` | V3-T-02, V3-T-03 | `municipalities.json` reflects seed data; tier field present |
| V3-T-06 | Update `13_validate.js` with hard-fail + coverage report | V3-T-04, V3-T-05 | Validation fails intentionally on a test record with null county website; passes on real data |
| V3-T-07 | Update `run_all.sh` sequencing | V3-T-04, V3-T-05 | Full pipeline run produces correct final JSON |

### Phase 1: Data Freshness (Must)

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-10 | Add `STALENESS_THRESHOLD_DAYS` + `isStale()` helper to `lib/utils.ts` | — | Unit test: date 396 days ago → stale; 394 days ago → not stale |
| V3-T-11 | Update footer to show warning styling + copy when stale | V3-T-10 | Manually set `last_pipeline_run` to an old date; footer shows warning |
| V3-T-12 | Add staleness badge to `TopNav` | V3-T-10 | Badge appears app-wide when stale |
| V3-T-13 | Write `.github/workflows/refresh-data.yml` (annual cron → run pipeline → open PR) | — | Workflow YAML validates; manually triggered run opens a PR with data diff |

### Phase 2: Special District Cohort View (Should)

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-20 | Build "By Purpose" cohort component (counts per category, computed client-side) | — | Counts match filtered table counts for each category |
| V3-T-21 | Add List View / By Purpose toggle to Special Districts explore page | V3-T-20 | Toggle switches views; state reflected in `?view=` |
| V3-T-22 | Wire cohort category click → List View with filter applied | V3-T-20, V3-T-21 | Clicking "Water / Wastewater (34)" lands on filtered list showing exactly 34 results |

### Phase 3: Comparison View (Should)

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-30 | Add comparison checkbox to `EntityTable` rows, capped at 4, same-type enforced | — | Selecting a 5th entity is blocked with a message; cross-type selection is blocked |
| V3-T-31 | Build persistent "Compare (n)" bar | V3-T-30 | Appears at 2+ selections; disappears at 0–1 |
| V3-T-32 | Extract shared field-formatting logic from `EntityDetailModal` into a reusable module | — | Detail modal and comparison view render identical formatted values for the same field |
| V3-T-33 | Build `/compare` page reading `?type=&ids=` | V3-T-32 | Direct URL navigation renders correct comparison table |
| V3-T-34 | Add "Add all to Shortlist/Workspace" action on comparison page | V3-T-33, Phase 4 | All compared entities appear in active workspace after click |

### Phase 4: Named, Taggable Workspaces (Should)

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-40 | Migrate `lib/shortlist.ts` Zustand store from single `items[]` to `workspaces: Workspace[]` + `activeWorkspaceId`, with a one-time migration of any existing localStorage shortlist into a default workspace named "My Shortlist" | — | Existing users' current shortlist is preserved as their first workspace after upgrade; no data loss |
| V3-T-41 | Build workspace switcher dropdown in `TopNav` | V3-T-40 | Shows all workspaces, counts, "+ New Workspace" |
| V3-T-42 | Rename `/shortlist` route to `/workspaces/[id]`; add redirect from bare `/shortlist` to most-recent workspace | V3-T-40 | Old bookmarked `/shortlist` links still resolve correctly |
| V3-T-43 | Add tag input/display to workspace UI | V3-T-40 | Tags persist across refresh |
| V3-T-44 | Build JSON export (`lib/export.ts` addition) | V3-T-40 | Downloaded file matches `WorkspaceExportFile` schema |
| V3-T-45 | Build JSON import (file picker → new workspace) | V3-T-44 | Importing a previously exported file recreates an equivalent workspace, labeled as a snapshot |

### Phase 5: Verification

| ID | Task | Depends On | Verification |
|---|---|---|---|
| V3-T-50 | Full pipeline re-run; confirm §12 data acceptance criteria | Phase 0 | All pass |
| V3-T-51 | `npx tsc --noEmit` — zero errors | All implementation tasks | Clean |
| V3-T-52 | `next build` — zero errors/warnings | V3-T-51 | Clean build |
| V3-T-53 | Manual regression: verify all V1 and V2 acceptance criteria still hold (workspace migration didn't break existing shortlist/export flows) | All | Full checklist pass |
| V3-T-54 | Accessibility spot-check on new UI (cohort toggle, compare bar, workspace switcher) — keyboard nav + `aria-label` conventions per AGENTS.md | Phases 2–4 | No regressions vs. existing components |

---

## 12. Acceptance Criteria

V3 is complete when ALL of the following are true:

**Access & Sourcing**
1. All 67 counties have a non-null, valid-HTTPS `website`.
2. All Tier 1 (~80) municipalities have a non-null, valid-HTTPS `website`.
3. At least 50% of Tier 2 municipalities have a non-null `website`; the remainder are gap-labeled `"unknown"`.
4. `13_validate.js` fails the build if any county has a null website.
5. A coverage report prints after every pipeline run.

**Data Freshness**
6. The footer and nav bar display a visible staleness warning when data is older than 395 days.
7. A scheduled CI workflow runs the pipeline annually and opens a PR with the resulting diff.

**Special District Cohorts**
8. The Special Districts explore page has a working List View / By Purpose toggle.
9. By Purpose view shows accurate live counts for all 10 categories.
10. Clicking a category lands on List View filtered to exactly that category.

**Comparison**
11. Users can select 2–4 same-type entities from any explore table and reach a working `/compare` view.
12. The comparison view shows all fields as aligned columns with no scoring, ranking, or highlighting.
13. Gap labels appear for null values in the comparison view.
14. All compared entities can be added to a workspace in one action.

**Workspaces**
15. Existing single-shortlist users are migrated to a default named workspace with zero data loss.
16. Multiple named, tagged workspaces can be created, switched between, and persist across refresh.
17. A workspace can be exported to JSON and re-imported to recreate an equivalent workspace, clearly labeled as a snapshot.
18. `/shortlist` still resolves (redirects to the most-recent workspace).

**Build & Regression**
19. `npx tsc --noEmit` and `next build` complete with zero errors/warnings.
20. All V1 (SPEC.md §12) and V2 (SPEC_V2.md §10) acceptance criteria remain satisfied.
