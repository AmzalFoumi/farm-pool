import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloseWanted } from './application/services/close-wanted';
import { CreateListing } from './application/services/create-listing';
import { CreateWanted } from './application/services/create-wanted';
import { GetListing } from './application/services/get-listing';
import { ListListings } from './application/services/list-listings';
import { ListWanted } from './application/services/list-wanted';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from './domain/repositories/listing.repository';
import {
  WANTED_REPOSITORY,
  type WantedRepository,
} from './domain/repositories/wanted.repository';
import { CatalogController } from './catalog.controller';
import {
  LISTING_MODEL,
  ListingSchema,
} from './infrastructure/persistence/listing.schema';
import { MongooseListingRepository } from './infrastructure/persistence/mongoose-listing.repository';
import { MongooseWantedRepository } from './infrastructure/persistence/mongoose-wanted.repository';
import {
  WANTED_MODEL,
  WantedSchema,
} from './infrastructure/persistence/wanted.schema';

/**
 * The catalog domain, wired the same way as `identity`: ports bound to Mongoose adapters,
 * use-cases built with `useFactory` so they stay plain classes.
 *
 * `LISTING_REPOSITORY` is exported because placing an order reads the listing it is placed
 * against (`orders.module.ts`).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LISTING_MODEL, schema: ListingSchema },
      { name: WANTED_MODEL, schema: WantedSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [
    { provide: LISTING_REPOSITORY, useClass: MongooseListingRepository },
    { provide: WANTED_REPOSITORY, useClass: MongooseWantedRepository },
    {
      provide: ListListings,
      inject: [LISTING_REPOSITORY],
      useFactory: (listings: ListingRepository) => new ListListings(listings),
    },
    {
      provide: GetListing,
      inject: [LISTING_REPOSITORY],
      useFactory: (listings: ListingRepository) => new GetListing(listings),
    },
    {
      provide: CreateListing,
      inject: [LISTING_REPOSITORY],
      useFactory: (listings: ListingRepository) => new CreateListing(listings),
    },
    {
      provide: CreateWanted,
      inject: [WANTED_REPOSITORY],
      useFactory: (wanted: WantedRepository) => new CreateWanted(wanted),
    },
    {
      provide: ListWanted,
      inject: [WANTED_REPOSITORY],
      useFactory: (wanted: WantedRepository) => new ListWanted(wanted),
    },
    {
      provide: CloseWanted,
      inject: [WANTED_REPOSITORY],
      useFactory: (wanted: WantedRepository) => new CloseWanted(wanted),
    },
  ],
  exports: [LISTING_REPOSITORY],
})
export class CatalogModule {}
