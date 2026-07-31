import { readFileSync } from "fs";
import { join } from "path";
import SchoolDistrictsPageClient from "./SchoolDistrictsPageClient";
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

export default async function SchoolDistrictsPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  return <SchoolDistrictsPageClient params={{ state }} />;
}
