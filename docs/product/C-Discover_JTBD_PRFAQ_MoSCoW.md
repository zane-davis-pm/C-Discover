# C-Discover: Current State & Future State Analysis

**Prepared for:** Partner discussion — public sector consulting practice
**Method:** Jobs to Be Done → PR-FAQ → MoSCoW
**Basis:** C-Discover_Overview.txt, SPEC.md (V1), SPEC_V2.md, and inspection of the live codebase and data files as of this review.

A note on evidence: no formal user interviews have been logged for this tool yet. The "jobs" below are synthesized from the product's own stated purpose and principles (Overview, Strategic Plan) and from what the current build actually does — not from transcripts. Before finalizing a roadmap, we'd recommend validating these jobs against 5–10 real users (partners and staff who've used it on a live pursuit).

---

## 1. Jobs to Be Done

Four core jobs emerge. Every feature in the tool — built or proposed — should trace to one of these.

**Job 1 — Discover & Scope.**
*"When I'm starting a Florida pursuit and don't know the landscape yet, I want to quickly see which counties, municipalities, school districts, and special districts exist and roughly how big/relevant each is, so I can scope a target list without days of manual research."*
Evidence: "Rapidly generate defensible, high-quality initial target lists across Florida's public sector" is stated as the tool's primary use case; the Strategic Plan names "refreshed target lists" as a 2026 marketing priority and Florida as a Proactive Geography.

**Job 2 — Trust & Defend.**
*"When a partner or client questions why an entity is on our list, I want every number backed by a named, dated, official source, so I can defend the list without having to re-research it live."*
Evidence: "Credible and Source-Backed Data" is a first-class product principle — source links, gap labels, last-updated indicators — with the explicit outcome "defensible, trustworthy outputs."

**Job 3 — Compare, Not Be Told.**
*"When I'm scanning many entities, I want the same fields laid out the same way for comparable entity types, so I can apply my own judgment instead of the tool telling me who's 'best.'"*
Evidence: "Structured and Comparable Outputs" and the explicit non-goal "Does not interpret or evaluate opportunities" — this is a deliberate positioning choice, not a missing feature.

**Job 4 — Export & Activate.**
*"When I've built a shortlist, I want to get it out of the browser and into whatever I'm using next — a GTM deck, an internal review, a CRM import — in one click, with the sourcing intact."*
Evidence: "Core Output: Exportable Shortlists" section and the CSV export spec (SPEC.md §9), which explicitly carries source citations into the export.

Every shipped feature (explore tables, filters, map, shortlist, CSV export, source/gap labeling) maps cleanly to one of these four jobs. Nothing in the current build is unaccounted for — the tool has stayed disciplined about scope. The one candidate "job" the docs gesture at but don't fully serve yet is **first contact** ("Access & Visibility" — official website links) — see gap below.

---

## 2. Current State

### What's actually built (verified against the live data and code, not just the spec)

The build is further along than a strict "V1 only" read of the spec would suggest — most of V2 has already shipped:

| Area | Status |
|---|---|
| Counties (67), full demographic + fiscal data | Done |
| Municipalities (411) | Done — and the V2 data-quality fixes (name suffix stripped, county resolved via FIPS join, no "Unknown" counties) are already live in the data |
| Municipality financials | Partial by design — 73 of 411 have revenue/expenditure (EDR only reports above a threshold); the rest are correctly gap-labeled "Unavailable," not blank |
| School districts (67) | Elevated to full decision layer — all 67 have revenue, expenditure, and expenditure-per-FTE populated; no discovery-level disclaimer |
| Special districts (179) | Discovery-level, as designed — financials are null for all 179 (labeled, not blank); 137 of 179 have a website |
| Interactive map | Both Counties and Municipalities choropleth modes are live, with full popups and shortlist buttons in both modes |
| Cross-entity navigation | "Related Entities" section on county detail (→ municipalities, school district, special districts) and "Parent County" link on municipality detail are both implemented |
| Shortlist + CSV export | Full mixed-entity shortlist, localStorage-persisted, source-cited CSV export |
| Agent/URL navigability | Filter/sort/page state fully in URL; `data-entity-id` and `aria-label` conventions in place per AGENTS.md |

**Job coverage today:** Job 1 (Discover), Job 3 (Compare), and Job 4 (Export) are well served. Job 2 (Trust & Defend) is mostly served — sourcing and gap labels exist — but has one real hole described below.

### The one gap that undercuts the pitch

Every county and every municipality currently has `website: null` — zero populated, across all 478 records. Only school districts (67/67) and most special districts (137/179) have a website. This directly contradicts the "Access & Visibility" pillar the Overview promises ("official website entry points") and quietly weakens Job 4 — a shortlist exported today gives you the *who* and *how big*, but not the *where do I click next* for the two entity types partners will most often shortlist. This is the single highest-leverage fix before pitching the tool as complete.

---

## 3. Future State — PR-FAQ

### Press Release (as if V3 has shipped)

**C-Discover becomes the single, credible entry point for every Florida public-sector pursuit**

Today, [Firm] launches the full C-Discover platform: one tool covering all 67 counties, all ~411 municipalities, all 67 school districts, and all ~179 special districts in Florida — with a website link for every entity, cohort views for special districts grouped by purpose (water, fire, transportation, etc.), side-by-side comparison within an entity class, and saved, taggable workspaces that persist across a pursuit team.

"I used to spend the first two days of any Florida pursuit just figuring out who exists and whether the numbers I found were even current. Now I open C-Discover, filter to my region and size band, build a shortlist with sourced financials already attached, and export straight into our GTM deck — in under twenty minutes." — *illustrative partner quote, pending a real one*

C-Discover remains deliberately neutral: it does not score, rank, or recommend. It gives partners a structured, defensible starting point and gets out of the way.

### FAQ

**Who is this for?**
Partners and pursuit teams at public-sector consulting firms who need a fast, credible way to scope and shortlist Florida government entities before a proposal or GTM push — not analysts building a full market model, and not a system of record for active client relationships.

**What does it explicitly NOT do?**
No scoring, ranking, or AI-generated recommendations. No outreach, relationship, or CRM tracking. No cross-selling workflow. It stops at "here is a credible, exportable list" — everything after that is partner judgment.

**What's the simplest version that's still true to this press release?**
The current build (V1 + most of V2) already delivers discover/compare/export for four entity types with sourcing and gap labeling. The minimum addition that makes the "full platform" claim honest is: website access for counties and municipalities, plus special district cohort grouping (the other entity type still discovery-only in practice). Comparison views and saved workspaces are real value-adds but not required to make the press release above true.

**What could go wrong?**
- *Data staleness:* EDR and Census sources refresh annually; if the pipeline isn't re-run on schedule, "last updated" dates will quietly age past a year and partners may cite stale figures in front of a client.
- *Coverage illusion:* Special district financials are structurally sparse (most simply don't report to DFS LOGERx) — "full platform" messaging has to keep the gap-label discipline so partners don't assume absence of data means the district is small or irrelevant.
- *Scope creep pressure:* Every partner conversation will surface a request for scoring/prioritization or CRM integration. The product's credibility rests on staying neutral; each request should be tested against the "does this make C-Discover a decision engine?" line and declined if so.

---

## 4. MoSCoW — Prioritized Build List

| Feature | Category | Job(s) Served | Notes |
|---|---|---|---|
| Populate `website` for all 67 counties and 411 municipalities | **Must** | Job 2, Job 4 | Highest-leverage fix; currently 0% populated for these two entity types, directly undercutting the "Access & Visibility" claim |
| Re-run/schedule the data pipeline on a fixed cadence (annual, tied to EDR/Census refresh) with a visible staleness warning past 13 months | **Must** | Job 2 | Protects the "defensible" promise; currently a manual, unscheduled process |
| Special district cohort grouping (purpose-based: Water/Wastewater, Fire/Rescue, Transportation, etc.) | **Should** | Job 1, Job 3 | Named explicitly in the V3 roadmap; special districts are the last entity type still "discovery only" |
| Side-by-side comparison view within an entity class (e.g., 3 counties, columns aligned) | **Should** | Job 3 | Extends "structured and comparable" without introducing scoring — must stay a raw-data view, not a weighted comparison |
| Saved workspaces / tags (multi-session, shareable within a pursuit team) | **Should** | Job 1, Job 4 | Current shortlist is single-device (localStorage); teams pursuing the same target jointly need a shared list |
| County ecosystem view (aggregate rollup: county + its municipalities + school district + special districts on one screen) | **Could** | Job 1, Job 3 | Named in V3 roadmap; nice-to-have once cross-entity nav (already shipped) proves useful |
| Structured PDF one-pager per entity (for partner meeting prep) | **Could** | Job 2, Job 4 | Low effort given data already exists; not required for the core loop |
| CRM export destination (e.g., direct push to Salesforce/HubSpot as a contact/account shell) | **Could** | Job 4 | Export destination only — must not become relationship tracking inside C-Discover itself |
| Improve special district financial coverage beyond DFS LOGERx best-effort | **Could** | Job 2 | Bounded by what districts actually report; treat as ongoing data-quality work, not a feature |
| Scoring, ranking, or AI-generated target recommendations | **Won't (ever)** | — | Explicit, permanent non-goal — this is the tool's core differentiator versus a generic BI dashboard |
| Outreach / relationship / CRM tracking inside the tool | **Won't (this time)** | — | Explicitly out of scope per product principles; revisit only if partners want C-Discover to become a system of record, which would change its identity |
| Cross-selling coordination tools | **Won't (this time)** | — | Out of scope per Overview; belongs to internal practice-management tooling, not this tool |

**Sanity check:** every Must have maps to a job (2 and 4), and every job has coverage — Job 1 and Job 3 are already fully served by the current build, so nothing new is Must-have for them. That asymmetry is itself a good pitch point: the foundation is solid; the fixes left are narrow and known.

---

## 5. Summary — Current vs. Future in One View

| | Current State | Future State |
|---|---|---|
| **Coverage** | 4 entity types, ~724 entities, statewide | Same coverage, fully activated (access links closed) |
| **Trust** | Sourced + gap-labeled, but access fields empty for 2 of 4 entity types | Every entity has a working next-click (website) |
| **Comparability** | Strong within entity type; no cross-instance comparison view | Adds opt-in side-by-side comparison, still unscored |
| **Special districts** | Discovery-only, financials sparse by nature | Cohort-grouped by purpose for faster scanping |
| **Collaboration** | Single-browser shortlist | Shared, taggable, persistent workspaces per pursuit |
| **Positioning** | "A clean, comparable foundation" (own words, V1 goal) | "The single credible entry point for Florida public-sector pursuits" — same neutrality, wider reach |

The pitch to partners: the hard, unglamorous work — 67 counties, 411 municipalities, 67 school districts, 179 special districts, all sourced and gap-labeled, all URL-navigable, all exportable — is already done and already ahead of its own spec. What's left is narrow, named, and doesn't touch the thing that makes this tool defensible: it still never tells a partner who to chase.
