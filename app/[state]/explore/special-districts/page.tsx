import { readFileSync } from "fs";
import { join } from "path";
import SpecialDistrictsPageClient from "./SpecialDistrictsPageClient";
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

export function generateStaticParams() {
  const manifest = getStatesManifest();
  return manifest.states.map((s) => ({ state: s.code }));
}

export default function SpecialDistrictsPage({ params }: { params: { state: string } }) {
  return <SpecialDistrictsPageClient state={params.state} />;
}
