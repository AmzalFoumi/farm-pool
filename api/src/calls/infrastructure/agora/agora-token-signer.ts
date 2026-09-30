import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import type { Env } from '../../../config/env';
import type {
  CallTokenSigner,
  SignedCallToken,
} from '../../domain/services/call-token-signer';

/**
 * Signs Agora RTC tokens with the project's App Certificate, which never leaves this server.
 * `PUBLISHER` lets the holder send audio and video, which both people on a call need.
 *
 * The keys are optional in `env.ts` so a teammate without them can still run every other
 * endpoint; asking for a call token then fails with `calls_not_configured`.
 */
@Injectable()
export class AgoraTokenSigner implements CallTokenSigner {
  constructor(private readonly config: ConfigService<Env, true>) {}

  sign(
    channel: string,
    account: string,
    ttlSeconds: number,
  ): SignedCallToken | null {
    const appId = this.config.get('AGORA_APP_ID', { infer: true });
    const certificate = this.config.get('AGORA_APP_CERTIFICATE', {
      infer: true,
    });
    if (!appId || !certificate) return null;

    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      certificate,
      channel,
      account,
      RtcRole.PUBLISHER,
      ttlSeconds,
      ttlSeconds,
    );
    return { appId, token };
  }
}
