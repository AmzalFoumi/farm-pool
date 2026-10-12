import { ApiError } from "@/lib/api";

const SENTENCES: Record<string, string> = {
  listing_unavailable: "This listing is no longer available.",
  negotiation_not_accepted: "This farmer is not taking offers on this listing.",
  offer_exists: "You already have an open offer here.",
  insufficient_stock: "Someone else took this stock first. There is not enough left.",
  not_your_offer: "This offer belongs to someone else.",
  wanted_closed: "The buyer has closed this request.",
  not_your_listing: "You can only respond from one of your own listings.",
  crop_mismatch: "Pick a listing of the crop the buyer asked for.",
  network_error: "No connection. Check your signal and try again."
};

/** A sentence for an offer error. `quantity_out_of_range` and `invalid` carry a useful message
 *  from the api (the allowed range, whose turn it is), so those fall through to it. */
export function offerErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return SENTENCES[error.code] ?? error.message ?? fallback;
}
