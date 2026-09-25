import {
  listingListSchema,
  listingSchema,
  type CreateListingInput,
  type Listing,
  type ListingQuery
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/** The catalog's listing endpoints. Browse and detail return verified listings only; `mine` is a
 *  farmer's own, in every status. */
export const listingsApi = {
  list(token: string, query: ListingQuery = {}): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (query.crop) params.set("crop", query.crop);
    if (query.district) params.set("district", query.district);
    const qs = params.toString();
    return apiFetch(`/catalog/listings${qs ? `?${qs}` : ""}`, {
      token,
      schema: listingListSchema
    });
  },

  get(token: string, id: string): Promise<Listing> {
    return apiFetch(`/catalog/listings/${encodeURIComponent(id)}`, {
      token,
      schema: listingSchema
    });
  },

  /** The signed-in farmer's own listings, every status, newest first. */
  mine(token: string): Promise<Listing[]> {
    return apiFetch("/catalog/listings/mine", { token, schema: listingListSchema });
  },

  /** Post a new listing. It comes back `pending_approval`. */
  create(token: string, data: CreateListingInput): Promise<Listing> {
    return apiFetch("/catalog/listings", {
      method: "POST",
      token,
      body: data,
      schema: listingSchema
    });
  }
};
