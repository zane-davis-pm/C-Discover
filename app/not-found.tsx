import Link from "next/link";
import { DEFAULT_STATE } from "@/lib/data";

// Static-export note (PROJECT_PLAN_MULTISTATE.md hosting decision): with
// `output: 'export'`, there's no server left to run app/[state]/layout.tsx's
// "unknown state code -> redirect to default state" logic for a state
// segment that wasn't in generateStaticParams — the static host 404s
// before any of that code runs. Next emits this page as a static
// /404.html, which Azure Static Web Apps is configured (see
// staticwebapp.config.json responseOverrides) to serve for any unmatched
// path, so users landing on a bad/old state code (or any other bad URL)
// get this instead of Azure's generic 404.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="page-title mb-2">Page not found</h1>
      <p className="mb-6 text-sm text-gray-500">
        That page doesn&apos;t exist, or the state code in the URL isn&apos;t
        one this tool supports.
      </p>
      <Link
        href={`/${DEFAULT_STATE}`}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        Go to {DEFAULT_STATE.toUpperCase()}
      </Link>
    </main>
  );
}
