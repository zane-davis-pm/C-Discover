// Explore layout — shared wrapper for all entity explore pages.
// V3-T-31: Renders the persistent " Compare (n)" bar for whichever
// entity type the current explore route corresponds to, so individual
// explore pages only need to wire up the comparison checkbox column.
// Phase 3: state-scoped — reads params.state (from the [state] segment)
// rather than a hardcoded default.
import type { ReactNode } from "react";
import { CompareBar } from "@/components/explore/CompareBar";
import { ExploreLayoutClient } from "@/components/explore/ExploreLayoutClient";

export default async function ExploreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;

  return (
    <ExploreLayoutClient state={state}>
      {children}
    </ExploreLayoutClient>
  );
}
