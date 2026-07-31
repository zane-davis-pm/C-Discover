"use client";

// Legacy pre-multi-state /shortlist bookmark. The real workspace-lookup
// redirect now lives at /{state}/shortlist (see app/[state]/shortlist).
import { Suspense } from "react";
import { LegacyRedirect } from "@/components/nav/LegacyRedirect";

export default function LegacyShortlistRedirect() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect />
    </Suspense>
  );
}
