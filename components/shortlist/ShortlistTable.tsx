"use client";

// ============================================================
// C-Discover — Shortlist Table (grouped by entity type)
// T-61: SPEC.md §9.1
// ============================================================

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import { NoteButton } from "@/components/notes/NoteButton";
import { deepDiveHref } from "@/lib/deep-dive-data";
import { useCurrentState } from "@/lib/state-context";
import { stateHasNoWebsiteLinks } from "@/lib/entity-type-meta";
import type { ShortlistItem, ShortlistSnapshot, DataGap } from "@/lib/types";
import {
  formatDollars,
  formatNumber,
  formatPercent,
  formatStateCode,
} from "@/lib/utils";

// ─── Gap / value helper ──────────────────────────────────────

function gapLabel(reason: DataGap["reason"]): string {
  switch (reason) {
    case "unknown":
      return "Unknown";
    case "unavailable":
      return "Unavailable";
    case "not_applicable":
      return "N/A";
  }
}

/**
 * Display a formatted value or the gap label if null.
 * Never returns a blank string or bare dash.
 */
function display(
  value: number | string | null | undefined,
  snapshot: ShortlistSnapshot,
  field: string,
  formatter: (v: number | null) => string = formatNumber,
): string {
  if (value != null) {
    return typeof value === "string" ? value : formatter(value as number);
  }
  const gap = snapshot.data_gaps.find((g) => g.field === field);
  return gapLabel(gap?.reason ?? "unknown");
}

// ─── Remove button ───────────────────────────────────────────

function RemoveButton({ item }: { item: ShortlistItem }) {
  const remove = useShortlist((s) => s.remove);
  return (
    <button
      type="button"
      onClick={() => remove(item.id, item.snapshot.state)}
      aria-label={`Remove ${item.snapshot.name} from shortlist`}
      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">Remove</span>
    </button>
  );
}

// ─── Shared table wrapper ─────────────────────────────────────

function GroupSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section aria-label={`${title} shortlist`} className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-2">
        {title} <span className="text-gray-400 font-normal">({count})</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left">{children}</table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-3 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200"
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

// ─── Counties table ───────────────────────────────────────────

