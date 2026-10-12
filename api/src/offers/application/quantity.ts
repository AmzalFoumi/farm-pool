import type { Listing } from '../../catalog/domain/entities/listing';
import { OfferError } from './errors';

/** An offered quantity must be something the listing can actually fill: at least its minimum
 *  order, at most what is left. The same rule `PlaceOrder.execute` applies to a plain order. */
export function assertQuantityFits(listing: Listing, quantityKg: number): void {
  if (quantityKg < listing.minOrderKg || quantityKg > listing.quantityKg) {
    throw new OfferError(
      'invalid',
      'quantity_out_of_range',
      `Offer between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`,
    );
  }
}
