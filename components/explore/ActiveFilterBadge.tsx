// ============================================================
// C-Discover — Active Filter Badge
// Shows " N filters active " count. EC-08, EM-08, ESD-08.
// ============================================================

interface ActiveFilterBadgeProps {
  count: number;
}

export function ActiveFilterBadge({ count }: ActiveFilterBadgeProps) {
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800"
      aria-label={`${count} ${count === 1 ? "filter" : "filters"} active`}
    >
      {count} {count === 1 ? "filter" : "filters"} active
    </span>
  );
}
