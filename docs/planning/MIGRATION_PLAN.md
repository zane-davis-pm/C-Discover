# C-Discover Migration Plan: Public Static Tool → Internal Multi-User Platform

This plan converts C-Discover from a static, no-auth, no-backend tool into an internal
enterprise app with SSO, shared shortlists/notes, and a data model ready for
multi-state expansion. It's organized into phases; each has a goal, concrete tasks,
file-level pointers into the existing repo, and a "done when" check. Phases 1-4 are
required for launch. Phases 5-6 can trail behind launch but should be started early
because they affect schema decisions made in Phase 2.

Estimated total effort for a single developer: 3-5 weeks, assuming Azure/M365 admin
access is available when needed (Phase 0).

---

## Phase 0 — Decisions & Access (before writing code)

**Goal:** Remove blockers that require someone outside the dev seat.

- Confirm who administers your firm's Azure / Microsoft 365 tenant and get them
  looped in — you'll need them for Phase 1 and Phase 4.
- Decide DB host: recommend **Azure Database for PostgreSQL (Flexible Server)** to
  stay in one vendor, or **Neon**/**Supabase** if you'd rather not touch Azure infra
  directly. Either works with the schema in Phase 2.
- Decide hosting target: **Azure Static Web Apps** (simplest, has a built-in
  auth/proxy layer that pairs well with Entra ID) or **Azure App Service** (more
  control, needed if you outgrow SWA's limits). Recommendation: start with Static
  Web Apps.
- Get a resource group / subscription created (or confirm one exists) so you're not
  blocked later on procurement.

**Done when:** you have an Azure resource group, a Postgres instance (even empty),
and a contact who can register an Entra ID app.

---

## Phase 1 — Authentication (SSO)

**Goal:** Every user logs in with their firm Microsoft 365 account; the app knows
who they are.

1. Register an app in Entra ID (your Azure/M365 admin does this): note the
   `Client ID`, `Client Secret`, `Tenant ID`.
2. Add **NextAuth.js (Auth.js v5)** to the project:
   `npm install next-auth@beta`
3. New files:
   - `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler with the
     Microsoft Entra ID provider, restricted to your tenant ID (not multi-tenant).
   - `lib/auth.ts` — exports `auth()`, `signIn`, `signOut` helpers and the
     NextAuth config (session strategy: JWT is fine at this scale).
   - `middleware.ts` — gate all routes except `/api/auth/*` behind an active
     session; redirect unauthenticated users to sign-in.
4. Update `.env.local` (and the real secrets store — see Phase 4) with
   `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
   `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, `AUTH_SECRET`.
5. Add a minimal top-nav user badge (name/email from session, sign-out button) —
   this is the only UI change needed for Phase 1.

**Done when:** visiting the deployed URL forces an M365 login, and an unlisted
person outside your tenant cannot get in.

---

## Phase 2 — Database & API Layer

**Goal:** Give shortlists and notes a real, shared home instead of localStorage.

1. Add an ORM: `npm install drizzle-orm drizzle-kit pg` (Prisma is an equally fine
   choice — pick whichever your team already knows).
2. Schema (`lib/db/schema.ts`):
   - `users` — `id`, `email`, `display_name` (populated from SSO session on first
     login; you don't need to build user management UI, just an upsert-on-login).
   - `shortlist_items` — `id`, `entity_id`, `entity_type`, `user_id`, `list_id`
     (nullable — null means "personal"), `created_at`.
   - `shared_lists` — `id`, `name`, `owner_user_id`, `created_at` (optional for v1;
     add if "team shortlist" is a launch requirement, otherwise defer).
   - `notes` — `id`, `entity_id`, `entity_type`, `user_id`, `body`, `created_at`,
     `updated_at`.
   - Add a `classification` enum column (`public` | `internal`) to `notes` and
     `shared_lists` now, default `public`, unused until Phase 6 — cheap to add
     today, expensive to retrofit later.
3. API routes (Next.js Route Handlers, all under `app/api/`):
   - `POST/DELETE /api/shortlist` — add/remove an entity for the current user
     (reads `entity_id` + `entity_type`, resolves `user_id` from session).
   - `GET /api/shortlist` — list current user's (and shared, if applicable) items.
   - `POST/GET/PATCH/DELETE /api/notes` — CRUD scoped to `entity_id`, always
     stamping `user_id` from the session server-side (never trust a client-passed
     user id).
4. Every route handler must call `auth()` first and 401 if there's no session —
   this is your access control, not the DB.

**Done when:** two different logged-in users see each other's shared shortlist
items and notes on the same entity, each attributed to the correct person.

---

## Phase 3 — Migrate the Frontend Off localStorage

**Goal:** Swap the data source under the existing UI without a visual rewrite.

1. `lib/shortlist.ts` — replace the Zustand `persist` (localStorage) middleware
   with a Zustand store hydrated from `GET /api/shortlist` on load, and issue
   `POST`/`DELETE` calls on add/remove (optimistic update, roll back on failure).
   Keep the existing store shape/interface so components consuming it
   (`data-entity-id`, shortlist buttons, `aria-label`s) don't need to change.
2. Add a lightweight notes UI: a panel or modal on the entity detail view, calling
   the new `/api/notes` routes. Reuse existing component patterns (Radix Dialog is
   already a dependency).
3. Add a one-time migration prompt: on first login after this ships, read any
   existing localStorage shortlist and offer to import it into the user's account,
   then stop reading localStorage entirely.
4. Update `AGENTS.md` and `SPEC.md` — the "no backend, no auth" language is now
   false; rewrite those sections so future contributors (human or AI) don't revert
   this work. Same for `C-Discover_Constitution.txt` if it encodes the same
   constraint.

**Done when:** the app has zero remaining localStorage reads/writes for shortlist
data, and the migration prompt works against a browser with pre-existing local data.

---

## Phase 4 — Deployment & Secrets

**Goal:** Ship it somewhere your team can reach and nobody else can.

1. Set up Azure Static Web Apps (or App Service) connected to your repo via GitHub
   Actions (there's already a `.github/` folder — extend it rather than
   replacing).
2. Move all secrets (`AUTH_*`, DB connection string) into Azure Key Vault or the
   SWA/App Service application settings — never commit them, and stop relying on
   `.env.local` beyond local dev.
3. Confirm the deployed URL is not indexed/discoverable (robots.txt disallow all,
   no public marketing links) — the SSO gate is your real protection, but don't
   rely on security-through-obscurity alone.
4. Set up a staging slot or preview-deployment flow so PRs can be reviewed before
   hitting the team.
5. Basic monitoring: enable Azure Application Insights (or equivalent) so you'll
   notice auth failures or API errors instead of hearing about them from users.

**Done when:** the team can reach the app at an internal URL, SSO works end to end
in production (not just locally), and no secrets live in the repo.

---

## Phase 5 — Multi-State Data Model (prep now, build later)

**Goal:** Avoid a schema rewrite when Texas/California get added.

1. Add a `state` field to every entity type in `lib/types.ts`
   (`County`, `Municipality`, `SchoolDistrict`, `SpecialDistrict`).
2. Restructure `/public/data/` by state: `/public/data/fl/counties.json`,
   `/public/data/fl/counties.geo.json`, etc. Update `lib/data.ts` loaders to accept
   a state parameter (default `fl` until more states exist).
3. Parameterize `scripts/pipeline/run_all.sh` and its underlying scripts to accept
   a state argument instead of hardcoding Florida-specific sources — even if you
   only run it for FL today, the script shouldn't assume FL internally.
4. Defer the actual UI state-switcher until you have a second state's data ready;
   don't build it speculatively.

**Done when:** adding a second state means adding a data directory and a pipeline
run, not touching `lib/types.ts`, `lib/filters.ts`, or component code.

---

## Phase 6 — Access Control for Future Proprietary Data

**Goal:** Be ready if firm-internal data gets mixed in, without redoing Phase 2.

1. The `classification` column added in Phase 2 becomes load-bearing: API routes
   filter out `internal` records for users without an `internal_data` flag (add
   this as a boolean on `users` once needed).
2. If/when this happens, also add an audit log table (`who viewed/exported what,
   when`) — proprietary data usually comes with an expectation of traceability.
3. Nothing to build today beyond what Phase 2 already scaffolds — this phase is a
   placeholder so the requirement doesn't get lost.

---

## Suggested Sequencing

| Week | Focus |
|---|---|
| 1 | Phase 0 (access/decisions) + Phase 1 (SSO) |
| 2 | Phase 2 (DB + API routes) |
| 3 | Phase 3 (frontend migration off localStorage) |
| 4 | Phase 4 (deployment, secrets, monitoring) |
| 5 | Phase 5 (multi-state schema prep) — can overlap with Phase 4 |

Phase 6 stays dormant until proprietary data is actually on the roadmap.

---

## Risks to Flag Now

- **Entra ID app registration** typically needs tenant-admin approval — the
  single biggest scheduling risk if your firm has a slow IT request process.
  Start Phase 0 immediately for this reason.
- **Data migration from localStorage** is one-way and per-browser — users who
  don't log in before you sunset the old code path lose their local shortlist.
  Communicate a cutover date to the team.
- **AGENTS.md/SPEC drift**: if these docs aren't updated in Phase 3, any future AI
  or human contributor working from them will re-introduce "no backend, no auth"
  assumptions and quietly break things.
