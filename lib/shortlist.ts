"use client";

// ============================================================
// C-Discover — Workspace Store (formerly single-shortlist store)
// V3-T-40: SPEC_V3.md §6, §7.2 — migrates the single global
// shortlist into multiple named, taggable, local workspaces.
//
// Back-compat: `items`, `add`, `remove`, `clear`, `has` all
// continue to exist and operate transparently on the *active*
// workspace, so every existing call site (ShortlistButton,
// ShortlistTable, ExportButton, map layers, /compare) keeps
// working without modification.
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ShortlistItem,
  ShortlistSnapshot,
  AnyEntity,
  Workspace,
  WorkspaceExportFile,
} from "@/lib/types";
import { DEFAULT_STATE } from "@/lib/data";
import { useNotes, noteKey } from "@/lib/notes";
import type { EntityNote } from "@/lib/types";

const DEFAULT_WORKSPACE_NAME = "My Shortlist";
const STORAGE_KEY = "c-discover-shortlist";
const STORAGE_VERSION = 1;

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeWorkspace(name: string, tags: string[] = []): Workspace {
  const ts = nowIso();
  return {
    id: genId("ws"),
    name,
    tags,
    items: [],
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Deterministic default workspace used ONLY as the store's pre-hydration
 * initial state. Must not use random IDs or Date.now() — this literal is
 * constructed identically during server render and the pre-hydration
 * client render, avoiding an SSR/client hydration mismatch. The real
 * persisted (or freshly-migrated) workspace replaces this synchronously
 * on the client once localStorage is read.
 */
function makeInitialWorkspace(): Workspace {
  return {
    id: "ws_default",
    name: DEFAULT_WORKSPACE_NAME,
    tags: [],
    items: [],
    created_at: "1970-01-01T00:00:00.000Z",
    updated_at: "1970-01-01T00:00:00.000Z",
  };
}

/**
 * Composite key used for shortlist membership checks (`has`/`remove`).
 * Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): entity ids are only unique
 * within a state, so plain `entity.id` is not a safe membership key once
 * a second state's data can be loaded — a Texas county with the same id
 * as a Florida county must never register as "already in shortlist."
 */
function membershipKey(id: string, state: string): string {
  return `${state}:${id}`;
}

/** Build a snapshot from any entity type for shortlist storage + CSV export */
function buildSnapshot(entity: AnyEntity): ShortlistSnapshot {
  const base: ShortlistSnapshot = {
    name: entity.name,
    county: entity.county,
    type: entity.type,
    website: entity.website,
    state: entity.state,
    data_gaps: entity.data_gaps,
  };

  if (entity.type === "county") {
    return {
      ...base,
      population: entity.population,
      population_year: entity.population_year,
      median_hh_income: entity.median_hh_income,
      pct_bachelors_plus: entity.pct_bachelors_plus,
      poverty_rate: entity.poverty_rate,
      income_source: entity.income_source,
      total_revenue: entity.total_revenue,
      fiscal_year: entity.fiscal_year,
      fiscal_source: entity.fiscal_source,
      population_growth_rate: entity.population_growth_rate,
      population_growth_years: entity.population_growth_years,
      population_growth_source: entity.population_growth_source,
    };
  }

  if (entity.type === "municipality") {
    return {
      ...base,
      population: entity.population,
      population_year: entity.population_year,
      median_hh_income: entity.median_hh_income,
      pct_bachelors_plus: entity.pct_bachelors_plus,
      poverty_rate: entity.poverty_rate,
      income_source: entity.income_source,
      total_revenue: entity.total_revenue,
      fiscal_year: entity.fiscal_year,
      fiscal_source: entity.fiscal_source,
      population_growth_rate: entity.population_growth_rate,
      population_growth_years: entity.population_growth_years,
      population_growth_source: entity.population_growth_source,
    };
  }

  if (entity.type === "school_district") {
    return {
      ...base,
      enrollment_pk12: entity.enrollment_pk12,
      enrollment_fte: entity.enrollment_fte,
      enrollment_year: entity.enrollment_year,
      enrollment_source: entity.enrollment_source,
      total_revenue: entity.total_revenue,
      expenditure_per_fte: entity.expenditure_per_fte,
      fiscal_year: entity.fiscal_year,
      fiscal_source: entity.fiscal_source,
      population_growth_rate: entity.population_growth_rate,
      population_growth_source: entity.population_growth_source,
    };
  }

  // special_district
  return {
    ...base,
    purpose_category: entity.purpose_category,
    dependent: entity.dependent,
    total_revenue: entity.total_revenue,
    fiscal_year: entity.fiscal_year,
    fiscal_source: entity.fiscal_source,
    population_growth_rate: entity.population_growth_rate,
    population_growth_source: entity.population_growth_source,
  };
}

interface ShortlistStore {
  workspaces: Workspace[];
  activeWorkspaceId: string;

  /** Mirror of the active workspace's items — kept in sync by every mutator below. */
  items: ShortlistItem[];

  // ── Back-compat API (operates on the active workspace) ──
  // `state` scopes membership checks per Phase 3 (multi-state) so an id
  // from one state is never mistaken for the same id in another state.
  // Callers that omit it fall back to DEFAULT_STATE (pre-multi-state call
  // sites); every updated call site below now passes entity.state.
  add: (entity: AnyEntity) => void;
  remove: (id: string, state?: string) => void;
  clear: () => void;
  has: (id: string, state?: string) => boolean;

  // ── Workspace management (V3-T-40/41/43) ──
  getActiveWorkspace: () => Workspace | undefined;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string, tags?: string[]) => string;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setWorkspaceTags: (id: string, tags: string[]) => void;
  mostRecentWorkspaceId: () => string | undefined;

  // ── Import/export (V3-T-44/45) ──
  exportWorkspace: (id: string) => WorkspaceExportFile | undefined;
  importWorkspace: (file: WorkspaceExportFile) => string;
}

/** Re-derives the `items` mirror field from workspaces + activeWorkspaceId. */
function withSyncedItems(
  workspaces: Workspace[],
  activeWorkspaceId: string
): Pick<ShortlistStore, "items"> {
  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  return { items: active ? active.items : [] };
}

function touchWorkspace(ws: Workspace, items: ShortlistItem[]): Workspace {
  return { ...ws, items, updated_at: nowIso() };
}

export const useShortlist = create<ShortlistStore>()(
  persist(
    (set, get) => ({
      workspaces: [makeInitialWorkspace()],
      activeWorkspaceId: "ws_default",
      items: [],

      add: (entity) => {
        if (get().has(entity.id, entity.state)) return;
        set((state) => {
          const workspaces = state.workspaces.map((ws) =>
            ws.id === state.activeWorkspaceId
              ? touchWorkspace(ws, [
                  ...ws.items,
                  { id: entity.id, snapshot: buildSnapshot(entity) },
                ])
              : ws
          );
          return { workspaces, ...withSyncedItems(workspaces, state.activeWorkspaceId) };
        });
      },

      remove: (id, itemState = DEFAULT_STATE) => {
        set((state) => {
          const workspaces = state.workspaces.map((ws) =>
            ws.id === state.activeWorkspaceId
              ? touchWorkspace(
                  ws,
                  ws.items.filter(
                    (item) =>
                      membershipKey(item.id, item.snapshot.state) !==
                      membershipKey(id, itemState)
                  )
                )
              : ws
          );
          return { workspaces, ...withSyncedItems(workspaces, state.activeWorkspaceId) };
        });
      },

      clear: () => {
        set((state) => {
          const workspaces = state.workspaces.map((ws) =>
            ws.id === state.activeWorkspaceId ? touchWorkspace(ws, []) : ws
          );
          return { workspaces, ...withSyncedItems(workspaces, state.activeWorkspaceId) };
        });
      },

      has: (id, itemState = DEFAULT_STATE) =>
        get().items.some(
          (item) =>
            membershipKey(item.id, item.snapshot.state) ===
            membershipKey(id, itemState)
        ),

      getActiveWorkspace: () =>
        get().workspaces.find((w) => w.id === get().activeWorkspaceId),

      switchWorkspace: (id) => {
        set((state) => {
          if (!state.workspaces.some((w) => w.id === id)) return state;
          return { activeWorkspaceId: id, ...withSyncedItems(state.workspaces, id) };
        });
      },

      createWorkspace: (name, tags = []) => {
        const ws = makeWorkspace(name, tags);
        set((state) => {
          const workspaces = [...state.workspaces, ws];
          return {
            workspaces,
            activeWorkspaceId: ws.id,
            ...withSyncedItems(workspaces, ws.id),
          };
        });
        return ws.id;
      },

      deleteWorkspace: (id) => {
        set((state) => {
          const workspaces = state.workspaces.filter((w) => w.id !== id);
          if (workspaces.length === 0) {
            const fallback = makeWorkspace(DEFAULT_WORKSPACE_NAME);
            return {
              workspaces: [fallback],
              activeWorkspaceId: fallback.id,
              ...withSyncedItems([fallback], fallback.id),
            };
          }
          const activeWorkspaceId =
            state.activeWorkspaceId === id ? workspaces[0].id : state.activeWorkspaceId;
          return {
            workspaces,
            activeWorkspaceId,
            ...withSyncedItems(workspaces, activeWorkspaceId),
          };
        });
      },

      renameWorkspace: (id, name) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, name, updated_at: nowIso() } : w
          ),
        }));
      },

      setWorkspaceTags: (id, tags) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, tags, updated_at: nowIso() } : w
          ),
        }));
      },

      mostRecentWorkspaceId: () => {
        const workspaces = get().workspaces;
        if (workspaces.length === 0) return undefined;
        return [...workspaces].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0].id;
      },

      exportWorkspace: (id) => {
        const workspace = get().workspaces.find((w) => w.id === id);
        if (!workspace) return undefined;

        // Entity notes feature: bundle the notes for this workspace's
        // items (format_version 2) so notes travel with manual sharing.
        // Notes live in their own device-local store (lib/notes.ts).
        const allNotes = useNotes.getState().notes;
        const notes: Record<string, EntityNote> = {};
        for (const item of workspace.items) {
          const key = noteKey(item.id, item.snapshot.state);
          const note = allNotes[key];
          if (note && note.text.trim().length > 0) notes[key] = note;
        }

        return {
          format_version: 2,
          exported_at: nowIso(),
          workspace,
          ...(Object.keys(notes).length > 0 ? { notes } : {}),
        };
      },

      importWorkspace: (file) => {
        // Entity notes feature: merge any bundled notes (v2 exports).
        // Existing local notes are never overwritten (see importNotes).
        if (file.notes) {
          useNotes.getState().importNotes(file.notes);
        }

        const ts = nowIso();
        const imported: Workspace = {
          ...file.workspace,
          id: genId("ws"),
          created_at: ts,
          updated_at: ts,
          imported: true,
        };
        set((state) => {
          const workspaces = [...state.workspaces, imported];
          return {
            workspaces,
            activeWorkspaceId: imported.id,
            ...withSyncedItems(workspaces, imported.id),
          };
        });
        return imported.id;
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      // V3-T-40: one-time migration of the pre-V3 single-shortlist shape
      // ({ items: ShortlistItem[] }) into a default "My Shortlist" workspace,
      // with zero data loss.
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as {
          items?: ShortlistItem[];
          workspaces?: Workspace[];
          activeWorkspaceId?: string;
        };

        if (version >= STORAGE_VERSION && Array.isArray(state.workspaces)) {
          // Already on the workspaces model.
          return state;
        }

        const legacyItems = Array.isArray(state.items) ? state.items : [];
        const ts = nowIso();
        const defaultWorkspace: Workspace = {
          id: genId("ws"),
          name: DEFAULT_WORKSPACE_NAME,
          tags: [],
          items: legacyItems,
          created_at: ts,
          updated_at: ts,
        };

        return {
          workspaces: [defaultWorkspace],
          activeWorkspaceId: defaultWorkspace.id,
          items: legacyItems,
        };
      },
      // Ensure a freshly-hydrated store always has activeWorkspaceId pointed
      // at a real workspace, and `items` synced to match.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (
          !state.activeWorkspaceId ||
          !state.workspaces.some((w) => w.id === state.activeWorkspaceId)
        ) {
          state.activeWorkspaceId = state.workspaces[0]?.id ?? "";
        }
        const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        state.items = active ? active.items : [];
      },
    }
  )
);
