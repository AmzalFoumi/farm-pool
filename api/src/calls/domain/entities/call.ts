import type { Call as CallDto, CallStatus } from '@farm-pool/shared';

/**
 * A video call between two users about one listing. See the lifecycle in
 * `packages/shared/src/calls/call.ts`.
 *
 * Names are copied in when the call is created, so the Calls tab lists calls without a join to
 * users. The Agora channel is not stored: it is always `channelFor(id)`.
 */
export interface Call {
  id: string;
  listingId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCall = Omit<
  Call,
  'id' | 'status' | 'startedAt' | 'endedAt' | 'createdAt' | 'updatedAt'
>;

export type CallChanges = Partial<
  Pick<Call, 'status' | 'startedAt' | 'endedAt'>
>;

export function isParticipant(call: Call, userId: string): boolean {
  return call.callerId === userId || call.calleeId === userId;
}

/** The Agora channel for a call. Server-chosen, so a client cannot name another call's room. */
export function channelFor(callId: string): string {
  return `call_${callId}`;
}

export function toCallDto(call: Call): CallDto {
  return {
    id: call.id,
    listingId: call.listingId,
    callerId: call.callerId,
    callerName: call.callerName,
    calleeId: call.calleeId,
    calleeName: call.calleeName,
    status: call.status,
    ...(call.startedAt ? { startedAt: call.startedAt.toISOString() } : {}),
    ...(call.endedAt ? { endedAt: call.endedAt.toISOString() } : {}),
    createdAt: call.createdAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}
