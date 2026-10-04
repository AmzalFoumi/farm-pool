import {
  orderSchema,
  paymentSchema,
  type Order,
  type Payment,
  type ProposePriceInput
} from "@farm-pool/shared";

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
  },

  /** Put a new price to the other side. Nothing changes until they accept. */
  proposePrice(token: string, orderId: string, input: ProposePriceInput): Promise<Order> {
    return apiFetch(`${forOrder(orderId)}/price-proposal`, {
      method: "POST",
      body: input,
      token,
      schema: orderSchema
    });
  },

  acceptPrice(token: string, orderId: string): Promise<Order> {
    return apiFetch(`${forOrder(orderId)}/price-proposal/accept`, {
      method: "POST",
      token,
      schema: orderSchema
    });
  },

  /** Also how the side that proposed withdraws. */
  declinePrice(token: string, orderId: string): Promise<Order> {
    return apiFetch(`${forOrder(orderId)}/price-proposal/decline`, {
      method: "POST",
      token,
      schema: orderSchema
    });
  }
};
