"use client";

// ============================================================
// C-Discover — Comparison Selection Store
// V3-T-30: In-memory (non-persisted) selection state, capped at
// COMPARE_MAX entities, kept in separate buckets per EntityType so
// cross-type comparison is structurally impossible (SPEC_V3.md §5.2).
// ============================================================

import { create } from "zustand";
import type { EntityType } from "@/lib/types";
import { DEFAULT_STATE } from "@/lib/data";

export const COMPARE_MAX = 4;

type SelectionMap = Record<EntityType, string[]>;
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): selections are scoped per
// state, keyed by state code, so an entity id from one state's explore
// table can never register as selected in another state's view.
type StateScopedSelection = Record<string, SelectionMap>;

const EMPTY_SELECTION: SelectionMap = {
  county: [],
  municipality: [],
  school_district: [],
  special_district: [],
};

function selectionFor(
  selected: StateScopedSelection,
  state: string
): SelectionMap {
  return selected[state] ?? EMPTY_SELECTION;
}

interface CompareState {
  selected: StateScopedSelection;
  /** Transient, user-facing message when a selection attempt is blocked. */
  limitMessage: string | null;
  toggle: (state: string, type: EntityType, id: string) => void;
  clear: (state: string, type: EntityType) => void;
  dismissLimitMessage: () => void;
}

export const useCompareSelection = create<CompareState>((set, get) => ({
  selected: {},
  limitMessage: null,

  toggle: (state, type, id) => {
    const stateSelection = selectionFor(get().selected, state);
    const current = stateSelection[type];

    if (current.includes(id)) {
      set((s) => ({
        selected: {
          ...s.selected,
          [state]: {
            ...stateSelection,
            [type]: current.filter((x) => x !== id),
          },
        },
      }));
      return;
    }

    if (current.length >= COMPARE_MAX) {
      set({
        limitMessage: `You can compare up to ${COMPARE_MAX} entities at a time. Remove one before adding another.`,
      });
      return;
    }

    set((s) => ({
      selected: {
        ...s.selected,
        [state]: { ...stateSelection, [type]: [...current, id] },
      },
      limitMessage: null,
    }));
  },

  clear: (state, type) =>
    set((s) => ({
      selected: {
        ...s.selected,
        [state]: { ...selectionFor(s.selected, state), [type]: [] },
      },
    })),

  dismissLimitMessage: () => set({ limitMessage: null }),
}));

/** Convenience selector: selection for a given state + entity type. */
export function useCompareSelectionFor(
  state: string,
  type: EntityType
): string[] {
  return useCompareSelection((s) => selectionFor(s.selected, state)[type]);
}

// Back-compat default export point for call sites that haven't been
// updated to pass a state yet.
export const COMPARE_DEFAULT_STATE = DEFAULT_STATE;
