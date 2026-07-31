// ============================================================
// C-Discover — [state] Segment Layout
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): validates the [state] route
// param against the states.json manifest. This is a server component (fs
// read, like the metadata read in the root layout).
//
// Static-export note (PROJECT_PLAN_MULTISTATE.md §Phase 6, hosting):
// generateStaticParams here is what lets `output: 'export'` prerender one
// HTML tree per known state (fl, ca, ...). With no server left at request
// time, the redirect() below only ever fires for a *build-time-known*
// state whose page nonetheless renders this layout (defensive/no-op in
// practice); a genuinely unknown state segment in the URL never reaches
// this code at all — it 404s at the static host before any React runs.
// That's handled by the custom app/not-found.tsx instead.
// ============================================================

import { readFileSync } from "fs";
import { join } from "path";
import { redirect } from "next/navigation";
import type { StatesManifest } from "@/lib/types";
import { DEFAULT_STATE } from "@/lib/data";

function getStatesManifest(): StatesManifest {
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", "states.json"),
      "utf-8"
    );
    return JSON.parse(raw) as StatesManifest;
  } catch {
    return { states: [] };
  }
}

/** Required by `output: 'export'`: prerenders one path per known state. */
export function generateStaticParams() {
  const manifest = getStatesManifest();
  return manifest.states.map((s) => ({ state: s.code }));
}

export default async function StateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const manifest = getStatesManifest();
  const known = manifest.states.some((s) => s.code === state);
  if (!known) {
    redirect(`/${DEFAULT_STATE}`);
  }
  return <>{children}</>;
}
