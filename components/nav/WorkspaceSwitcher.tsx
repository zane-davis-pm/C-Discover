"use client";

// ============================================================
// C-Discover — Workspace Switcher (nav bar)
// V3-T-41: SPEC_V3.md §6.2 — replaces the single " Shortlist (n)"
// nav indicator. Shows all workspaces with item counts, a
//"+ New Workspace " action, and highlights the active workspace.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronDown, Plus, Check } from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import { cn } from "@/lib/utils";
import { useCurrentState } from "@/lib/state-context";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { state } = useCurrentState();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const workspaces = useShortlist((s) => s.workspaces);
  const activeWorkspaceId = useShortlist((s) => s.activeWorkspaceId);
  const createWorkspace = useShortlist((s) => s.createWorkspace);

  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const totalCount = active?.items.length ?? 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function goTo(id: string) {
    setOpen(false);
    router.push(`/${state}/workspaces/${id}`);
  }

  function handleNewWorkspace() {
    const name = window.prompt(
      'Name this workspace (e.g. "Alachua County Q3 Pursuit"):',
    );
    if (!name || !name.trim()) return;
    const id = createWorkspace(name.trim());
    setOpen(false);
    router.push(`/${state}/workspaces/${id}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Workspaces — active workspace ${active?.name ?? ""} (${totalCount} items)`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <Bookmark className="h-4 w-4" />
        <span className="max-w-[140px] truncate">
          {active?.name ?? "Workspace"}
        </span>
        {totalCount > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-brand-800 text-white text-xs font-semibold">
            {totalCount}
          </span>
        )}
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-gray-400", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          aria-label="Workspaces"
          className="absolute right-0 top-full mt-1.5 w-64 rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,27,42,0.04),0_8px_24px_-8px_rgba(15,27,42,0.12)] py-1 z-50 origin-top-right"
        >
          <ul className="max-h-72 overflow-y-auto">
            {[...workspaces]
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              )
              .map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => goTo(w.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50",
                      w.id === activeWorkspaceId && "bg-brand-50",
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {w.id === activeWorkspaceId && (
                        <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                      )}
                      <span className="truncate text-gray-800">{w.name}</span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {w.items.length}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              type="button"
              onClick={handleNewWorkspace}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
