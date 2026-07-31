"use client";

// ============================================================
// C-Discover — Client-side State Context Helper
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): global nav components
// (TopNav, WorkspaceSwitcher) render outside any [state] route segment,
// so they can't receive `params.state` directly from Next.js. This
// module derives the "current state" from the URL pathname, validated
// against the loaded states.json manifest, for building state-prefixed
// links and rendering the state selector.
// ============================================================

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadStatesManifest, DEFAULT_STATE } from "@/lib/data";
import type { StatesManifest, StateConfig } from "@/lib/types";

let manifestPromise: Promise<StatesManifest> | null = null;
function getManifest(): Promise<StatesManifest> {
  if (!manifestPromise) manifestPromise = loadStatesManifest();
  return manifestPromise;
}

/** Loads (and caches) the states.json manifest on the client. */
export function useStatesManifest(): StatesManifest | null {
  const [manifest, setManifest] = useState<StatesManifest | null>(null);
  useEffect(() => {
    let cancelled = false;
    getManifest().then((m) => {
      if (!cancelled) setManifest(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return manifest;
}

/**
 * Derives the current state code from the pathname's first segment,
 * validated against the manifest. Falls back to DEFAULT_STATE when the
 * segment isn't a known state code (root "/", legacy routes mid-redirect,
 * etc.) — link-building only, never used for data authorization.
 */
export function useCurrentState(): {
  state: string;
  config: StateConfig | null;
  manifest: StatesManifest | null;
} {
  const pathname = usePathname();
  const manifest = useStatesManifest();
  const first = pathname.split("/")[1] ?? "";
  const known = manifest?.states.find((s) => s.code === first);
  const state = known ? known.code : DEFAULT_STATE;
  const config =
    known ?? manifest?.states.find((s) => s.code === DEFAULT_STATE) ?? null;
  return { state, config, manifest };
}
