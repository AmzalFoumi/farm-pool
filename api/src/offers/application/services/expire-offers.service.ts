// TODO: implement cron to expire stale PENDING/NEGOTIATING offers once a scheduling package
// (e.g. @nestjs/schedule) is adopted in this codebase. None currently exists.
//
// This job should also periodically scan for Offer.status === "ACCEPTED" with orderId unset
// (older than a few minutes) — indicates Step 4 of AcceptOfferService failed to link back after
// the Order was already successfully created, and needs manual/automated reconciliation.
