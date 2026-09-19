import { orderListSchema, type Order } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const ordersApi = {
  myOrders(token: string): Promise<Order[]> {
    return apiFetch("/orders/mine", {
      token,
      schema: orderListSchema
    });
  }
};
