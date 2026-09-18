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
