import type { CallToken } from '@farm-pool/shared';
import { channelFor } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import type { CallTokenSigner } from '../../domain/services/call-token-signer';
import { CallError } from '../errors';
import { loadOwnCall } from './load-own-call';

/** One hour: long enough for a produce call, short enough that a leaked pass soon dies. */
export const CALL_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * A pass into the call's Agora channel. Only for the two people on the call, and only while it
 * is `active` (accepted, not yet ended). Channel and account are set here, never by the app.
 * The first pass issued stamps `startedAt`.
 */
export class IssueCallToken {
  constructor(
    private readonly calls: CallRepository,
    private readonly signer: CallTokenSigner,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(userId: string, id: string): Promise<CallToken> {
    const call = await loadOwnCall(this.calls, userId, id);
    if (call.status !== 'active') {
      throw new CallError(
        'conflict',
        'call_not_active',
        'This call has not been accepted, or has already ended',
      );
    }

    const channel = channelFor(call.id);
    const signed = this.signer.sign(channel, userId, CALL_TOKEN_TTL_SECONDS);
    if (!signed) {
      throw new CallError(
        'conflict',
        'calls_not_configured',
        'Video calls are not set up on this server',
      );
    }

    const issuedAt = this.now();
    if (!call.startedAt) {
      await this.calls.update(call.id, { startedAt: issuedAt });
    }

    return {
      appId: signed.appId,
      channel,
      token: signed.token,
      account: userId,
      expiresAt: new Date(
        issuedAt.getTime() + CALL_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }
}
