"use client";

// ============================================================
// C-Discover — Deep Dive Bookmark Redirect
// Phase 1.4/1.5 (PROJECT_PLAN_MULTISTATE.md): the standalone
// /entity/[type]/[id] page has been retired in favor of the
// two-layer card → deep-dive-overlay experience. This route is
// kept ONLY so old bookmarks/shared links don't 404 — it redirects
// to the entity's explore page with ?dd=<id>, which opens the deep
// dive overlay directly on load. See EntityDeepDiveModal.tsx.
//
// Static-export note: `type`/`id` are arbitrary bookmark values, not
// enumerable at build time, so the page.tsx next to this file only
// prerenders one placeholder shell ("_"/"_"), and
// staticwebapp.config.json rewrites any other /entity/* path to that
// shell. Because of that, this component reads the real segments via
// useParams() (matched client-side against the *live* URL by Next's
// router) rather than the params prop the shell was built with.
// ============================================================

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { deepDiveRouteType } from "@/lib/deep-dive-data";
import { entityTypeExplorePath } from "@/lib/entity-type-meta";
import { DEFAULT_STATE } from "@/lib/data";

export function EntityDeepDiveRedirectClient() {
  const router = useRouter();
  const params = useParams<{ type: string; id: string }>();

  useEffect(() => {
    const type = params?.type;
    const id = params?.id;
    if (!type || !id) return;

    const routeType = deepDiveRouteType(type);
    if (!routeType) {
      router.replace(`/${DEFAULT_STATE}`);
      return;
    }
    const explorePath = entityTypeExplorePath(DEFAULT_STATE, routeType);
    router.replace(`${explorePath}?dd=${encodeURIComponent(id)}`);
  }, [params, router]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Redirecting to the deep dive…
      </p>
    </div>
  );
}
