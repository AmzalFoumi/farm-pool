import {
  listingListSchema,
  listingSchema,
  type Listing,
  type ListingQuery
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/** The catalog's listing endpoints. Buyers only ever receive verified listings. */
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
  }
};
