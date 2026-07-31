"use client";

// Catches /explore/counties, /explore/municipalities, etc.
// LegacyRedirect reads the live pathname/query, not the rest param below,
// so it works correctly even when a static host serves this component's
// shell for a path that wasn't known at build time.
import { Suspense } from "react";
import { LegacyRedirect } from "@/components/nav/LegacyRedirect";

export function LegacyExploreCatchAllClient() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect />
    </Suspense>
  );
}
