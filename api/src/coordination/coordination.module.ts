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
import { GetBenchmarkPriceHistory } from './application/services/get-benchmark-price-history';
import { GetBenchmarkPrices } from './application/services/get-benchmark-prices';
import { GetCoordinatorDashboard } from './application/services/get-coordinator-dashboard';
import { GetCoordinatorTasks } from './application/services/get-coordinator-tasks';
import { ListCooperativeFarmers } from './application/services/list-cooperative-farmers';
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
 * The coordination domain. Imports `CatalogModule` for the listing repository and `IdentityModule`
 * for the user repository: the dashboard and the farmers list both read across domains. One-way
 * dependency in both cases, same as `orders` → `catalog`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: COOPERATIVE_MODEL, schema: CooperativeSchema },
      { name: BENCHMARK_PRICE_MODEL, schema: BenchmarkPriceSchema },
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
  ],
  exports: [],
})
export class CoordinationModule {}
