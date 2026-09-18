import {
  wantedListingSchema,
  wantedListSchema,
  type CreateWantedInput,
  type WantedListing
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const wantedApi = {
  mine(token: string): Promise<WantedListing[]> {
    return apiFetch("/catalog/wanted?mine=true", { token, schema: wantedListSchema });
  },

  create(token: string, input: CreateWantedInput): Promise<WantedListing> {
    return apiFetch("/catalog/wanted", {
      method: "POST",
      body: input,
      token,
      schema: wantedListingSchema
    });
  },

  close(token: string, id: string): Promise<WantedListing> {
    return apiFetch(`/catalog/wanted/${encodeURIComponent(id)}/close`, {
      method: "POST",
      token,
      schema: wantedListingSchema
    });
  }
};
