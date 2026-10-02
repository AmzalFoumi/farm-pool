import { Module } from '@nestjs/common';
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
import { OrdersModule } from '../orders/orders.module';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '../orders/domain/repositories/order.repository';
import { AcceptJob } from './application/services/accept-job';
import {
  ConfirmDelivery,
  ConfirmPickup,
} from './application/services/confirm-delivery-step';
import { GetAssignedDriver } from './application/services/get-assigned-driver';
import { GetJob } from './application/services/get-job';
import { ListMyJobs } from './application/services/list-my-jobs';
import { ListOpenJobs } from './application/services/list-open-jobs';
import { LogisticsController } from './logistics.controller';

/**
 * The logistics domain (FARM-49/54, LP-20 … LP-24).
 *
 * It owns no collection of its own — see `domain/entities/job.ts` for why a job is not a stored
 * record. What it does own is the three ports it reads through, all one-way:
 *
 * - **orders** — the deal, the lifecycle, and the assignment. Claimed through `ORDER_REPOSITORY`;
 *   the `orders` collection is never written from here.
 * - **catalog** — where the produce is. A job's district, town and gate notes are the listing's.
 * - **identity** — who to call. The farmer's number for the driver, the driver's plate and
 *   verification for the farmer.
 *
 * No `MongooseModule.forFeature` line, and that absence is the design: this domain adds no
 * schema, so there is nothing here that can disagree with the orders collection about whether a
 * job exists.
 */
@Module({
  imports: [OrdersModule, CatalogModule, IdentityModule],
  controllers: [LogisticsController],
  providers: [
    {
      provide: ListOpenJobs,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        orders: OrderRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new ListOpenJobs(orders, listings, users),
    },
    {
      provide: ListMyJobs,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (orders: OrderRepository, listings: ListingRepository) =>
        new ListMyJobs(orders, listings),
    },
    {
      provide: GetJob,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        orders: OrderRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new GetJob(orders, listings, users),
    },
    {
      provide: AcceptJob,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        orders: OrderRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new AcceptJob(orders, listings, users),
    },
    {
      provide: ConfirmPickup,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        orders: OrderRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new ConfirmPickup(orders, listings, users),
    },
    {
      provide: ConfirmDelivery,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        orders: OrderRepository,
        listings: ListingRepository,
        users: UserRepository,
      ) => new ConfirmDelivery(orders, listings, users),
    },
    {
      provide: GetAssignedDriver,
      inject: [ORDER_REPOSITORY, USER_REPOSITORY],
      useFactory: (orders: OrderRepository, users: UserRepository) =>
        new GetAssignedDriver(orders, users),
    },
  ],
  exports: [],
})
export class LogisticsModule {}
