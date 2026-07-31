"use client";

import { Suspense } from "react";
import { LegacyRedirect } from "@/components/nav/LegacyRedirect";

export default function LegacyExploreRoot() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect />
    </Suspense>
  );
}
