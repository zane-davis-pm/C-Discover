// Legacy pre-multi-state /workspaces/[id] bookmark. The real workspace
// page now lives at /{state}/workspaces/[id] (see app/[state]/workspaces).
//
// Static-export note: this id is an arbitrary, client-created workspace
// id, unknowable at build time, so generateStaticParams below only emits
// a single placeholder shell ("_"). staticwebapp.config.json rewrites any
// other /workspaces/* path to that shell; LegacyRedirectClient then reads
// the *live* URL client-side (not this id) to do the actual redirect.
import { LegacyWorkspaceRedirectClient } from "./LegacyWorkspaceRedirectClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function LegacyWorkspaceRedirect() {
  return <LegacyWorkspaceRedirectClient />;
}
