import {
  benchmarkPriceListSchema,
  benchmarkPriceSchema,
  cooperativeFarmerListSchema,
  cooperativeSchema,
  coordinatorDashboardSchema,
  coordinatorTaskListSchema,
  cropPriceContextListSchema,
  listingListSchema,
  listingSchema,
  orderListSchema,
  publicUserSchema,
  type BenchmarkPrice,
  type Cooperative,
  type CooperativeFarmer,
  type CoordinatorDashboard,
  type CoordinatorTask,
  type CropId,
  type CropPriceContext,
  type Listing,
  type Order,
  type PublicUser,
  type SetBenchmarkPrice
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const coordinationApi = {
  dashboard(token: string): Promise<CoordinatorDashboard> {
    return apiFetch("/coordination/dashboard", { token, schema: coordinatorDashboardSchema });
  },

  farmers(token: string): Promise<CooperativeFarmer[]> {
    return apiFetch("/coordination/farmers", { token, schema: cooperativeFarmerListSchema });
  },

  tasks(token: string): Promise<CoordinatorTask[]> {
    return apiFetch("/coordination/tasks", { token, schema: coordinatorTaskListSchema });
  },

  benchmarks(token: string): Promise<CropPriceContext[]> {
    return apiFetch("/coordination/benchmarks", { token, schema: cropPriceContextListSchema });
  },

  setBenchmark(token: string, cropId: CropId, body: SetBenchmarkPrice): Promise<BenchmarkPrice> {
    return apiFetch(`/coordination/benchmarks/${cropId}`, {
      method: "PUT",
      token,
      body,
      schema: benchmarkPriceSchema
    });
  },

  benchmarkHistory(token: string, cropId: CropId): Promise<BenchmarkPrice[]> {
    return apiFetch(`/coordination/benchmarks/${cropId}/history`, {
      token,
      schema: benchmarkPriceListSchema
    });
  },

  /** A farmer applying to the cooperative covering `district`, right after registering while
   *  still pending (FARM-44). Safe to call again — the membership write is idempotent. */
  apply(token: string, district: string): Promise<Cooperative> {
    return apiFetch("/coordination/apply", {
      method: "POST",
      token,
      body: { district },
      schema: cooperativeSchema
    });
  },

  approveFarmer(token: string, farmerId: string): Promise<PublicUser> {
    return apiFetch(`/coordination/farmers/${farmerId}/approve`, {
      method: "PUT",
      token,
      schema: publicUserSchema
    });
  },

  rejectFarmer(token: string, farmerId: string, reason: string): Promise<PublicUser> {
    return apiFetch(`/coordination/farmers/${farmerId}/reject`, {
      method: "PUT",
      token,
      body: { reason },
      schema: publicUserSchema
    });
  },

  /** Every listing from the cooperative's farmers, any status except draft (FARM-43). The
   *  coordinator's Listings tab — reused by the detail screen rather than a per-id endpoint. */
  listings(token: string): Promise<Listing[]> {
    return apiFetch("/coordination/listings", { token, schema: listingListSchema });
  },

  /** Approve a member farmer's pending listing (FARM-43). It becomes visible to buyers. */
  approveListing(token: string, listingId: string): Promise<Listing> {
    return apiFetch(`/coordination/listings/${encodeURIComponent(listingId)}/approve`, {
      method: "PUT",
      token,
      schema: listingSchema
    });
  },

  /** Reject a member farmer's pending listing (FARM-43), with a mandatory reason shown back to
   *  the farmer on their own listings screen. */
  rejectListing(token: string, listingId: string, reason: string): Promise<Listing> {
    return apiFetch(`/coordination/listings/${encodeURIComponent(listingId)}/reject`, {
      method: "PUT",
      token,
      body: { reason },
      schema: listingSchema
    });
  },

  /** Every order against the cooperative's farmers, any status (FARM-43 follow-up) — read-only
   *  monitoring for the Disputes tab. The coordinator does not resolve anything here. */
  orders(token: string): Promise<Order[]> {
    return apiFetch("/coordination/orders", { token, schema: orderListSchema });
  }
};
