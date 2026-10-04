import { paymentSchema, type Payment } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

const forOrder = (orderId: string) => `/payments/orders/${encodeURIComponent(orderId)}`;

/** Every route is keyed by the order: there is one payment per order. */
export const paymentsApi = {
  /** Rejects with `payment_not_found` until the buyer has paid, which is the ordinary case. */
  get(token: string, orderId: string): Promise<Payment> {
    return apiFetch(forOrder(orderId), { token, schema: paymentSchema });
  },

  /** No body: the amount is the order's own total, decided on the server. */
  pay(token: string, orderId: string): Promise<Payment> {
    return apiFetch(`${forOrder(orderId)}/pay`, { method: "POST", token, schema: paymentSchema });
  },

  /** The produce arrived: releases the held balance to the farmer. Cannot be undone. */
  confirmReceipt(token: string, orderId: string): Promise<Payment> {
    return apiFetch(`${forOrder(orderId)}/confirm-receipt`, {
      method: "POST",
      token,
      schema: paymentSchema
    });
  }
};
