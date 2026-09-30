/**
 * Signs a pass into one video channel for one user. A port: the use-case does not know it is
 * Agora, and tests pass a fake. The real one is `infrastructure/agora/agora-token-signer.ts`.
 */
export interface CallTokenSigner {
  /** `null` when the provider keys are not configured on this machine. */
  sign(
    channel: string,
    account: string,
    ttlSeconds: number,
  ): SignedCallToken | null;
}

export interface SignedCallToken {
  appId: string;
  token: string;
}

export const CALL_TOKEN_SIGNER = Symbol('CallTokenSigner');
