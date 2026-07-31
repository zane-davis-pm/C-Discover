"use client";

// Legacy pre-multi-state /workspaces/[id] bookmark. The real workspace
// page now lives at /{state}/workspaces/[id] (see app/[state]/workspaces).
// LegacyRedirect reads the live pathname/query via usePathname()/
// useSearchParams(), not the id param below, so it works correctly even
// when a static host serves this component's shell for an id that wasn't
// known at build time (see staticwebapp.config.json navigationFallback).
import { Suspense } from "react";
import { LegacyRedirect } from "@/components/nav/LegacyRedirect";

export function LegacyWorkspaceRedirectClient() {
  return (
    <Suspense fallback={null}>
      <LegacyRedirect />
    </Suspense>
  );
}
