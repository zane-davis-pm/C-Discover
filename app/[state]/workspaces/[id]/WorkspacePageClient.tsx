"use client";

// ============================================================
// C-Discover — Named Workspace Page
// V3-T-42/43/44/45: SPEC_V3.md §6 — replaces the single global
// /shortlist page. Renders one named, taggable local workspace,
// with JSON export/import for manual sharing between teammates.
// Phase 3: lives at /{state}/workspaces/[id]; workspace items are
// already state-scoped via ShortlistSnapshot.state (lib/shortlist.ts).
//
// Static-export note: `id` is an arbitrary, client-created workspace id,
// unknowable at build time. page.tsx next to this file only prerenders
// one shell per state ("_"), and staticwebapp.config.json rewrites any
// other /{state}/workspaces/* path to that shell. Because of that, this
// component reads `state`/`id` via useParams() (matched client-side
// against the *live* URL by Next's router) instead of the params prop
// the shell was built with.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark,
  Trash2,
  Download,
  Upload,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import { ShortlistTable } from "@/components/shortlist/ShortlistTable";
import { ExportButton } from "@/components/shortlist/ExportButton";
import { downloadWorkspaceJson, parseWorkspaceJsonFile } from "@/lib/export";
import { DEFAULT_STATE } from "@/lib/data";

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bookmark className="h-12 w-12 text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-600 mb-1">
        This workspace is empty
      </h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Add counties, municipalities, school districts, or special districts
        from the Explore pages to build it out.
      </p>
    </div>
  );
}

// ─── Editable workspace name (V3-T-43 companion) ───────────────

function WorkspaceName({ id, name }: { id: string; name: string }) {
  const renameWorkspace = useShortlist((s) => s.renameWorkspace);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(name), [name]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) renameWorkspace(id, trimmed);
    else setDraft(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          autoFocus
          aria-label="Workspace name"
          className="page-title border-b-2 border-gold-400 focus:outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Save workspace name"
          className="text-brand-600 hover:text-brand-800"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left"
      aria-label={`Rename workspace"${name}"`}
    >
      <h1 className="page-title">{name}</h1>
      <Pencil className="h-4 w-4 text-gray-300 group-hover:text-gold-600" />
    </button>
  );
}

// ─── Tag editor (V3-T-43) ───────────────────────────────────────

function TagEditor({ id, tags }: { id: string; tags: string[] }) {
  const setWorkspaceTags = useShortlist((s) => s.setWorkspaceTags);
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setDraft("");
      return;
    }
    setWorkspaceTags(id, [...tags, trimmed]);
    setDraft("");
  }

  function removeTag(tag: string) {
    setWorkspaceTags(
      id,
      tags.filter((t) => t !== tag),
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-2"
      aria-label="Workspace tags"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="hover:text-brand-900"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="+ Add tag"
        aria-label="Add a tag"
        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 w-24"
      />
    </div>
  );
}

// ─── JSON export/import ─────────────────────────────────────────

function JsonExportButton({ id }: { id: string }) {
  const exportWorkspace = useShortlist((s) => s.exportWorkspace);

  function handleExport() {
    const file = exportWorkspace(id);
    if (file) downloadWorkspaceJson(file);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-label="Export workspace to JSON"
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md"
    >
      <Download className="h-4 w-4" />
      Export Workspace (JSON)
    </button>
  );
}

