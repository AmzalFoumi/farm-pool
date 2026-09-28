import type { Call } from '@farm-pool/shared';
import { toCallDto } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CallError } from '../errors';
import { loadOwnCall } from './load-own-call';

/**
 * The farmer being called accepts (`active`, both may now get a pass) or declines. Only the
 * callee, and only while the call is still `requested` (FARM-24).
 */
export class AnswerCall {
  constructor(private readonly calls: CallRepository) {}

  async execute(
    userId: string,
    id: string,
    answer: 'accept' | 'decline',
  ): Promise<Call> {
    const call = await loadOwnCall(this.calls, userId, id);
    if (call.calleeId !== userId) {
      throw new CallError(
        'forbidden',
        'not_the_callee',
        'Only the person being called can answer',
      );
    }
    if (call.status !== 'requested') {
      throw new CallError(
        'conflict',
        'call_not_requested',
        'This call has already been answered',
      );
    }
    const answered = await this.calls.update(call.id, {
      status: answer === 'accept' ? 'active' : 'declined',
    });
    return toCallDto(answered);
  }
}
