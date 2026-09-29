import type { Call } from '@farm-pool/shared';
import { toCallDto } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CallError } from '../errors';
import { loadOwnCall } from './load-own-call';

/** Either person hangs up. Ending twice is harmless: the second call returns it unchanged. */
export class EndCall {
  constructor(
    private readonly calls: CallRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(userId: string, id: string): Promise<Call> {
    const call = await loadOwnCall(this.calls, userId, id);
    if (call.status === 'ended') return toCallDto(call);
    if (call.status !== 'active') {
      throw new CallError(
        'conflict',
        'call_not_active',
        'Only an accepted call can be ended',
      );
    }
    const ended = await this.calls.update(call.id, {
      status: 'ended',
      endedAt: this.now(),
    });
    return toCallDto(ended);
  }
}