function JsonImportButton({ state }: { state: string }) {
  const importWorkspace = useShortlist((s) => s.importWorkspace);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await parseWorkspaceJsonFile(file);
      const newId = importWorkspace(parsed);
      setError(null);
      router.push(`/${state}/workspaces/${newId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not import that file.",
      );
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Import workspace from JSON"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md"
      >
        <Upload className="h-4 w-4" />
        Import Workspace (JSON)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export function WorkspacePageClient() {
  const params = useParams<{ state: string; id: string }>();
  const state = params?.state ?? DEFAULT_STATE;
  const id = params?.id ?? "";
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useShortlist.persist.hasHydrated());
    const unsub = useShortlist.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  const workspaces = useShortlist((s) => s.workspaces);
  const activeWorkspaceId = useShortlist((s) => s.activeWorkspaceId);
  const switchWorkspace = useShortlist((s) => s.switchWorkspace);
  const mostRecentWorkspaceId = useShortlist((s) => s.mostRecentWorkspaceId);
  const clear = useShortlist((s) => s.clear);
  const deleteWorkspace = useShortlist((s) => s.deleteWorkspace);
  const items = useShortlist((s) => s.items);

  const workspace = workspaces.find((w) => w.id === id);

  // Keep the store's active workspace in sync with the URL, and redirect
  // away from stale/unknown workspace IDs once hydration has settled.
  useEffect(() => {
    if (!hydrated) return;
    if (!workspace) {
      const fallback = mostRecentWorkspaceId();
      if (fallback) router.replace(`/${state}/workspaces/${fallback}`);
      return;
    }
    if (activeWorkspaceId !== id) switchWorkspace(id);
  }, [
    hydrated,
    id,
    state,
    workspace,
    activeWorkspaceId,
    switchWorkspace,
    mostRecentWorkspaceId,
    router,
  ]);

  if (!hydrated || !workspace) {
    return (
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <p className="py-16 text-center text-gray-400 text-sm">
          Loading workspace…
        </p>
      </main>
    );
  }

  const hasItems = items.length > 0;

  function handleDeleteWorkspace() {
    if (!workspace) return;
    const confirmed = window.confirm(
      `Delete workspace "${workspace.name}"? This removes it and its ${workspace.items.length} saved ${workspace.items.length === 1 ? "entity" : "entities"} for good — this can't be undone.`,
    );
    if (!confirmed) return;
    deleteWorkspace(workspace.id);
    const nextId = useShortlist.getState().activeWorkspaceId;
    router.replace(`/${state}/workspaces/${nextId}`);
  }

  return (
    <main className="max-w-screen-xl mx-auto px-4 py-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
        <div>
          <WorkspaceName id={workspace.id} name={workspace.name} />
          <p className="text-sm text-gray-500 mt-0.5">
            {hasItems
              ? `${items.length} ${items.length === 1 ? "entity" : "entities"} saved.`
              : "No entities saved yet."}{" "}
            Export as CSV for use outside this tool.
          </p>
          <TagEditor id={workspace.id} tags={workspace.tags} />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasItems && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-md"
              aria-label="Clear all entities from this workspace"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
          <JsonImportButton state={state} />
          <JsonExportButton id={workspace.id} />
          {hasItems && <ExportButton />}
          <button
            type="button"
            onClick={handleDeleteWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-md"
            aria-label={`Delete workspace "${workspace.name}"`}
          >
            <Trash2 className="h-4 w-4" />
            Delete Workspace
          </button>
        </div>
      </div>

      {workspace.imported && (
        <div
          role="status"
          className="mb-6 px-4 py-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm"
        >
          Imported workspaces are a snapshot, not a live sync — changes made
          here won't update the teammate's original workspace, and their future
          changes won't appear here.
        </div>
      )}

      {/* ── Content ── */}
      {hasItems ? (
        <>
          <ShortlistTable />

          <aside
            aria-label="Data source notes"
            className="mt-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500"
          >
            <p className="font-semibold text-gray-600 mb-1">Data sources</p>
            <p>
              Demographics (population, income, education, poverty): U.S. Census
              Bureau ACS 5-Year Estimates (2022).
            </p>
            <p className="mt-0.5">
              County financials: Florida EDR County Revenues &amp; Expenditures
              (EDR_COUNTY).
            </p>
            <p className="mt-0.5">
              Municipal financials: Florida EDR Municipal Revenues &amp;
              Expenditures (EDR_MUNI).
            </p>
            <p className="mt-0.5">
              School district enrollment &amp; financials: FLDOE PK-12 Data /
              EDR Education Estimating Conference / FLDOE Annual Financial
              Reports (FLDOE_AFR).
            </p>
            <p className="mt-0.5">
              Special district registry: FloridaCommerce Special District
              Accountability Program (FLORIDACOMMERCE_SD).
            </p>
            <p className="mt-1 text-gray-400">
              Source identifiers are included in the CSV export ("Demographics
              Source" and "Financials Source" columns).
            </p>
          </aside>
        </>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}
