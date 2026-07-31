// ============================================================
// C-Discover — Shared Entity Field Formatting
// V3-T-32 (SPEC_V3.md §5.4): single source of truth for how raw
// entity fields are labeled, formatted, and gap-labeled, so
// the deep-dive modal and the /compare view can never disagree on
// how the same field renders.
// ============================================================

import {
  formatDollars,
  formatNumber,
  formatPercent,
  gapLabel,
} from "@/lib/utils";
import type {
  AnyEntity,
  County,
  Municipality,
  SchoolDistrict,
  SpecialDistrict,
  DataGapReason,
} from "@/lib/types";

// ─── Source Descriptions ──────────────────────────────────────
// (Shared so both views cite sources identically.)

const SOURCE_LABELS: Record<string, string> = {
  ACS_5YR: "Census ACS 5-Year (2022)",
  EDR_COUNTY: "FL EDR County Fiscal Data (FY2023)",
  EDR_MUNI: "FL EDR Municipal Fiscal Data",
  FLDOE_AFR: "FLDOE Annual Financial Reports",
  EDR_EDUC: "EDR Education Estimating Conference",
  FLDOE: "FLDOE PK-12 Data Publications",
  DFS_LOGERX: "DFS LOGERx Public Reports",
  PEP: "Census Population Estimates Program",
  derived_county: "Derived from parent county",
};

export function sourceLabel(key: string | null | undefined): string {
  if (!key) return "Unknown source";
  return SOURCE_LABELS[key] ?? key;
}

// ─── Row / Section Types ──────────────────────────────────────

export interface EntityFieldRow {
  /** Stable key used to align the same field across entities in a comparison. */
  key: string;
  label: string;
  value: string;
  isGap: boolean;
  /** True if the raw (non-gap) value is a URL that should render as a link. */
  isLink?: boolean;
}

export interface EntityFieldSection {
  title: string;
  source?: string | null;
  rows: EntityFieldRow[];
}

// ─── Gap Helpers ───────────────────────────────────────────────

function getGapReason(
  entity: AnyEntity,
  field: string
): DataGapReason | null {
  return entity.data_gaps.find((g) => g.field === field)?.reason ?? null;
}

function row(
  entity: AnyEntity,
  key: string,
  label: string,
  raw: number | string | boolean | null | undefined,
  formatter?: (v: NonNullable<typeof raw>) => string
): EntityFieldRow {
  if (raw != null) {
    return {
      key,
      label,
      value: formatter ? formatter(raw) : String(raw),
      isGap: false,
    };
  }
  const reason = getGapReason(entity, key);
  return { key, label, value: gapLabel(reason ?? "unknown"), isGap: true };
}

// ─── Per-Type Section Builders ─────────────────────────────────

function countySections(entity: County): EntityFieldSection[] {
  return [
    {
      title: "Identity",
      rows: [
        { key: "fips", label: "FIPS Code", value: entity.fips, isGap: false },
        row(entity, "county_seat", "County Seat", entity.county_seat),
        { key: "region", label: "Region", value: entity.region, isGap: false },
        row(
          entity,
          "area_sq_miles",
          "Area (sq mi)",
          entity.area_sq_miles,
          (v) => Number(v).toLocaleString()
        ),
      ],
    },
    {
      title: "Demographics",
      source: sourceLabel(entity.income_source),
      rows: [
        row(
          entity,
          "population",
          "Population",
          entity.population,
          (v) => `${formatNumber(v as number)} (${entity.population_year ?? "—"})`
        ),
        row(
          entity,
          "population_growth_rate",
          "Population Growth Rate",
          entity.population_growth_rate,
          (v) =>
            `${formatPercent(v as number)} (${entity.population_growth_years ?? "—"})`
        ),
        row(
          entity,
          "median_hh_income",
          "Median HH Income",
          entity.median_hh_income,
          (v) => formatDollars(v as number)
        ),
        row(
          entity,
          "pct_bachelors_plus",
          "% Bachelor's+",
          entity.pct_bachelors_plus,
          (v) => formatPercent(v as number)
        ),
        row(
          entity,
          "poverty_rate",
          "Poverty Rate",
          entity.poverty_rate,
          (v) => formatPercent(v as number)
        ),
      ],
    },
    {
      title: "Financials",
      source: sourceLabel(entity.fiscal_source),
      rows: [
        row(
          entity,
          "total_revenue",
          "Total Revenue",
          entity.total_revenue,
          (v) => formatDollars(v as number)
        ),
        row(
          entity,
          "property_tax_revenue",
          "Property Tax Revenue",
          entity.property_tax_revenue,
          (v) => formatDollars(v as number)
        ),
        row(entity, "fiscal_year", "Fiscal Year", entity.fiscal_year, (v) =>
          String(v)
        ),
      ],
    },
  ];
}

