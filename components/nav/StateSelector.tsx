"use client";

// ============================================================
// C-Discover — State Selector
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): minimal nav dropdown for
// switching states. Rendered by TopNav ONLY when the manifest has more
// than one state — with a single state (Florida-only today) this
// component is never mounted, so single-state UX is unchanged.
// ============================================================

import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import type { StatesManifest } from "@/lib/types";

interface StateSelectorProps {
  manifest: StatesManifest;
  currentState: string;
}

export function StateSelector({ manifest, currentState }: StateSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextState = e.target.value;
    if (nextState === currentState) return;
    // Swap only the leading state segment, preserve the rest of the path.
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${nextState}${rest ? `/${rest}` : ""}`);
  }

  const active =
    manifest.states.find((s) => s.code === currentState) ?? manifest.states[0];

  return (
    <div className="relative flex items-center">
      <MapPin className="h-3.5 w-3.5 text-gray-400 absolute left-2 pointer-events-none" />
      <select
        value={active.code}
        onChange={handleChange}
        aria-label="Select state"
        className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-transparent hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {manifest.states.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-1.5 pointer-events-none" />
    </div>
  );
}
