"use client";

// ============================================================
// C-Discover — Legacy /shortlist Redirect (state-scoped)
// V3-T-42: SPEC_V3.md §6.2 — the single global shortlist is now
// multiple named workspaces at /{state}/workspaces/[id]. This route is
// kept so links to /{state}/shortlist still resolve, redirecting to the
// most-recently-updated workspace.
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";

export default function ShortlistRedirectPage({
  params,
}: {
  params: { state: string };
}) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const mostRecentWorkspaceId = useShortlist((s) => s.mostRecentWorkspaceId);

  useEffect(() => {
    setHydrated(useShortlist.persist.hasHydrated());
    const unsub = useShortlist.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = mostRecentWorkspaceId();
    if (id) router.replace(`/${params.state}/workspaces/${id}`);
  }, [hydrated, mostRecentWorkspaceId, router, params.state]);

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-6">
      <p className="py-16 text-center text-gray-400 text-sm">
        Loading your workspace…
      </p>
    </main>
  );
}
