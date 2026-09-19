import {
  listingListSchema,
  listingSchema,
  type CreateListingInput,
  type Listing,
  type ListingQuery
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const catalogApi = {
  listListings(query?: ListingQuery): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (query?.crop) params.append("crop", query.crop);
    if (query?.district) params.append("district", query.district);
    if (query?.farmerId) params.append("farmerId", query.farmerId);
    const querystring = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/catalog/listings${querystring}`, {
      schema: listingListSchema
    });
  },

  getListing(id: string): Promise<Listing> {
    return apiFetch(`/catalog/listings/${id}`, {
      schema: listingSchema
    });
  },

  createListing(token: string, data: CreateListingInput): Promise<Listing> {
    return apiFetch("/catalog/listings", {
      method: "POST",
      token,
      body: data,
      schema: listingSchema
    });
  }
};
