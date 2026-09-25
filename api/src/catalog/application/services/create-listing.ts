import type { CreateListingData, Listing } from '@farm-pool/shared';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import { toListingDto } from '../../domain/entities/listing';
import type { ListingRepository } from '../../domain/repositories/listing.repository';
import { CatalogError } from '../errors';

/**
 * A farmer posts a listing. It starts `pending_approval` until a coordinator verifies it.
 *
 * `farmerName` is copied from the farmer's own account, not taken from the request or the token:
 * the token only carries the id, and the name is snapshotted onto the listing (and from there
 * onto orders and coordinator tasks), so it has to be the real one at the moment of posting.
 */
export class CreateListing {
  constructor(
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(farmerId: string, data: CreateListingData): Promise<Listing> {
    const farmer = await this.users.findById(farmerId);
    if (!farmer) {
      // A valid token for a deleted account.
      throw new CatalogError(
        'not_found',
        'farmer_not_found',
        'This account no longer exists',
      );
    }
    // No minimum unless the farmer sets one (team decision, 25/9/2026); 1 kg is "no floor".
    const minOrderKg = data.minOrderKg ?? 1;
    const created = await this.listings.create({
      farmerId: farmer.id,
      farmerName: farmer.displayName,
      ...data,
      minOrderKg,
      status: 'pending_approval',
    });
    return toListingDto(created);
  }
}
