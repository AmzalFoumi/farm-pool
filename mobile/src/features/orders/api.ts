import { orderListSchema, orderSchema, type Order, type PlaceOrderInput } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const ordersApi = {
  place(token: string, input: PlaceOrderInput): Promise<Order> {
    return apiFetch("/orders", { method: "POST", body: input, token, schema: orderSchema });
  },

  mine(token: string): Promise<Order[]> {
    return apiFetch("/orders/mine", { token, schema: orderListSchema });
  },

  get(token: string, id: string): Promise<Order> {
    return apiFetch(`/orders/${encodeURIComponent(id)}`, { token, schema: orderSchema });
  },

  cancel(token: string, id: string): Promise<Order> {
    return apiFetch(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      token,
      schema: orderSchema
    });
  }
};
