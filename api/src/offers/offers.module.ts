import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';
import { AcceptOfferService } from './application/services/accept-offer.service';
import { CreateOfferService } from './application/services/create-offer.service';
import { DeclineOfferService } from './application/services/decline-offer.service';
import { ListOffersService } from './application/services/list-offers.service';
import { SubmitNegotiationService } from './application/services/submit-negotiation.service';
import { OFFER_REPOSITORY } from './domain/repositories/offer.repository';
import { MongooseOfferRepository } from './infrastructure/persistence/mongoose-offer.repository';
import {
  OFFER_MODEL,
  OfferSchema,
} from './infrastructure/persistence/offer.schema';
import { OffersController } from './offers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OFFER_MODEL, schema: OfferSchema }]),
    OrdersModule,
    CatalogModule,
  ],
  controllers: [OffersController],
  providers: [
    { provide: OFFER_REPOSITORY, useClass: MongooseOfferRepository },
    CreateOfferService,
    SubmitNegotiationService,
    AcceptOfferService,
    DeclineOfferService,
    ListOffersService,
  ],
  exports: [OFFER_REPOSITORY],
})
export class OffersModule {}
