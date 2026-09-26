import {
  benchmarkPriceListSchema,
  benchmarkPriceSchema,
  cooperativeFarmerListSchema,
  coordinatorDashboardSchema,
  coordinatorTaskListSchema,
  cropPriceContextListSchema,
  type BenchmarkPrice,
  type CooperativeFarmer,
  type CoordinatorDashboard,
  type CoordinatorTask,
  type CropId,
  type CropPriceContext,
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
  }
};
