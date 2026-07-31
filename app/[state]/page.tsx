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

/** Required by `output: 'export'`: prerenders one state home shell per known state. */
export function generateStaticParams() {
  const manifest = getStatesManifest();
  return manifest.states.map((s) => ({ state: s.code }));
}

/** /{state} -> /{state}/explore/counties, the primary entry point per state. */
export default function StateHome({ params }: { params: { state: string } }) {
  redirect(`/${params.state}/explore/counties`);
}