function municipalitySections(entity: Municipality): EntityFieldSection[] {
  return [
    {
      title: "Identity",
      rows: [
        { key: "county", label: "County", value: entity.county, isGap: false },
        {
          key: "place_fips",
          label: "Place FIPS",
          value: entity.place_fips,
          isGap: false,
        },
        {
          key: "entity_subtype",
          label: "Type",
          value: entity.entity_subtype,
          isGap: false,
        },
      ],
    },
    {
      title: "Demographics",
      source: sourceLabel(entity.income_source),
      rows: [
        row(
          entity,
          "population",
          "Population",
          entity.population,
          (v) => `${formatNumber(v as number)} (${entity.population_year ?? "—"})`
        ),
        row(
          entity,
          "population_growth_rate",
          "Population Growth Rate",
          entity.population_growth_rate,
          (v) =>
            `${formatPercent(v as number)} (${entity.population_growth_years ?? "—"})`
        ),
        row(
          entity,
          "median_hh_income",
          "Median HH Income",
          entity.median_hh_income,
          (v) => formatDollars(v as number)
        ),
        row(
          entity,
          "pct_bachelors_plus",
          "% Bachelor's+",
          entity.pct_bachelors_plus,
          (v) => formatPercent(v as number)
        ),
        row(
          entity,
          "poverty_rate",
          "Poverty Rate",
          entity.poverty_rate,
          (v) => formatPercent(v as number)
        ),
      ],
    },
    {
      title: "Financials",
      source: sourceLabel(entity.fiscal_source),
      rows: [
        row(
          entity,
          "total_revenue",
          "Total Revenue",
          entity.total_revenue,
          (v) => formatDollars(v as number)
        ),
        row(entity, "fiscal_year", "Fiscal Year", entity.fiscal_year, (v) =>
          String(v)
        ),
      ],
    },
  ];
}

function schoolDistrictSections(entity: SchoolDistrict): EntityFieldSection[] {
  return [
    {
      title: "Identity",
      rows: [
        { key: "county", label: "County", value: entity.county, isGap: false },
        { key: "nces_id", label: "NCES ID", value: entity.nces_id, isGap: false },
        { key: "fips", label: "FIPS", value: entity.fips, isGap: false },
        row(
          entity,
          "superintendent_name",
          "Superintendent",
          entity.superintendent_name
        ),
        row(
          entity,
          "population_growth_rate",
          "Population Growth Rate",
          entity.population_growth_rate,
          (v) =>
            `${formatPercent(v as number)} (${sourceLabel(entity.population_growth_source)})`
        ),
      ],
    },
    {
      title: "Enrollment",
      source: sourceLabel(entity.enrollment_source),
      rows: [
        row(
          entity,
          "enrollment_pk12",
          "PK-12 Enrollment",
          entity.enrollment_pk12,
          (v) => `${formatNumber(v as number)} (${entity.enrollment_year ?? "—"})`
        ),
        row(
          entity,
          "enrollment_fte",
          "FTE Enrollment",
          entity.enrollment_fte,
          (v) => formatNumber(v as number)
        ),
      ],
    },
    {
      title: "Financials",
      source: sourceLabel(entity.fiscal_source),
      rows: [
        row(
          entity,
          "total_revenue",
          "Total Revenue",
          entity.total_revenue,
          (v) => formatDollars(v as number)
        ),
        row(
          entity,
          "expenditure_per_fte",
          "Expenditure / FTE",
          entity.expenditure_per_fte,
          (v) => formatDollars(v as number)
        ),
        row(entity, "fiscal_year", "Fiscal Year", entity.fiscal_year, (v) =>
          String(v)
        ),
      ],
    },
  ];
}

function specialDistrictSections(entity: SpecialDistrict): EntityFieldSection[] {
  return [
    {
      title: "Identity",
      rows: [
        { key: "county", label: "County", value: entity.county, isGap: false },
        { key: "sdid", label: "District ID (SDID)", value: entity.sdid, isGap: false },
        {
          key: "purpose_category",
          label: "Purpose",
          value: entity.purpose_category,
          isGap: false,
        },
        row(entity, "dependent", "Dependent / Independent", entity.dependent, (v) =>
          v ? "Dependent" : "Independent"
        ),
        row(entity, "charter_year", "Charter Year", entity.charter_year, (v) =>
          String(v)
        ),
        row(entity, "governing_board", "Governing Board", entity.governing_board),
        row(
          entity,
          "population_growth_rate",
          "Population Growth Rate",
          entity.population_growth_rate,
          (v) =>
            `${formatPercent(v as number)} (${sourceLabel(entity.population_growth_source)})`
        ),
      ],
    },
  ];
}

/** Full set of entity-type-specific field sections (Identity/Demographics/Financials/etc). */
export function getEntitySections(entity: AnyEntity): EntityFieldSection[] {
  switch (entity.type) {
    case "county":
      return countySections(entity);
    case "municipality":
      return municipalitySections(entity);
    case "school_district":
      return schoolDistrictSections(entity);
    case "special_district":
      return specialDistrictSections(entity);
  }
}

/** Access & Sourcing links (§2) — same for every entity type. G-04: gap labels, never blank. */
export function getLinksSection(entity: AnyEntity): EntityFieldSection {
  return {
    title: "Links",
    rows: [
      row(entity, "website", "Official Website", entity.website, (v) =>
        String(v)
      ),
    ].map((r) => ({ ...r, isLink: !r.isGap })),
  };
}
