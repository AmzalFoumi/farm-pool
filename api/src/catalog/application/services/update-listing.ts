import { Inject, Injectable } from '@nestjs/common';
import { CreateListingData } from '@farm-pool/shared';
import { toListingDto } from '../../domain/entities/listing';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../../domain/repositories/listing.repository';
import { CatalogError } from '../errors';

@Injectable()
export class UpdateListing {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: ListingRepository,
  ) {}

  /**
   * Updates an existing listing.
   * Only the farmer who created the listing can update it.
   */
  async execute(listingId: string, farmerId: string, data: CreateListingData) {
    const listing = await this.listingRepository.findById(listingId);

    if (!listing) {
      throw new CatalogError(
        'not_found',
        'listing_not_found',
        'Listing not found',
      );
    }

    if (listing.farmerId !== farmerId) {
      throw new CatalogError(
        'forbidden',
        'not_your_request',
        'You do not have permission to edit this listing',
      );
    }

    // Merge the new data into the listing
    listing.cropId = data.cropId;
    listing.quantityKg = data.quantityKg;
    listing.unit = data.unit;
    listing.variety = data.variety;
    listing.grade = data.grade;
    listing.packaging = data.packaging;
    listing.certifications = data.certifications;
    listing.pricePerKg = data.pricePerKg;
    listing.harvestDate = data.harvestDate;
    listing.expiryDays = data.expiryDays;
    listing.photos = data.photos;
    listing.acceptNegotiation = data.acceptNegotiation;
    listing.district = data.district;
    listing.town = data.town;
    listing.address = data.address;
    listing.fulfillmentOption = data.fulfillmentOption;
    listing.farmgateNotes = data.farmgateNotes;
    listing.minOrderKg = data.minOrderKg ?? data.quantityKg;

    // Reset status to pending_approval when farmer edits it (FARM-31)
    listing.status = 'pending_approval';

    // Persist changes
    const updated = await this.listingRepository.update(listingId, listing);
    return toListingDto(updated);
  }
}
