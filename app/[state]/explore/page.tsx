import { readFileSync } from "fs";
import { join } from "path";
import { redirect } from "next/navigation";
import type { StatesManifest } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = false;

function getStatesManifest(): StatesManifest {
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", "states.json"),
      "utf-8",
    );
    return JSON.parse(raw) as StatesManifest;
  } catch {
    return { states: [] };
  }
}

/** Required by `output: 'export'`: prerenders one explore index shell per known state. */
export function generateStaticParams() {
  const manifest = getStatesManifest();
  return manifest.states.map((s) => ({ state: s.code }));
}

/**
 * /{state}/explore has no index view of its own — the explore experience
 * lives at the typed sub-pages (counties, municipalities, …). Redirect to
 * counties, the primary entry point, so legacy "/explore" redirects and
 * hand-typed URLs never 404.
 */
export default async function ExploreIndex({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  redirect(`/${state}/explore/counties`);
}
