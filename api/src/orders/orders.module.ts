import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';

/**
 * The orders domain. Wires its three layers together (domain / application /
 * infrastructure). Register providers and repository bindings here as they are added.
 */
@Module({
  controllers: [OrdersController],
  providers: [],
  exports: [],
})
export class OrdersModule {}
