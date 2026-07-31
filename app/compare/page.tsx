"use client";

import { Suspense } from "react";
import { LegacyRedirect } from "@/components/nav/LegacyRedirect";

export default function LegacyCompareRedirect() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect />
    </Suspense>
  );
}
