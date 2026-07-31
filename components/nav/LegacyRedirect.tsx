"use client";

// ============================================================
// C-Discover — Legacy Route Redirect
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): pre-multi-state routes
// (/explore/*, /map, /compare, /shortlist) redirect to their
// state-prefixed equivalent under /{DEFAULT_STATE}/..., preserving the
// full pathname and all query params so existing bookmarks and the
// lib/url-state.ts filter-state system keep working.
// ============================================================

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DEFAULT_STATE } from "@/lib/data";

export function LegacyRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/${DEFAULT_STATE}${pathname}${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div className="py-16 text-center text-gray-400 text-sm">
      Redirecting…
    </div>
  );
}
