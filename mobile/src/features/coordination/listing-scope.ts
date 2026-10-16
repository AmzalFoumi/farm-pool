/**
 * Hands one farmer's id to the Listings tab across a navigation boundary that route params
 * didn't survive: `/farmer/:id` is a Stack screen outside `(coordinator-tabs)`, and pushing into
 * a `NativeTabs` route from there did not reliably carry `params` through — the Listings tab kept
 * showing every farmer's listings regardless of what was pushed (confirmed twice). Same category
 * of `NativeTabs` gap as `listings-version.ts` works around for stale data.
 *
 * `set` writes, then navigates; the Listings tab consumes it once per focus (`consume`, called
 * from a `useFocusEffect`) — "consume" because arriving with nothing pending must reset to
 * unscoped, so tapping the Listings tab icon directly after viewing a farmer's listings shows
 * everyone again rather than staying stuck on that one farmer.
 */
let pendingFarmerId: string | null = null;

export function setScopedFarmerId(farmerId: string) {
  pendingFarmerId = farmerId;
}

export function consumeScopedFarmerId(): string | null {
  const id = pendingFarmerId;
  pendingFarmerId = null;
  return id;
}
