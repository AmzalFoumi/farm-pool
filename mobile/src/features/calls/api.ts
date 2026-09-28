import { callSchema, callTokenSchema, type Call, type CallToken } from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

export const callsApi = {
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
