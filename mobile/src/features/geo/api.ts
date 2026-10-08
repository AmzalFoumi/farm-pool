import { publicUserSchema, type PublicUser, type SaveLocationInput } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/**
 * A buyer's saved delivery places (FARM-26).
 *
 * Both calls return the whole user rather than the one location, so the app replaces its session
 * copy with what the api stored instead of merging a list by hand — the same reason
 * `driverApi.saveVehicle` returns a user.
 */
export const locationsApi = {
  /** Add a place, or update the one already saved under that label. */
  save(token: string, input: SaveLocationInput): Promise<PublicUser> {
    return apiFetch("/identity/me/locations", {
      method: "POST",
      body: input,
      token,
      schema: publicUserSchema
    });
  },

  /** Forget a place. Forgetting one already gone is not an error. */
  forget(token: string, id: string): Promise<PublicUser> {
    return apiFetch(`/identity/me/locations/${id}`, {
      method: "DELETE",
      token,
      schema: publicUserSchema
    });
  }
};
