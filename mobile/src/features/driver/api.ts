import { publicUserSchema, type DriverVehicleInput, type PublicUser } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/** A delivery partner's own vehicle (FARM-45). Returns the whole user, so the caller can refresh
 *  the session with what the api stored — plate normalised, verification state set. */
export const driverApi = {
  saveVehicle(token: string, input: DriverVehicleInput): Promise<PublicUser> {
    return apiFetch("/identity/me/vehicle", {
      method: "PUT",
      body: input,
      token,
      schema: publicUserSchema
    });
  }
};
