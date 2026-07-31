import { readFileSync } from "fs";
import { join } from "path";
import ShortlistPageClient from "./ShortlistPageClient";
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

export default function ShortlistPage({ params }: { params: { state: string } }) {
  return <ShortlistPageClient params={params} />;
}
