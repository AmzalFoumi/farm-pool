import {
  callListSchema,
  callSchema,
  callTokenSchema,
  type Call,
  type CallToken,
  type RequestCallInput
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const callsApi = {
  /** A buyer asks the listing's farmer for a call. 409 `call_already_open` on a repeat. */
  request(token: string, input: RequestCallInput): Promise<Call> {
    return apiFetch("/calls", { method: "POST", body: input, token, schema: callSchema });
  },

  mine(token: string): Promise<Call[]> {
    return apiFetch("/calls/mine", { token, schema: callListSchema });
  },

  answer(token: string, id: string, answer: "accept" | "decline"): Promise<Call> {
    return apiFetch(`/calls/${encodeURIComponent(id)}/${answer}`, {
      method: "POST",
      token,
      schema: callSchema
    });
  },

  /** A pass into this call's Agora channel. 409 unless the call is active. */
  token(token: string, id: string): Promise<CallToken> {
    return apiFetch(`/calls/${encodeURIComponent(id)}/token`, {
      method: "POST",
      token,
      schema: callTokenSchema
    });
  },

  end(token: string, id: string): Promise<Call> {
    return apiFetch(`/calls/${encodeURIComponent(id)}/end`, {
      method: "POST",
      token,
      schema: callSchema
    });
  }
};
