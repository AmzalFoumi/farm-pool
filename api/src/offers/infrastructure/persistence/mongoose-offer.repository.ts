import type { ListingType, OfferStatus, SenderType } from '@farm-pool/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NewOffer, Offer } from '../../domain/entities/offer';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../../application/errors';
import { OFFER_MODEL, OfferDocument, type OfferHydrated } from './offer.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseOfferRepository implements OfferRepository {
  constructor(
    @InjectModel(OFFER_MODEL) private readonly model: Model<OfferDocument>,
  ) {}

  async findById(id: string): Promise<Offer | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findActiveByListingId(
    listingId: string,
    excludeOfferId?: string,
  ): Promise<Offer[]> {
    const docs = await this.model
      .find({
        listingId,
        status: { $in: ['PENDING', 'NEGOTIATING'] },
        ...(excludeOfferId ? { _id: { $ne: excludeOfferId } } : {}),
      })
      .exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findByListingId(listingId: string): Promise<Offer[]> {
    const docs = await this.model
      .find({ listingId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => this.toDomain(d));
  }

  async save(offer: Offer): Promise<void> {
    const previousVersion = offer.version - 1;
    const result = await this.model
      .findOneAndUpdate(
        { _id: offer.id, version: previousVersion },
        { $set: this.toDocument(offer) },
        { new: true },
      )
      .exec();
    if (!result) {
      throw new OfferError(
        'conflict',
        'conflict',
        'Offer was modified concurrently',
      );
    }
  }

  async create(offer: NewOffer): Promise<Offer> {
    const doc = await this.model.create(this.toDocument(offer as Offer));
    return this.toDomain(doc);
  }

  private toDomain(doc: OfferHydrated): Offer {
    return {
      id: doc._id.toHexString(),
      buyerId: doc.buyerId,
      farmerId: doc.farmerId,
      listingId: doc.listingId,
      listingType: doc.listingType as ListingType,
      cropId: doc.cropId,
      initiatedBy: doc.initiatedBy as SenderType,
      pricePerKg: doc.pricePerKg,
      quantityKg: doc.quantityKg,
      total: doc.total,
      ...(typeof doc.note === 'string' ? { note: doc.note } : {}),
      status: doc.status as OfferStatus,
      actionRequiredBy: doc.actionRequiredBy as SenderType,
      negotiationHistory: doc.negotiationHistory.map((h) => ({
        senderType: h.senderType as SenderType,
        proposedPrice: h.proposedPrice,
        proposedQuantityKg: h.proposedQuantityKg,
        ...(typeof h.note === 'string' ? { note: h.note } : {}),
        timestamp: h.timestamp.toISOString(),
      })),
      version: doc.version,
      ...(typeof doc.orderId === 'string' ? { orderId: doc.orderId } : {}),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toDocument(offer: Offer) {
    return {
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      listingId: offer.listingId,
      listingType: offer.listingType,
      cropId: offer.cropId,
      initiatedBy: offer.initiatedBy,
      pricePerKg: offer.pricePerKg,
      quantityKg: offer.quantityKg,
      total: offer.total,
      ...(offer.note !== undefined ? { note: offer.note } : {}),
      status: offer.status,
      actionRequiredBy: offer.actionRequiredBy,
      negotiationHistory: offer.negotiationHistory.map((h) => ({
        senderType: h.senderType,
        proposedPrice: h.proposedPrice,
        proposedQuantityKg: h.proposedQuantityKg,
        ...(h.note !== undefined ? { note: h.note } : {}),
        timestamp: new Date(h.timestamp),
      })),
      version: offer.version,
      ...(offer.orderId !== undefined ? { orderId: offer.orderId } : {}),
    };
  }
}
