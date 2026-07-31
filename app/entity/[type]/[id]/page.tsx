// This route predates multi-state (Phase 3, PROJECT_PLAN_MULTISTATE.md
// §3.2) and carries no state segment — every bookmark that could exist
// for it was created when Florida was the only state.
//
// Static-export note: `type`/`id` are arbitrary bookmark values, not
// enumerable at build time, so generateStaticParams below only emits a
// single placeholder shell ("_"/"_"). See EntityDeepDiveRedirectClient
// for how the real values get read at runtime.
import { EntityDeepDiveRedirectClient } from "./EntityDeepDiveRedirectClient";

export function generateStaticParams() {
  return [{ type: "_", id: "_" }];
}

export default function EntityDeepDiveRedirect() {
  return <EntityDeepDiveRedirectClient />;
}
