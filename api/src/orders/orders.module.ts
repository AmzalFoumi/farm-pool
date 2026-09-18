import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import { CancelOrder } from './application/services/cancel-order';
import { GetOrder } from './application/services/get-order';
import { ListMyOrders } from './application/services/list-my-orders';
import { PlaceOrder } from './application/services/place-order';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from './domain/repositories/order.repository';
import { MongooseOrderRepository } from './infrastructure/persistence/mongoose-order.repository';
import {
  ORDER_MODEL,
  OrderSchema,
} from './infrastructure/persistence/order.schema';
import { OrdersController } from './orders.controller';

/**
 * The orders domain. Imports `CatalogModule` for the listing repository: placing an order reads
 * the listing it is placed against. That is the only cross-domain dependency, and it goes one
 * way (orders → catalog), never back.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: ORDER_MODEL, schema: OrderSchema }]),
    CatalogModule,
  ],
  controllers: [OrdersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: MongooseOrderRepository },
    {
      provide: PlaceOrder,
      inject: [ORDER_REPOSITORY, LISTING_REPOSITORY],
      useFactory: (orders: OrderRepository, listings: ListingRepository) =>
        new PlaceOrder(orders, listings),
    },
    {
      provide: ListMyOrders,
      inject: [ORDER_REPOSITORY],
      useFactory: (orders: OrderRepository) => new ListMyOrders(orders),
    },
    {
      provide: GetOrder,
      inject: [ORDER_REPOSITORY],
      useFactory: (orders: OrderRepository) => new GetOrder(orders),
    },
    {
      provide: CancelOrder,
      inject: [ORDER_REPOSITORY],
      useFactory: (orders: OrderRepository) => new CancelOrder(orders),
    },
  ],
})
export class OrdersModule {}
