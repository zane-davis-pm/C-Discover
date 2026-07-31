"use client";

// ============================================================
// Deep Dive Chart Primitives
// SPEC_DEEP_DIVE_DASHBOARD.md §8 — small SVG chart primitives.
//
// Shared requirements enforced across every component here:
// - visible title + source/year label (DD-G-04, DD-VIZ-*)
// - adjacent data table equivalent, no tooltip-only data
// - color is never the only encoding (labels/markers accompany it)
// - neutral no-data / partial-data states, never a blank chart
// ============================================================

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn, formatDollars, formatNumber, formatPercent } from "@/lib/utils";
import type { DeepDiveFactUnit } from "@/lib/types";

// ─── Formatting ───────────────────────────────────────────────

export function formatByUnit(
  value: number | string | null,
  unit: DeepDiveFactUnit,
): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  switch (unit) {
    case "dollars":
      return formatDollars(value);
    case "percent":
      return formatPercent(value);
    case "people":
    case "students":
    case "fte":
    case "count":
      return formatNumber(value);
    case "year":
      return String(Math.round(value));
    case "ratio":
      return value.toFixed(2);
    default:
      return String(value);
  }
}

function fullPrecision(
  value: number | string | null,
  unit: DeepDiveFactUnit,
): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (unit === "dollars") return `$${Math.round(value).toLocaleString()}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

// ─── SourceNote ───────────────────────────────────────────────

export function SourceNote({
  sourceLabel,
  year,
}: {
  sourceLabel?: string | null;
  year?: number | string | null;
}) {
  if (!sourceLabel && !year) return null;
  return (
    <p className="text-xs text-gray-400">
      {sourceLabel}
      {sourceLabel && year ? "·" : ""}
      {year != null ? String(year) : ""}
    </p>
  );
}

// ─── ChartFrame (shared title/summary/no-data shell) ─────────

export function ChartFrame({
  title,
  sourceLabel,
  year,
  summary,
  noDataMessage,
  hasData,
  children,
  table,
}: {
  title: string;
  sourceLabel?: string | null;
  year?: number | string | null;
  summary?: string;
  noDataMessage?: string;
  hasData: boolean;
  children: ReactNode;
  table?: ReactNode;
}) {
  return (
    <figure className="rounded-md border border-gray-200 bg-white p-4">
      <figcaption>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <SourceNote sourceLabel={sourceLabel} year={year} />
        {summary && hasData && (
          <p className="mt-1 text-xs text-gray-500">{summary}</p>
        )}
      </figcaption>
      <div className="mt-3">
        {hasData ? (
          children
        ) : (
          <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-400">
            {noDataMessage ?? "No data was available for this chart."}
          </p>
        )}
      </div>
      {hasData && table && <div className="mt-3">{table}</div>}
    </figure>
  );
}

// ─── DataTableDisclosure ──────────────────────────────────────

export interface DataTableColumn {
  key: string;
  label: string;
}

export function DataTableDisclosure({
  columns,
  rows,
  caption,
}: {
  columns: DataTableColumn[];
  rows: Array<Record<string, ReactNode>>;
  caption: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (rows.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {open ? "Hide data table" : "View data table"}
      </button>
      {open && (
        <div
          id={id}
          className="mt-2 overflow-x-auto rounded-md border border-gray-200"
        >
          <table className="w-full min-w-[280px] text-left text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="px-3 py-2 font-medium"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-gray-900">
                      {row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── HorizontalBarChart ───────────────────────────────────────

export interface HBarDatum {
  key: string;
  label: string;
  value: number | null;
  unit: DeepDiveFactUnit;
  year?: number | string | null;
  sourceLabel?: string | null;
}

const CATEGORY_COLORS = [
  "#0a30eb",
  "#4878ff",
  "#7aa3ff",
  "#0e1c7c",
  "#1e50ff",
  "#0c1c9e",
];

export function HorizontalBarChart({
  title,
  data,
  sourceLabel,
  year,
  noDataMessage,
}: {
  title: string;
  data: HBarDatum[];
  sourceLabel?: string | null;
  year?: number | string | null;
  noDataMessage?: string;
}) {
  const usable = data.filter(
    (d) => d.value != null && Number.isFinite(d.value),
  );
  const max = Math.max(1, ...usable.map((d) => d.value as number));
  const titleId = useId();

  return (
    <ChartFrame
      title={title}
      sourceLabel={sourceLabel}
      year={year}
      hasData={usable.length > 0}
      noDataMessage={noDataMessage}
      table={
        <DataTableDisclosure
          caption={`${title} — data table`}
          columns={[
            { key: "label", label: "Category" },
            { key: "value", label: "Value" },
          ]}
          rows={usable.map((d) => ({
            label: d.label,
            value: fullPrecision(d.value, d.unit),
          }))}
        />
      }
    >
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 400 ${usable.length * 34 + 4}`}
        width="100%"
        height={usable.length * 34 + 4}
        preserveAspectRatio="xMinYMin meet"
      >
        <title id={titleId}>{title}</title>
        {usable.map((d, i) => {
          const width = Math.max(2, ((d.value as number) / max) * 260);
          const y = i * 34;
          return (
            <g key={d.key}>
              <text x={0} y={y + 12} fontSize="11" fill="#374151">
                {d.label}
              </text>
              <rect
                x={0}
                y={y + 16}
                width={width}
                height={12}
                rx={2}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              />
              <text
                x={width + 6}
                y={y + 25}
                fontSize="11"
                fill="#111827"
                fontWeight={600}
              >
                {formatByUnit(d.value, d.unit)}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}

// ─── StackedBarChart (single-bar part-to-whole composition) ──

export function StackedBarChart({
  title,
  data,
  sourceLabel,
  year,
  noDataMessage,
}: {
  title: string;
  data: HBarDatum[];
  sourceLabel?: string | null;
  year?: number | string | null;
  noDataMessage?: string;
}) {
  const usable = data.filter(
    (d) =>
      d.value != null && Number.isFinite(d.value) && (d.value as number) >= 0,
  );
  const total = usable.reduce((sum, d) => sum + (d.value as number), 0);
  const titleId = useId();

  return (
    <ChartFrame
      title={title}
      sourceLabel={sourceLabel}
      year={year}
      hasData={usable.length > 0 && total > 0}
      noDataMessage={noDataMessage}
      table={
        <DataTableDisclosure
          caption={`${title} — data table`}
          columns={[
            { key: "label", label: "Category" },
            { key: "value", label: "Value" },
            { key: "share", label: "Share" },
          ]}
          rows={usable.map((d) => ({
            label: d.label,
            value: fullPrecision(d.value, d.unit),
            share:
              total > 0
                ? `${(((d.value as number) / total) * 100).toFixed(1)}%`
                : "—",
          }))}
        />
      }
    >
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox="0 0 400 40"
        width="100%"
        height={40}
      >
        <title id={titleId}>{title}</title>
        {(() => {
          let x = 0;
          return usable.map((d, i) => {
            const width = total > 0 ? ((d.value as number) / total) * 400 : 0;
            const rect = (
              <rect
                key={d.key}
                x={x}
                y={4}
                width={width}
                height={20}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              />
            );
            x += width;
            return rect;
          });
        })()}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {usable.map((d, i) => (
          <li key={d.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }}
              aria-hidden="true"
            />
            {d.label}: {formatByUnit(d.value, d.unit)}
            {total > 0
              ? `(${(((d.value as number) / total) * 100).toFixed(1)}%)`
              : ""}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

// ─── LineChart (time series; historical vs projected) ────────

export interface LineSeriesPoint {
  year: number | string;
  value: number | null;
  projected?: boolean;
}

export function LineChart({
  title,
  points,
  unit,
  sourceLabel,
  noDataMessage,
}: {
  title: string;
  points: LineSeriesPoint[];
  unit: DeepDiveFactUnit;
  sourceLabel?: string | null;
  noDataMessage?: string;
}) {
  const usable = points.filter((p) => p.value != null);
  const titleId = useId();
  const values = usable.map((p) => p.value as number);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const w = 400;
  const h = 140;
  const padL = 8;
  const padR = 8;
  const innerW = w - padL - padR;

  const coords = usable.map((p, i) => {
    const x =
      usable.length > 1
        ? padL + (i / (usable.length - 1)) * innerW
        : padL + innerW / 2;
    const y =
      max === min
        ? h / 2
        : h - 20 - (((p.value as number) - min) / (max - min)) * (h - 40);
    return { ...p, x, y };
  });

  const historicalPath = coords
    .filter((c) => !c.projected)
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join("");
  const hasProjected = coords.some((c) => c.projected);

  return (
    <ChartFrame
      title={title}
      sourceLabel={sourceLabel}
      hasData={usable.length > 0}
      noDataMessage={noDataMessage}
      table={
        <DataTableDisclosure
          caption={`${title} — data table`}
          columns={[
            { key: "year", label: "Year" },
            { key: "value", label: "Value" },
            { key: "kind", label: "Type" },
          ]}
          rows={usable.map((p) => ({
            year: String(p.year),
            value: fullPrecision(p.value, unit),
            kind: p.projected ? "Projected" : "Historical",
          }))}
        />
      }
    >
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
      >
        <title id={titleId}>{title}</title>
        {usable.length === 1 ? (
          <circle cx={coords[0].x} cy={coords[0].y} r={4} fill="#0a30eb" />
        ) : (
          <path
            d={historicalPath}
            fill="none"
            stroke="#0a30eb"
            strokeWidth={2}
          />
        )}
        {hasProjected && (
          <path
            d={coords
              .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
              .join("")}
            fill="none"
            stroke="#7aa3ff"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        {coords.map((c) => (
          <circle
            key={String(c.year)}
            cx={c.x}
            cy={c.y}
            r={3}
            fill={c.projected ? "#7aa3ff" : "#0a30eb"}
          />
        ))}
        {coords.map((c) => (
          <text
            key={`${c.year}-label`}
            x={c.x}
            y={h - 4}
            fontSize="9"
            fill="#6b7280"
            textAnchor="middle"
          >
            {String(c.year)}
          </text>
        ))}
      </svg>
      {hasProjected && (
        <p className="mt-2 text-xs text-gray-500">
          Solid line: historical actuals. Dashed line: projected values (labeled
          in the data table).
        </p>
      )}
    </ChartFrame>
  );
}

// ─── DistributionStrip (bullet/strip peer comparison) ─────────

export function DistributionStrip({
  label,
  entityValue,
  peerMin,
  peerQ1,
  peerMedian,
  peerQ3,
  peerMax,
  peerCount,
  unit,
  sourceLabel,
  coverageNote,
}: {
  label: string;
  entityValue: number | null;
  peerMin: number | null;
  peerQ1: number | null;
  peerMedian: number | null;
  peerQ3: number | null;
  peerMax: number | null;
  peerCount: number;
  unit: DeepDiveFactUnit;
  sourceLabel?: string | null;
  coverageNote?: string;
}) {
  const hasData =
    entityValue != null && peerMin != null && peerMax != null && peerCount > 0;
  const titleId = useId();
  const domainMin = peerMin ?? 0;
  const domainMax = peerMax === peerMin ? (peerMax ?? 0) + 1 : (peerMax ?? 1);
  const pct = (v: number) =>
    Math.max(
      0,
      Math.min(100, ((v - domainMin) / (domainMax - domainMin)) * 100),
    );

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <SourceNote sourceLabel={sourceLabel} />
          <p className="mt-0.5 text-xs text-gray-500">
            {coverageNote ?? `Statewide distribution, ${peerCount} entities.`}
          </p>
        </div>
        {entityValue != null && (
          <p className="shrink-0 text-sm font-semibold text-gray-950">
            {formatByUnit(entityValue, unit)}
          </p>
        )}
      </div>
      {hasData ? (
        <>
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox="0 0 400 28"
            width="100%"
            height={28}
            className="mt-4"
          >
            <title id={titleId}>{label} vs peer distribution</title>
            <line
              x1={0}
              y1={14}
              x2={400}
              y2={14}
              stroke="#e5e7eb"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {peerQ1 != null && peerQ3 != null && (
              <rect
                x={(pct(peerQ1) / 100) * 400}
                y={9}
                width={((pct(peerQ3) - pct(peerQ1)) / 100) * 400}
                height={10}
                fill="#dce6ff"
              />
            )}
            {peerMedian != null && (
              <line
                x1={(pct(peerMedian) / 100) * 400}
                y1={4}
                x2={(pct(peerMedian) / 100) * 400}
                y2={24}
                stroke="#6b7280"
                strokeWidth={2}
              />
            )}
            {entityValue != null && (
              <circle
                cx={(pct(entityValue) / 100) * 400}
                cy={14}
                r={6}
                fill="#0a30eb"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </svg>
          <div className="mt-1 flex justify-between text-[11px] text-gray-400">
            <span>{formatByUnit(peerMin, unit)}</span>
            {peerMedian != null && (
              <span>Peer median {formatByUnit(peerMedian, unit)}</span>
            )}
            <span>{formatByUnit(peerMax, unit)}</span>
          </div>
          <DataTableDisclosure
            caption={`${label} — peer distribution data table`}
            columns={[
              { key: "stat", label: "Statistic" },
              { key: "value", label: "Value" },
            ]}
            rows={[
              { stat: "Entity value", value: fullPrecision(entityValue, unit) },
              { stat: "Peer minimum", value: fullPrecision(peerMin, unit) },
              {
                stat: "Peer 25th percentile",
                value: fullPrecision(peerQ1, unit),
              },
              { stat: "Peer median", value: fullPrecision(peerMedian, unit) },
              {
                stat: "Peer 75th percentile",
                value: fullPrecision(peerQ3, unit),
              },
              { stat: "Peer maximum", value: fullPrecision(peerMax, unit) },
              { stat: "Peer count", value: String(peerCount) },
            ]}
          />
        </>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-400">
          Not enough peer data was available to show a distribution for this
          measure.
        </p>
      )}
    </div>
  );
}

// ─── Sparkline (compact inline trend, always paired with a table upstream) ──

export function Sparkline({
  points,
  width = 120,
  height = 32,
}: {
  points: Array<{ value: number | null }>;
  width?: number;
  height?: number;
}) {
  const usable = points
    .filter((p) => p.value != null)
    .map((p) => p.value as number);
  if (usable.length < 2) return null;
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const path = usable
    .map((v, i) => {
      const x = (i / (usable.length - 1)) * width;
      const y =
        max === min ? height / 2 : height - ((v - min) / (max - min)) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join("");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="#0a30eb" strokeWidth={1.5} />
    </svg>
  );
}

// ─── MetricCard (snapshot cell) ────────────────────────────────

export function MetricCard({
  label,
  value,
  sourceLabel,
  year,
  className,
}: {
  label: string;
  value: string;
  sourceLabel?: string | null;
  year?: number | string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-gray-200 bg-white p-4",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold leading-tight text-gray-950">
        {value}
      </p>
      {(sourceLabel || year) && (
        <p className="mt-1 text-[11px] text-gray-400">
          {sourceLabel}
          {sourceLabel && year ? "·" : ""}
          {year != null ? String(year) : ""}
        </p>
      )}
    </div>
  );
}