function CountiesTable({
  items,
  showWebsite,
}: {
  items: ShortlistItem[];
  showWebsite: boolean;
}) {
  return (
    <GroupSection title="Counties" count={items.length}>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>State</Th>
          <Th>County</Th>
          <Th>Population</Th>
          <Th>Median HH Income</Th>
          <Th>Total Revenue</Th>
          {showWebsite && <Th>Website</Th>}
          <Th>Notes</Th>
          <Th>Remove</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item) => {
          const s = item.snapshot;
          return (
            <tr
              key={item.id}
              data-entity-id={item.id}
              className="hover:bg-gray-50"
            >
              <Td className="font-medium text-gray-900">
                {deepDiveHref(s.state, s.type, item.id) ? (
                  <Link
                    href={deepDiveHref(s.state, s.type, item.id)!}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}
              </Td>
              <Td>{formatStateCode(s.state)}</Td>
              <Td>{s.county}</Td>
              <Td>{display(s.population, s, "population", formatNumber)}</Td>
              <Td>
                {display(
                  s.median_hh_income,
                  s,
                  "median_hh_income",
                  formatDollars,
                )}
              </Td>
              <Td>
                {display(s.total_revenue, s, "total_revenue", formatDollars)}
              </Td>
              {showWebsite && (
                <Td>
                  {s.website ? (
                    <Link
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline truncate max-w-[160px] inline-block"
                    >
                      {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      {display(null, s, "website")}
                    </span>
                  )}
                </Td>
              )}
              <Td>
                <NoteButton
                  id={item.id}
                  state={s.state}
                  name={s.name}
                  compact
                  showPreview
                />
              </Td>
              <Td>
                <RemoveButton item={item} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </GroupSection>
  );
}

// ─── Municipalities table ─────────────────────────────────────

function MunicipalitiesTable({
  items,
  showWebsite,
}: {
  items: ShortlistItem[];
  showWebsite: boolean;
}) {
  return (
    <GroupSection title="Municipalities" count={items.length}>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>State</Th>
          <Th>County</Th>
          <Th>Population</Th>
          <Th>Median HH Income</Th>
          <Th>Total Revenue</Th>
          {showWebsite && <Th>Website</Th>}
          <Th>Notes</Th>
          <Th>Remove</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item) => {
          const s = item.snapshot;
          return (
            <tr
              key={item.id}
              data-entity-id={item.id}
              className="hover:bg-gray-50"
            >
              <Td className="font-medium text-gray-900">
                {deepDiveHref(s.state, s.type, item.id) ? (
                  <Link
                    href={deepDiveHref(s.state, s.type, item.id)!}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}
              </Td>
              <Td>{formatStateCode(s.state)}</Td>
              <Td>{s.county}</Td>
              <Td>{display(s.population, s, "population", formatNumber)}</Td>
              <Td>
                {display(
                  s.median_hh_income,
                  s,
                  "median_hh_income",
                  formatDollars,
                )}
              </Td>
              <Td>
                {display(s.total_revenue, s, "total_revenue", formatDollars)}
              </Td>
              {showWebsite && (
                <Td>
                  {s.website ? (
                    <Link
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline truncate max-w-[160px] inline-block"
                    >
                      {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      {display(null, s, "website")}
                    </span>
                  )}
                </Td>
              )}
              <Td>
                <NoteButton
                  id={item.id}
                  state={s.state}
                  name={s.name}
                  compact
                  showPreview
                />
              </Td>
              <Td>
                <RemoveButton item={item} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </GroupSection>
  );
}

// ─── School Districts table ───────────────────────────────────

function SchoolDistrictsTable({
  items,
  showWebsite,
}: {
  items: ShortlistItem[];
  showWebsite: boolean;
}) {
  return (
    <GroupSection title="School Districts" count={items.length}>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>State</Th>
          <Th>County</Th>
          <Th>PK-12 Enrollment</Th>
          <Th>Expenditure per FTE</Th>
          <Th>Total Revenue</Th>
          {showWebsite && <Th>Website</Th>}
          <Th>Notes</Th>
          <Th>Remove</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item) => {
          const s = item.snapshot;
          return (
            <tr
              key={item.id}
              data-entity-id={item.id}
              className="hover:bg-gray-50"
            >
              <Td className="font-medium text-gray-900">
                {deepDiveHref(s.state, s.type, item.id) ? (
                  <Link
                    href={deepDiveHref(s.state, s.type, item.id)!}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}
              </Td>
              <Td>{formatStateCode(s.state)}</Td>
              <Td>{s.county}</Td>
              <Td>
                {display(s.enrollment_pk12, s, "enrollment_pk12", formatNumber)}
              </Td>
              <Td>
                {display(
                  s.expenditure_per_fte,
                  s,
                  "expenditure_per_fte",
                  formatDollars,
                )}
              </Td>
              <Td>
                {display(s.total_revenue, s, "total_revenue", formatDollars)}
              </Td>
              {showWebsite && (
                <Td>
                  {s.website ? (
                    <Link
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline truncate max-w-[160px] inline-block"
                    >
                      {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      {display(null, s, "website")}
                    </span>
                  )}
                </Td>
              )}
              <Td>
                <NoteButton
                  id={item.id}
                  state={s.state}
                  name={s.name}
                  compact
                  showPreview
                />
              </Td>
              <Td>
                <RemoveButton item={item} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </GroupSection>
  );
}

// ─── Special Districts table ──────────────────────────────────

function dependentLabel(val: boolean | null | undefined): string {
  if (val === true) return "Dependent";
  if (val === false) return "Independent";
  return "Unknown";
}

function SpecialDistrictsTable({
  items,
  showWebsite,
}: {
  items: ShortlistItem[];
  showWebsite: boolean;
}) {
  return (
    <GroupSection title="Special Districts" count={items.length}>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>State</Th>
          <Th>County</Th>
          <Th>Purpose</Th>
          <Th>Dependent?</Th>
          {showWebsite && <Th>Website</Th>}
          <Th>Notes</Th>
          <Th>Remove</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item) => {
          const s = item.snapshot;
          return (
            <tr
              key={item.id}
              data-entity-id={item.id}
              className="hover:bg-gray-50"
            >
              <Td className="font-medium text-gray-900">
                {deepDiveHref(s.state, s.type, item.id) ? (
                  <Link
                    href={deepDiveHref(s.state, s.type, item.id)!}
                    className="hover:underline"
                  >
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}
              </Td>
              <Td>{formatStateCode(s.state)}</Td>
              <Td>{s.county}</Td>
              <Td>
                {s.purpose_category ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                    {s.purpose_category}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs italic">Unknown</span>
                )}
              </Td>
              <Td>{dependentLabel(s.dependent)}</Td>
              {showWebsite && (
                <Td>
                  {s.website ? (
                    <Link
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline truncate max-w-[160px] inline-block"
                    >
                      {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      {display(null, s, "website")}
                    </span>
                  )}
                </Td>
              )}
              <Td>
                <NoteButton
                  id={item.id}
                  state={s.state}
                  name={s.name}
                  compact
                  showPreview
                />
              </Td>
              <Td>
                <RemoveButton item={item} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </GroupSection>
  );
}

// ─── Main export ──────────────────────────────────────────────

export function ShortlistTable() {
  const items = useShortlist((s) => s.items);
  const { state } = useCurrentState();
  const showWebsite = !stateHasNoWebsiteLinks(state);

  const counties = items.filter((i) => i.snapshot.type === "county");
  const municipalities = items.filter(
    (i) => i.snapshot.type === "municipality",
  );
  const schoolDistricts = items.filter(
    (i) => i.snapshot.type === "school_district",
  );
  const specialDistricts = items.filter(
    (i) => i.snapshot.type === "special_district",
  );

  return (
    <div>
      <CountiesTable items={counties} showWebsite={showWebsite} />
      <MunicipalitiesTable items={municipalities} showWebsite={showWebsite} />
      <SchoolDistrictsTable
        items={schoolDistricts}
        showWebsite={showWebsite}
      />
      <SpecialDistrictsTable
        items={specialDistricts}
        showWebsite={showWebsite}
      />
    </div>
  );
}
