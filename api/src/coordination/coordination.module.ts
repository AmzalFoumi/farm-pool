import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import { IdentityModule } from '../identity/identity.module';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../identity/domain/repositories/user.repository';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';
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
 * The coordination domain. Imports `CatalogModule` for the listing repository and `IdentityModule`
 * for the user repository: the dashboard and the farmers list both read across domains. One-way
 * dependency in both cases, same as `orders` → `catalog`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: COOPERATIVE_MODEL, schema: CooperativeSchema },
    ]),
    CatalogModule,
    IdentityModule,
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
    {
      provide: ListCooperativeFarmers,
      inject: [COOPERATIVE_REPOSITORY, USER_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
        listings: ListingRepository,
      ) => new ListCooperativeFarmers(cooperatives, users, listings),
    },
    {
      provide: GetCoordinatorTasks,
      inject: [COOPERATIVE_REPOSITORY, USER_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
        listings: ListingRepository,
      ) => new GetCoordinatorTasks(cooperatives, users, listings),
    },
  ],
  exports: [],
})
export class CoordinationModule {}
