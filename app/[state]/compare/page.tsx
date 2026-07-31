import { readFileSync } from "fs";
import { join } from "path";
import ComparePageClient from "./ComparePageClient";
import type { StatesManifest } from "@/lib/types";

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

/** Required by `output: 'export'`: prerenders one compare shell per known state. */
export function generateStaticParams() {
  const manifest = getStatesManifest();
  return manifest.states.map((s) => ({ state: s.code }));
}

export default function ComparePage({
  params,
}: {
  params: { state: string };
}) {
  return <ComparePageClient state={params.state} />;
}
