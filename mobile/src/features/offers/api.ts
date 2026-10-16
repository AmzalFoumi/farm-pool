import {
  type AcceptOfferInput,
  type AcceptOfferResult,
  acceptOfferResultSchema,
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

  /** The farmers' responses to one wanted request (FARM-47). */
  forWanted(token: string, wantedId: string): Promise<Offer[]> {
    return apiFetch(`/offers/wanted/${encodeURIComponent(wantedId)}?_t=${Date.now()}`, {
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

  /** Every offer the signed-in user is on, as buyer or as farmer, newest first. */
  mine(token: string): Promise<Offer[]> {
    return apiFetch(`/offers/mine?_t=${Date.now()}`, { token, schema: offerListSchema });
  },

  one(token: string, offerId: string): Promise<Offer> {
    return apiFetch(`/offers/${encodeURIComponent(offerId)}?_t=${Date.now()}`, {
      token,
      schema: offerSchema
    });
  },

  /** `body.dropOff` is the buyer's delivery point; the api ignores one sent by a farmer. */
  accept(token: string, offerId: string, body: AcceptOfferInput = {}): Promise<AcceptOfferResult> {
    return apiFetch(`/offers/${encodeURIComponent(offerId)}/accept`, {
      method: "POST",
      token,
      body,
      schema: acceptOfferResultSchema
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
