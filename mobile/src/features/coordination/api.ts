import {
  benchmarkPriceListSchema,
  benchmarkPriceSchema,
  cooperativeFarmerListSchema,
  cooperativeSchema,
  coordinatorDashboardSchema,
  coordinatorTaskListSchema,
  cropPriceContextListSchema,
  publicUserSchema,
  type BenchmarkPrice,
  type Cooperative,
  type CooperativeFarmer,
  type CoordinatorDashboard,
  type CoordinatorTask,
  type CropId,
  type CropPriceContext,
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
  }
};
