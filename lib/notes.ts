"use client";

// ============================================================
// C-Discover — Entity Notes Store
// Device-local, free-text notes attached to an entity globally
// (one note per state:entityId), independent of workspaces so a
// note survives shortlist/workspace changes and deletion.
//
// Mirrors the persistence pattern of lib/shortlist.ts: zustand +
// `persist` backed by localStorage, with a deterministic empty
// pre-hydration state so server render and the pre-hydration
// client render match (no SSR hydration mismatch). Fits the
// fully-static deployment: no backend, notes live per-browser.
//
// Portability: notes ride along in workspace JSON exports
// (lib/export.ts / lib/shortlist.ts, format_version 2).
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EntityNote } from "@/lib/types";

const STORAGE_KEY = "c-discover-notes";
const STORAGE_VERSION = 1;

/**
 * Composite key for note lookup — identical scheme to the shortlist
 * membership key: entity ids are only unique within a state, so a
 * bare id is not a safe key once multiple states are loaded.
 */
export function noteKey(id: string, state: string): string {
  return `${state}:${id}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface NotesStore {
  /** All notes, keyed by noteKey(id, state). */
  notes: Record<string, EntityNote>;

  /** The note for an entity, or undefined if none exists. */
  getNote: (id: string, state: string) => EntityNote | undefined;

  /** True if the entity has a (non-empty) note. */
  hasNote: (id: string, state: string) => boolean;

  /**
   * Create or update a note. Passing empty/whitespace-only text
   * deletes the note instead — the store never holds empty notes.
   */
  setNote: (id: string, state: string, text: string) => void;

  /** Remove a note entirely. */
  deleteNote: (id: string, state: string) => void;

  /**
   * Merge notes from a workspace JSON import (format_version 2).
   * Existing local notes always win — an import never overwrites or
   * deletes a note the user already has on this device.
   */
  importNotes: (incoming: Record<string, EntityNote>) => void;
}

export const useNotes = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: {},

      getNote: (id, state) => get().notes[noteKey(id, state)],

      hasNote: (id, state) => {
        const note = get().notes[noteKey(id, state)];
        return !!note && note.text.trim().length > 0;
      },

      setNote: (id, state, text) => {
        const key = noteKey(id, state);
        if (text.trim().length === 0) {
          get().deleteNote(id, state);
          return;
        }
        set((s) => ({
          notes: { ...s.notes, [key]: { text, updated_at: nowIso() } },
        }));
      },

      deleteNote: (id, state) => {
        const key = noteKey(id, state);
        set((s) => {
          if (!(key in s.notes)) return s;
          const next = { ...s.notes };
          delete next[key];
          return { notes: next };
        });
      },

      importNotes: (incoming) => {
        set((s) => {
          const next = { ...s.notes };
          for (const [key, note] of Object.entries(incoming)) {
            if (
              !(key in next) &&
              note &&
              typeof note.text === "string" &&
              note.text.trim().length > 0
            ) {
              next[key] = {
                text: note.text,
                updated_at:
                  typeof note.updated_at === "string" ? note.updated_at : nowIso(),
              };
            }
          }
          return { notes: next };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
    }
  )
);
