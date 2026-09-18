import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { CoordinationController } from './coordination.controller';
import {
  COOPERATIVE_REPOSITORY,
  type CooperativeRepository,
} from './domain/repositories/cooperative.repository';
import {
  COOPERATIVE_MODEL,
  CooperativeSchema,
} from './infrastructure/persistence/cooperative.schema';
import { MongooseCooperativeRepository } from './infrastructure/persistence/mongoose-cooperative.repository';

/**
 * The coordination domain. Imports `CatalogModule` for the listing repository: the dashboard
 * reads the cooperative's member farmers' listings. One-way dependency, same as `orders`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: COOPERATIVE_MODEL, schema: CooperativeSchema },
    ]),
    CatalogModule,
  ],
  controllers: [CoordinationController],
  providers: [
    {
      provide: COOPERATIVE_REPOSITORY,
      useClass: MongooseCooperativeRepository,
    },
    {
      provide: GetCoordinatorDashboard,
      inject: [COOPERATIVE_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        listings: ListingRepository,
      ) => new GetCoordinatorDashboard(cooperatives, listings),
    },
  ],
  exports: [],
})
export class CoordinationModule {}
