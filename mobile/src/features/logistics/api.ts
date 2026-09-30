import {
  assignedDriverSchema,
  jobDetailSchema,
  jobListSchema,
  type AssignedDriver,
  type JobDetail,
  type JobSummary
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/**
 * The driver's job board and the farmer's "who is collecting this" (FARM-49/54).
 *
 * A job is identified by its order's id — there is no separate job record; see
 * `api/src/logistics/domain/entities/job.ts` for why. Nothing here takes a body: the board is
 * filtered server-side from the caller's own vehicle, and a job is claimed by the token that
 * asks, so there is nothing for a screen to send.
 */
export const logisticsApi = {
  /** Open jobs in this driver's district that their vehicle can carry. */
  board(token: string): Promise<JobSummary[]> {
    return apiFetch("/logistics/jobs", { token, schema: jobListSchema });
  },

  /** Jobs this driver has accepted, `assigned` through `delivered`. */
  mine(token: string): Promise<JobSummary[]> {
    return apiFetch("/logistics/jobs/mine", { token, schema: jobListSchema });
  },

  /** One job. `pickup` — the farmer's number — is present only once this driver holds it. */
  one(token: string, orderId: string): Promise<JobDetail> {
    return apiFetch(`/logistics/jobs/${orderId}`, { token, schema: jobDetailSchema });
  },

  /** Take the job. `job_taken` when another driver got there first. */
  accept(token: string, orderId: string): Promise<JobDetail> {
    return apiFetch(`/logistics/jobs/${orderId}/accept`, {
      method: "POST",
      token,
      schema: jobDetailSchema
    });
  },

  /** The load is on the vehicle (LP-50). `collectedKg` is what was actually loaded, which may
   *  differ from the ordered quantity in either direction. */
  confirmPickup(token: string, orderId: string, collectedKg: number): Promise<JobDetail> {
    return apiFetch(`/logistics/jobs/${orderId}/pickup`, {
      method: "POST",
      body: { collectedKg },
      token,
      schema: jobDetailSchema
    });
  },

  /** The load is off it (LP-52). Ends this domain's half of the order lifecycle. */
  confirmDelivery(token: string, orderId: string): Promise<JobDetail> {
    return apiFetch(`/logistics/jobs/${orderId}/deliver`, {
      method: "POST",
      token,
      schema: jobDetailSchema
    });
  },

  /** Who is driving this order — for its farmer at the gate, and its buyer (LP-04, LP-51).
   *  `no_driver_assigned` until someone accepts. */
  driverFor(token: string, orderId: string): Promise<AssignedDriver> {
    return apiFetch(`/logistics/orders/${orderId}/driver`, {
      token,
      schema: assignedDriverSchema
    });
  }
};
