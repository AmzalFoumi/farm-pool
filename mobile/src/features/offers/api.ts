import {
  type Offer,
  offerListSchema,
  type CreateOfferInput,
  offerSchema,
  type SubmitNegotiationInput
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const offersApi = {
  forListing(token: string, listingId: string): Promise<Offer[]> {
    return apiFetch(`/offers/listing/${encodeURIComponent(listingId)}?_t=${Date.now()}`, {
      token,
      schema: offerListSchema
    });
  },

  create(token: string, data: CreateOfferInput): Promise<Offer> {
    return apiFetch("/offers", {
      method: "POST",
      token,
      body: data,
      schema: offerSchema
    });
  },

  negotiate(token: string, offerId: string, data: SubmitNegotiationInput): Promise<Offer> {
    return apiFetch(`/offers/${encodeURIComponent(offerId)}/negotiation`, {
      method: "POST",
      token,
      body: data,
      schema: offerSchema
    });
  },

  accept(token: string, offerId: string): Promise<{ orderId: string }> {
    return apiFetch(`/offers/${encodeURIComponent(offerId)}/accept`, {
      method: "POST",
      token
    });
  },

  decline(token: string, offerId: string): Promise<Offer> {
    return apiFetch(`/offers/${encodeURIComponent(offerId)}/decline`, {
      method: "POST",
      token,
      schema: offerSchema
    });
  }
};
