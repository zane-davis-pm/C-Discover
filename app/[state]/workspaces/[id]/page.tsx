// C-Discover — Named Workspace Page
// V3-T-42/43/44/45: SPEC_V3.md §6. See WorkspacePageClient.tsx for the
// actual component; this file exists only to export generateStaticParams
// (which requires a Server Component) for `output: 'export'`.
//
// Static-export note: `id` is an arbitrary, client-created workspace id,
// unknowable at build time, so this only prerenders one shell per known
// state ("_"). staticwebapp.config.json rewrites any other
// /{state}/workspaces/* path to that shell.
import { WorkspacePageClient } from "./WorkspacePageClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function WorkspacePage() {
  return <WorkspacePageClient />;
}
