import type { Call, RequestCallData } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import { toCallDto } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CallError } from '../errors';

/**
 * A buyer asks the farmer behind a listing for a video call (FARM-24). Stored as `requested`;
 * the farmer accepts or declines on the Calls tab.
 *
 * - the farmer is read from the listing, never from the request
 * - the listing must exist and be `verified`, and must not be the caller's own
 * - one open (`requested` or `active`) call per buyer per listing: tapping twice is not two calls
 */
export class RequestCall {
  constructor(
    private readonly calls: CallRepository,
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(callerId: string, data: RequestCallData): Promise<Call> {
    const listing = await this.listings.findById(data.listingId);
    if (!listing) {
      throw new CallError(
        'not_found',
        'listing_not_found',
        'This listing no longer exists',
      );
    }
    if (listing.status !== 'verified') {
      throw new CallError(
        'conflict',
        'listing_unavailable',
        'This listing is not available',
      );
    }
    if (listing.farmerId === callerId) {
      throw new CallError(
        'invalid',
        'own_listing',
        'You cannot call about your own listing',
      );
    }
    if (await this.calls.findOpen(callerId, listing.id)) {
      throw new CallError(
        'conflict',
        'call_already_open',
        'You already have a call request open for this listing',
      );
    }

    const caller = await this.users.findById(callerId);
    const created = await this.calls.create({
      listingId: listing.id,
      callerId,
      callerName: caller?.displayName ?? 'Buyer',
      calleeId: listing.farmerId,
      calleeName: listing.farmerName,
    });
    return toCallDto(created);
  }
}
