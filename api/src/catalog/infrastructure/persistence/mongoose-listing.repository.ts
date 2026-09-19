import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type QueryFilter } from 'mongoose';
import type { Listing, NewListing } from '../../domain/entities/listing';
import type {
  ListingFilter,
  ListingRepository,
} from '../../domain/repositories/listing.repository';
import {
  LISTING_MODEL,
  ListingDocument,
  type ListingHydrated,
} from './listing.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseListingRepository implements ListingRepository {
  constructor(
    @InjectModel(LISTING_MODEL)
    private readonly listings: Model<ListingDocument>,
  ) {}

  async findById(id: string): Promise<Listing | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.listings.findById(id).exec();
    return doc ? toListing(doc) : null;
  }

  async findVerified(filter: ListingFilter, limit: number): Promise<Listing[]> {
    const query: QueryFilter<ListingDocument> = { status: 'verified' };
    if (filter.crop) query.cropId = filter.crop;
    if (filter.district) query.districtKey = filter.district.toLowerCase();
    if (filter.farmerId) query.farmerId = filter.farmerId;
    const docs = await this.listings
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return docs.map(toListing);
  }

  async findByFarmerId(farmerId: string): Promise<Listing[]> {
    const docs = await this.listings
      .find({ farmerId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toListing);
  }

  async create(listing: NewListing): Promise<Listing> {
    const created = await this.listings.create({
      ...listing,
      districtKey: listing.district.toLowerCase(),
    });
    return toListing(created as ListingHydrated);
  }

  async upsertBySeedKey(
    seedKey: string,
    listing: NewListing,
  ): Promise<Listing> {
    const doc = await this.listings
      .findOneAndUpdate(
        { seedKey },
        { ...listing, districtKey: listing.district.toLowerCase(), seedKey },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    return toListing(doc);
  }
}

function toListing(doc: ListingHydrated): Listing {
  return {
    id: doc._id.toHexString(),
    farmerId: doc.farmerId,
    farmerName: doc.farmerName,
    cropId: doc.cropId,
    category: doc.category,
    quantityKg: doc.quantityKg,
    unit: doc.unit,
    variety: doc.variety,
    grade: doc.grade,
    packaging: doc.packaging,
    certifications: doc.certifications,
    pricePerKg: doc.pricePerKg,
    harvestDate: doc.harvestDate,
    expiryDays: doc.expiryDays,
    photos: doc.photos,
    acceptNegotiation: doc.acceptNegotiation,
    district: doc.district,
    town: doc.town,
    address: doc.address,
    fulfillmentOption: doc.fulfillmentOption,
    farmgateNotes: doc.farmgateNotes,
    minOrderKg: doc.minOrderKg,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
