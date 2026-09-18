import type { WantedListing } from '@farm-pool/shared';
import { toWantedListingDto } from '../../domain/entities/wanted-listing';
import type { WantedRepository } from '../../domain/repositories/wanted.repository';
import { CatalogError } from '../errors';

/** The buyer who posted a request withdraws it. Only the owner; only while open. */
export class CloseWanted {
  constructor(private readonly wanted: WantedRepository) {}

  async execute(callerId: string, id: string): Promise<WantedListing> {
    const existing = await this.wanted.findById(id);
    if (!existing) {
      throw new CatalogError(
        'not_found',
        'wanted_not_found',
        'This request does not exist',
      );
    }
    if (existing.buyerId !== callerId) {
      throw new CatalogError(
        'forbidden',
        'not_your_request',
        'Only the buyer who posted a request can close it',
      );
    }
    if (existing.status === 'closed') {
      throw new CatalogError(
        'conflict',
        'wanted_already_closed',
        'This request is already closed',
      );
    }
    const closed = await this.wanted.updateStatus(id, 'closed');
    return toWantedListingDto(closed);
  }
}
