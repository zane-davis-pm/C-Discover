"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CompareBar } from "@/components/explore/CompareBar";
import { EXPLORE_SEGMENT_TO_ENTITY_TYPE } from "@/lib/entity-type-meta";

export function ExploreLayoutClient({
  children,
  state,
}: {
  children: ReactNode;
  state: string;
}) {
  const pathname = usePathname();
  const segment = pathname.split("/")[3]; // "/<state>/explore/<segment>/..."
  const type = segment ? EXPLORE_SEGMENT_TO_ENTITY_TYPE[segment] : undefined;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 pb-24">
      {children}
      {type && <CompareBar state={state} type={type} />}
    </div>
  );
}
