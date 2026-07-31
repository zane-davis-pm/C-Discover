// ============================================================
// C-Discover — Result Count
//" Showing X of Y counties "— EC-10, EM-10, ESD-10.
// ============================================================

interface ResultCountProps {
  count: number;
  total: number;
  entityLabel?: string;
}

export function ResultCount({
  count,
  total,
  entityLabel = "results",
}: ResultCountProps) {
  return (
    <p className="text-sm text-gray-500" aria-live="polite" aria-atomic="true">
      Showing{" "}
      <span className="font-semibold text-brand-900">
        {count.toLocaleString()}
      </span>{" "}
      of{" "}
      <span className="font-semibold text-brand-900">
        {total.toLocaleString()}
      </span>{" "}
      {entityLabel}
    </p>
  );
}
