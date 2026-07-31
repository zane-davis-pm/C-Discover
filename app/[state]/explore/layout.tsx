"use client";

// Explore layout — shared wrapper for all entity explore pages.
// V3-T-31: Renders the persistent " Compare (n)" bar for whichever
// entity type the current explore route corresponds to, so individual
// explore pages only need to wire up the comparison checkbox column.
// Phase 3: state-scoped — reads params.state (from the [state] segment)
// rather than a hardcoded default.
import { usePathname } from "next/navigation";
import { CompareBar } from "@/components/explore/CompareBar";
import { EXPLORE_SEGMENT_TO_ENTITY_TYPE } from "@/lib/entity-type-meta";

export default function ExploreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { state: string };
}) {
  const pathname = usePathname();
  const segment = pathname.split("/")[3]; // "/<state>/explore/<segment>/..."
  const type = segment ? EXPLORE_SEGMENT_TO_ENTITY_TYPE[segment] : undefined;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 pb-24">
      {children}
      {type && <CompareBar state={params.state} type={type} />}
    </div>
  );
}
