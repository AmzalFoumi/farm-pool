import {
  cooperativeFarmerListSchema,
  coordinatorDashboardSchema,
  coordinatorTaskListSchema,
  type CooperativeFarmer,
  type CoordinatorDashboard,
  type CoordinatorTask
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
  }
};
