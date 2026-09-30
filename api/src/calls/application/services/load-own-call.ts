import type { Call } from '../../domain/entities/call';
import { isParticipant } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CallError } from '../errors';

/** The call, if it exists and the user is one of its two people. Shared by every use-case. */
export async function loadOwnCall(
  calls: CallRepository,
  userId: string,
  id: string,
): Promise<Call> {
  const call = await calls.findById(id);
  if (!call) {
    throw new CallError(
      'not_found',
      'call_not_found',
      'This call does not exist',
    );
  }
  if (!isParticipant(call, userId)) {
    throw new CallError(
      'forbidden',
      'not_your_call',
      'Only the two people on a call can use it',
    );
  }
  return call;
}
