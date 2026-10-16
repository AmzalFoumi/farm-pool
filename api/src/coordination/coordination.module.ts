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
import { OrdersModule } from '../orders/orders.module';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '../orders/domain/repositories/order.repository';
import { ApproveFarmer } from './application/services/approve-farmer';
import { ApproveListing } from './application/services/approve-listing';
import { GetBenchmarkPriceHistory } from './application/services/get-benchmark-price-history';
import { GetBenchmarkPrices } from './application/services/get-benchmark-prices';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { JoinCooperative } from './application/services/join-cooperative';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';
import { ListCooperativeListings } from './application/services/list-cooperative-listings';
import { ListCooperativeOrders } from './application/services/list-cooperative-orders';
import { RejectFarmer } from './application/services/reject-farmer';
import { RejectListing } from './application/services/reject-listing';
import { SetBenchmarkPrice } from './application/services/set-benchmark-price';
import { CoordinationController } from './coordination.controller';
import {
  BENCHMARK_PRICE_REPOSITORY,
  type BenchmarkPriceRepository,
} from './domain/repositories/benchmark-price.repository';
import {
  COOPERATIVE_REPOSITORY,
  type CooperativeRepository,
} from './domain/repositories/cooperative.repository';
import {
  BENCHMARK_PRICE_MODEL,
  BenchmarkPriceSchema,
} from './infrastructure/persistence/benchmark-price.schema';
import {
  COOPERATIVE_MODEL,
  CooperativeSchema,
} from './infrastructure/persistence/cooperative.schema';
import { MongooseBenchmarkPriceRepository } from './infrastructure/persistence/mongoose-benchmark-price.repository';
import { MongooseCooperativeRepository } from './infrastructure/persistence/mongoose-cooperative.repository';

/**
 * The coordination domain. Imports `CatalogModule` for the listing repository, `IdentityModule`
 * for the user repository, and `OrdersModule` for the order repository (Disputes monitoring,
 * FARM-43 follow-up): the dashboard, farmers list and disputes view each read across domains.
 * One-way dependency in every case, same as `orders` → `catalog`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: COOPERATIVE_MODEL, schema: CooperativeSchema },
      { name: BENCHMARK_PRICE_MODEL, schema: BenchmarkPriceSchema },
    ]),
    CatalogModule,
    IdentityModule,
    OrdersModule,
  ],
  controllers: [CoordinationController],
  providers: [
    {
      provide: COOPERATIVE_REPOSITORY,
      useClass: MongooseCooperativeRepository,
    },
    {
      provide: BENCHMARK_PRICE_REPOSITORY,
      useClass: MongooseBenchmarkPriceRepository,
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
      inject: [
        COOPERATIVE_REPOSITORY,
        USER_REPOSITORY,
        LISTING_REPOSITORY,
        BENCHMARK_PRICE_REPOSITORY,
      ],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
        listings: ListingRepository,
        benchmarkPrices: BenchmarkPriceRepository,
      ) =>
        new GetCoordinatorTasks(cooperatives, users, listings, benchmarkPrices),
    },
    {
      provide: GetBenchmarkPrices,
      inject: [
        COOPERATIVE_REPOSITORY,
        BENCHMARK_PRICE_REPOSITORY,
        LISTING_REPOSITORY,
      ],
      useFactory: (
        cooperatives: CooperativeRepository,
        benchmarkPrices: BenchmarkPriceRepository,
        listings: ListingRepository,
      ) => new GetBenchmarkPrices(cooperatives, benchmarkPrices, listings),
    },
    {
      provide: SetBenchmarkPrice,
      inject: [COOPERATIVE_REPOSITORY, BENCHMARK_PRICE_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        benchmarkPrices: BenchmarkPriceRepository,
      ) => new SetBenchmarkPrice(cooperatives, benchmarkPrices),
    },
    {
      provide: GetBenchmarkPriceHistory,
      inject: [COOPERATIVE_REPOSITORY, BENCHMARK_PRICE_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        benchmarkPrices: BenchmarkPriceRepository,
      ) => new GetBenchmarkPriceHistory(cooperatives, benchmarkPrices),
    },
    {
      provide: JoinCooperative,
      inject: [COOPERATIVE_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
      ) => new JoinCooperative(cooperatives, users),
    },
    {
      provide: ApproveFarmer,
      inject: [COOPERATIVE_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
      ) => new ApproveFarmer(cooperatives, users),
    },
    {
      provide: RejectFarmer,
      inject: [COOPERATIVE_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        users: UserRepository,
      ) => new RejectFarmer(cooperatives, users),
    },
    {
      provide: ApproveListing,
      inject: [COOPERATIVE_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        listings: ListingRepository,
      ) => new ApproveListing(cooperatives, listings),
    },
    {
      provide: ListCooperativeListings,
      inject: [COOPERATIVE_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        listings: ListingRepository,
      ) => new ListCooperativeListings(cooperatives, listings),
    },
    {
      provide: RejectListing,
      inject: [COOPERATIVE_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        listings: ListingRepository,
      ) => new RejectListing(cooperatives, listings),
    },
    {
      provide: ListCooperativeOrders,
      inject: [COOPERATIVE_REPOSITORY, ORDER_REPOSITORY],
      useFactory: (
        cooperatives: CooperativeRepository,
        orders: OrderRepository,
      ) => new ListCooperativeOrders(cooperatives, orders),
    },
  ],
  exports: [],
})
export class CoordinationModule {}
