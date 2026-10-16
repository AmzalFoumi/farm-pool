/** Rs 180 — one place, so the grid, the list and the detail screen cannot drift. */
export function formatPrice(rupees: number) {
  return `Rs ${Math.round(rupees).toLocaleString("en-LK")}`;
}

/** `2026-09-22` → `22 Sep 2026`. Calendar dates only; no timezone maths. */
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

/** `2026-10-04T08:12:00.000Z` → `1:42 pm`, in the phone's own time zone: a receipt is read by
 *  the person who was there, and "when" means their clock. */
export function formatTime(isoDateTime: string) {
  const at = new Date(isoDateTime);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Whole days between `isoDateTime` and now, floored. Used for a "waiting N days" queue badge —
 *  not for anything billing-sensitive, so a day boundary crossed mid-render is not a concern. */
export function daysSince(isoDateTime: string): number {
  const at = new Date(isoDateTime);
  if (Number.isNaN(at.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - at.getTime()) / 86_400_000));
}

/** Same calendar month and year as right now, in the phone's own time zone — used to scope a
 *  "this month" stat (Disputes, Region's Farmer Spotlight) without a backend date filter. */
export function isThisMonth(isoDateTime: string): boolean {
  const at = new Date(isoDateTime);
  const now = new Date();
  return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
}

/** "Priya Fernando" → "Fernando" — Region's "Hello, {name}" greeting. Falls back to the whole
 *  string when there's only one word, since splitting it would just leave an empty greeting. */
export function lastName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts[parts.length - 1] || displayName;
}

/** The calendar month immediately before this one — Disputes' "vs last month" trend line.
 *  `Date`'s own month rollover handles the January → previous December edge. */
export function isLastMonth(isoDateTime: string): boolean {
  const at = new Date(isoDateTime);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  return at.getFullYear() === lastMonth.getFullYear() && at.getMonth() === lastMonth.getMonth();
}
