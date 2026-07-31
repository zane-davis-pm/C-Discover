import { readFileSync } from "fs";
import { join } from "path";
import MunicipalitiesPageClient from "./MunicipalitiesPageClient";
import type { StatesManifest } from "@/lib/types";

export const dynamic = "force-static";

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

export default function MunicipalitiesPage({ params }: { params: { state: string } }) {
  return <MunicipalitiesPageClient params={params} />;
}
