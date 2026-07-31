"use client";

// ============================================================
// C-Discover — Entity Comparison View
// V3-T-33 (SPEC_V3.md §5): raw, aligned, same-type comparison of
// 2-4 entities. No scoring, ranking, or " best value " styling —
// deliberately, per the tool's " Compare, Not Be Told " principle.
// Phase 3 (PROJECT_PLAN_MULTISTATE.md §3.2): state-scoped — entities are
// loaded for params.state, and the back link is state-prefixed.
// ============================================================

import { Fragment, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  loadCounties,
  loadMunicipalities,
  loadSchoolDistricts,
  loadSpecialDistricts,
} from "@/lib/data";
import { getEntitySections, getLinksSection } from "@/lib/entity-fields";
import type { EntityFieldRow } from "@/lib/entity-fields";
import { useShortlist } from "@/lib/shortlist";
import { deepDiveHref } from "@/lib/deep-dive-data";
import {
  entityTypeExplorePath,
  ENTITY_TYPE_LABEL_PLURAL,
  ENTITY_TYPE_LABEL_SINGULAR,
} from "@/lib/entity-type-meta";
import type { AnyEntity, EntityType } from "@/lib/types";

const COMPARE_MIN = 2;
const COMPARE_MAX = 4;

const VALID_TYPES: EntityType[] = [
  "county",
  "municipality",
  "school_district",
  "special_district",
];

function isEntityType(v: string | null): v is EntityType {
  return !!v && (VALID_TYPES as string[]).includes(v);
}

async function loadEntitiesForType(
  state: string,
  type: EntityType,
): Promise<AnyEntity[]> {
  switch (type) {
    case "county":
      return loadCounties(state);
    case "municipality":
      return loadMunicipalities(state);
    case "school_district":
      return loadSchoolDistricts(state);
    case "special_district":
      return loadSpecialDistricts(state);
  }
}

// ─── Merged comparison row/section (one row per field, one cell per entity) ──

interface ComparisonRow {
  label: string;
  cells: EntityFieldRow[];
}

interface ComparisonSection {
  title: string;
  source?: string | null;
  rows: ComparisonRow[];
}

function buildComparisonSections(entities: AnyEntity[]): ComparisonSection[] {
  if (entities.length === 0) return [];

  const perEntitySections = entities.map((e) => [
    ...getEntitySections(e),
    getLinksSection(e),
  ]);
  const spine = perEntitySections[0];

  return spine.map((section, si) => ({
    title: section.title,
    source: section.source,
    rows: section.rows.map((r, ri) => ({
      label: r.label,
      cells: perEntitySections.map((sections) => sections[si].rows[ri]),
    })),
  }));
}

// ─── Cell renderer ─────────────────────────────────────────────

function ComparisonCell({ cell }: { cell: EntityFieldRow }) {
  if (cell.isLink && !cell.isGap) {
    return (
      <a
        href={cell.value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
      >
        <ExternalLink className="h-3 w-3" />
        Visit
      </a>
    );
  }
  return (
    <span
      className={
        cell.isGap
          ? "text-xs text-gray-400 italic"
          : "text-xs text-gray-800 font-medium"
      }
    >
      {cell.value}
    </span>
  );
}

// ─── Content ────────────────────────────────────────────────────

function CompareContent({ state }: { state: string }) {
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type");
  const rawIds = searchParams.get("ids");

  const [loading, setLoading] = useState(true);
  const [allEntities, setAllEntities] = useState<AnyEntity[]>([]);
  const addToShortlist = useShortlist((s) => s.add);
  const inShortlist = useShortlist((s) => s.has);
  const [justAdded, setJustAdded] = useState(false);

  const type: EntityType | null = isEntityType(rawType) ? rawType : null;
  const requestedIds = (rawIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!type) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadEntitiesForType(state, type).then((data) => {
      setAllEntities(data);
      setLoading(false);
    });
  }, [state, type]);

  if (!type) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <p className="text-sm text-gray-600 mb-3">
          No comparison type specified. Select 2–4 same-type entities from an
          explore page to compare them.
        </p>
        <Link
          href={entityTypeExplorePath(state, "county")}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          ← Back to Explore
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        Loading comparison…
      </div>
    );
  }

  const byId = new Map(allEntities.map((e) => [e.id, e]));
  const found = requestedIds
    .map((id) => byId.get(id))
    .filter((e): e is AnyEntity => !!e);
  const truncated = found.length > COMPARE_MAX;
  const entities = found.slice(0, COMPARE_MAX);
  const droppedCount = requestedIds.length - found.length;

  const backHref = entityTypeExplorePath(state, type);
  const typeLabelPlural = ENTITY_TYPE_LABEL_PLURAL[type];
  const typeLabelSingular = ENTITY_TYPE_LABEL_SINGULAR[type];

  if (entities.length < COMPARE_MIN) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <p className="text-sm text-gray-600 mb-3">
          Select at least 2 {typeLabelPlural.toLowerCase()} (up to 4) from the
          explore table to compare them.
        </p>
        <Link
          href={backHref}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          ← Back to Explore
        </Link>
      </div>
    );
  }

  const sections = buildComparisonSections(entities);
  const allAlreadyShortlisted = entities.every((e) =>
    inShortlist(e.id, e.state),
  );

  function handleAddAll() {
    entities.forEach((e) => addToShortlist(e));
    setJustAdded(true);
  }

  return (
    <section aria-label="Entity comparison">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="page-title">
            Comparing {entities.length}{" "}
            {entities.length === 1 ? typeLabelSingular : typeLabelPlural}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Raw, aligned data — no scoring or ranking.
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
      </div>

      {(truncated || droppedCount > 0) && (
        <div className="mb-4 px-4 py-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {truncated && (
            <p>
              Comparison is limited to {COMPARE_MAX} entities; showing the first{" "}
              {COMPARE_MAX}.
            </p>
          )}
          {droppedCount > 0 && (
            <p>
              {droppedCount} selected{" "}
              {droppedCount === 1 ? "entity was" : "entities were"} not found
              and could not be included.
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">
            Side-by-side comparison of {entities.map((e) => e.name).join(",")}
          </caption>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-left whitespace-nowrap"
              >
                Field
              </th>
              {entities.map((e) => (
                <th
                  key={e.id}
                  scope="col"
                  className="px-3 py-2.5 text-xs font-semibold text-gray-900 text-left whitespace-nowrap"
                >
                  {deepDiveHref(e.state, e.type, e.id) ? (
                    <Link
                      href={deepDiveHref(e.state, e.type, e.id)!}
                      className="hover:underline"
                    >
                      {e.name}
                    </Link>
                  ) : (
                    e.name
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr className="bg-gray-50/60">
                  <td
                    colSpan={entities.length + 1}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-900 uppercase tracking-wider"
                  >
                    {section.title}
                    {section.source && (
                      <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal">
                        Source: {section.source}
                      </span>
                    )}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={`${section.title}-${row.label}`}>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap w-40">
                      {row.label}
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2">
                        <ComparisonCell cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        {justAdded || allAlreadyShortlisted ? (
          <span className="text-sm text-gray-500">
            All {entities.length} added to your shortlist.
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAddAll}
            className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-1.5 rounded-md"
          >
            + Add all to Shortlist
          </button>
        )}
      </div>
    </section>
  );
}

export default function ComparePage({
  params,
}: {
  params: { state: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      }
    >
      <CompareContent state={params.state} />
    </Suspense>
  );
}
