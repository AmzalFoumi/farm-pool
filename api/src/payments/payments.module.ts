import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '../orders/domain/repositories/order.repository';
import { OrdersModule } from '../orders/orders.module';
import { ConfirmReceipt } from './application/services/confirm-receipt';
import { GetPayment } from './application/services/get-payment';
import { PayForOrder } from './application/services/pay-for-order';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from './domain/gateways/payment-gateway';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from './domain/repositories/payment.repository';
import { SimulatedPaymentGateway } from './infrastructure/gateway/simulated-payment-gateway';
import { MongoosePaymentRepository } from './infrastructure/persistence/mongoose-payment.repository';
import {
  PAYMENT_MODEL,
  PaymentSchema,
} from './infrastructure/persistence/payment.schema';
import { PaymentsController } from './payments.controller';

/**
 * The payments domain. Imports `OrdersModule` for the order repository: paying reads the order
 * and moves it on. The dependency goes one way (payments → orders), never back, and only through
 * the port — this domain never touches the `orders` collection itself.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: PAYMENT_MODEL, schema: PaymentSchema }]),
    OrdersModule,
  ],
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: MongoosePaymentRepository },
    // The one line that changes when a real provider is chosen.
    { provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway },
    {
      provide: PayForOrder,
      inject: [PAYMENT_REPOSITORY, ORDER_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (
        payments: PaymentRepository,
        orders: OrderRepository,
        gateway: PaymentGateway,
      ) => new PayForOrder(payments, orders, gateway),
    },
    {
      provide: ConfirmReceipt,
      inject: [PAYMENT_REPOSITORY, ORDER_REPOSITORY],
      useFactory: (payments: PaymentRepository, orders: OrderRepository) =>
        new ConfirmReceipt(payments, orders),
    },
    {
      provide: GetPayment,
      inject: [PAYMENT_REPOSITORY],
      useFactory: (payments: PaymentRepository) => new GetPayment(payments),
    },
  ],
})
export class PaymentsModule {}
