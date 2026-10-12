import { randomUUID } from 'node:crypto';
import { OfferError } from '../../application/errors';
import type { NewOffer, Offer } from '../../domain/entities/offer';
import type {
  OfferPair,
  OfferRepository,
} from '../../domain/repositories/offer.repository';

const LIVE = ['PENDING', 'NEGOTIATING'];

/** Map-backed `OfferRepository` for unit tests. Same version guard as the Mongo one. */
export class InMemoryOfferRepository implements OfferRepository {
  private readonly rows = new Map<string, Offer>();

  create(offer: NewOffer): Promise<Offer> {
    const now = new Date();
    const row: Offer = {
      ...offer,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, snapshot(row));
    return Promise.resolve(snapshot(row));
  }

  findById(id: string): Promise<Offer | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findActiveByListingId(
    listingId: string,
    excludeOfferId?: string,
  ): Promise<Offer[]> {
    return Promise.resolve(
      this.newestFirst(
        (o) =>
          o.listingId === listingId &&
          LIVE.includes(o.status) &&
          o.id !== excludeOfferId,
      ),
    );
  }

  findByListingId(listingId: string): Promise<Offer[]> {
    return Promise.resolve(this.newestFirst((o) => o.listingId === listingId));
  }

  findByBuyerId(buyerId: string): Promise<Offer[]> {
    return Promise.resolve(this.newestFirst((o) => o.buyerId === buyerId));
  }

  findByFarmerId(farmerId: string): Promise<Offer[]> {
    return Promise.resolve(this.newestFirst((o) => o.farmerId === farmerId));
  }

  findActiveBetween(pair: OfferPair): Promise<Offer[]> {
    return Promise.resolve(
      this.newestFirst(
        (o) =>
          o.buyerId === pair.buyerId &&
          o.farmerId === pair.farmerId &&
          o.listingId === pair.listingId &&
          LIVE.includes(o.status),
      ),
    );
  }

  /* Mirrors the Mongo filter `{ _id, version: offer.version - 1 }`: the check and the write are
     one step, so a test can assert the second writer loses. */
  save(offer: Offer): Promise<void> {
    const stored = this.rows.get(offer.id);
    if (!stored || stored.version !== offer.version - 1) {
      return Promise.reject(
        new OfferError(
          'conflict',
          'conflict',
          'Offer was modified concurrently',
        ),
      );
    }
    this.rows.set(offer.id, snapshot({ ...offer, updatedAt: new Date() }));
    return Promise.resolve();
  }

  private newestFirst(match: (offer: Offer) => boolean): Offer[] {
    return [...this.rows.values()]
      .filter(match)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(snapshot);
  }
}

function snapshot(row: Offer): Offer {
  return {
    ...row,
    negotiationHistory: row.negotiationHistory.map((h) => ({ ...h })),
    ...(row.dropOff
      ? { dropOff: { ...row.dropOff, point: { ...row.dropOff.point } } }
      : {}),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
