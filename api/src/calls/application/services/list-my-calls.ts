import type { Call } from '@farm-pool/shared';
import { toCallDto } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';

/** Calls the user made or received, newest first. Drives the Calls tab. */
export class ListMyCalls {
  constructor(private readonly calls: CallRepository) {}

  async execute(userId: string): Promise<Call[]> {
    const calls = await this.calls.findByParticipant(userId);
    return calls.map(toCallDto);
  }
}
