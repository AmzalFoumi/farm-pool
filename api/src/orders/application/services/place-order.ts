import { toCents, type Order, type PlaceOrderData } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderError } from '../errors';
import type { Offer } from '../../../offers/domain/entities/offer';

/**
 * A buyer asks to buy `quantityKg` from one listing. The order is created as `requested`; the
 * farmer's answer is a later story.
 *
 * Rules that are not shape rules (zod handled those at the edge):
 * - the listing must exist and be `verified` — anything else is 404 / 409 to the buyer
 * - the quantity must be between the listing's minimum order and what is on offer
 * - price, farmer and crop are copied from the listing, never taken from the request
 *
 * Placing an order does NOT reduce the listing's quantity. Only a farmer accepting does, and
 * that is theirs to write.
 */
export class PlaceOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(buyerId: string, data: PlaceOrderData): Promise<Order> {
    const listing = await this.listings.findById(data.listingId);
    if (!listing) {
      throw new OrderError(
        'not_found',
        'listing_not_found',
        'This listing no longer exists',
      );
    }
    if (listing.status !== 'verified') {
      throw new OrderError(
        'conflict',
        'listing_unavailable',
        'This listing is not available to order',
      );
    }
    if (
      data.quantityKg < listing.minOrderKg ||
      data.quantityKg > listing.quantityKg
    ) {
      throw new OrderError(
        'invalid',
        'quantity_out_of_range',
        `Order between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`,
      );
    }

    const created = await this.orders.create({
      buyerId,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      listingId: listing.id,
      cropId: listing.cropId,
      quantityKg: data.quantityKg,
      pricePerKg: listing.pricePerKg,
      total: toCents(data.quantityKg * listing.pricePerKg),
      ...(data.note ? { note: data.note } : {}),
      status: 'requested',
    });
    return toOrderDto(created);
  }

  /**
   * Creates an Order directly from an already-negotiated and accepted Offer (FARM-46).
   * Bypasses PlaceOrderData validation deliberately — price and quantity are the final
   * negotiated terms, not the listing's original asking price.
   */
  async executeFromOffer(offer: Offer): Promise<Order> {
    const listing = await this.listings.findById(offer.listingId);
    if (!listing) {
      throw new OrderError(
        'not_found',
        'listing_not_found',
        'This listing no longer exists',
      );
    }
    const created = await this.orders.create({
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      farmerName: listing.farmerName,
      listingId: offer.listingId,
      offerId: offer.id,
      cropId: offer.cropId,
      quantityKg: offer.quantityKg,
      pricePerKg: offer.pricePerKg,
      total: toCents(offer.quantityKg * offer.pricePerKg),
      ...(offer.note ? { note: offer.note } : {}),
      status: 'open',
    });
    return toOrderDto(created);
  }
}
