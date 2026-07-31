import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { TopNav } from "@/components/nav/TopNav";
import "./globals.css";
import { readFileSync } from "fs";
import { join } from "path";
import type { AppMetadata } from "@/lib/types";
import { cn, isStale } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { DEFAULT_STATE } from "@/lib/data";

const inter = Inter({ subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "C-Discover — Public Sector Intelligence",
  description:
    "Internal market intelligence tool for identifying public-sector clients — counties, municipalities, school districts, and special districts — across supported states.",
};

// Root layout is shared across all states and isn't itself inside the
// [state] route segment, so it can't read params.state. The staleness
// footer approximates using DEFAULT_STATE's metadata; state-specific
// freshness reporting can move into app/[state]/layout.tsx if/when a
// second state's refresh cadence needs to be surfaced independently.
function getAppMetadata(): AppMetadata {
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", DEFAULT_STATE, "metadata.json"),
      "utf-8",
    );
    return JSON.parse(raw) as AppMetadata;
  } catch {
    return { last_pipeline_run: "pending", source_versions: {} };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appMeta = getAppMetadata();
  const stale = isStale(appMeta.last_pipeline_run);

  return (
    <html lang="en" className={sourceSerif.variable}>
      <body className={inter.className}>
        <TopNav lastPipelineRun={appMeta.last_pipeline_run} />

        {/* Push content below fixed nav */}
        <div className="pt-14 min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>

          <footer
            className={cn(
              "border-t mt-auto",
              stale
                ? "border-amber-300 bg-amber-50"
                : "border-gray-200 bg-white",
            )}
          >
            <div
              className={cn(
                "max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between text-xs",
                stale ? "text-amber-700" : "text-gray-400",
              )}
            >
              <span>
                C‑Discover — Florida Public Sector Intelligence &nbsp;
                <span className="text-gold-500">·</span>&nbsp;
                <span className="italic">Internal use only</span>
              </span>
              <span className="flex items-center gap-1.5">
                {stale && (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {appMeta.last_pipeline_run === "pending" ? (
                  <>
                    Data last updated:{" "}
                    <span className="font-medium text-gray-500">
                      Pipeline not yet run
                    </span>
                  </>
                ) : stale ? (
                  <span className="font-medium">
                    Data last updated: {appMeta.last_pipeline_run} — refresh
                    overdue.
                  </span>
                ) : (
                  <>
                    Data last updated:{" "}
                    <span className="font-medium text-gray-500">
                      {appMeta.last_pipeline_run}
                    </span>
                  </>
                )}
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
