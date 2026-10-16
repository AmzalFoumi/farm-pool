import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrdersModule } from '../orders/orders.module';
import { AcceptOfferService } from './application/services/accept-offer.service';
import { CreateOfferService } from './application/services/create-offer.service';
import { DeclineOfferService } from './application/services/decline-offer.service';
import { GetOfferService } from './application/services/get-offer.service';
import { ListMyOffersService } from './application/services/list-my-offers.service';
import { ListOffersService } from './application/services/list-offers.service';
import { ListWantedOffersService } from './application/services/list-wanted-offers.service';
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
    IdentityModule,
  ],
  controllers: [OffersController],
  providers: [
    { provide: OFFER_REPOSITORY, useClass: MongooseOfferRepository },
    CreateOfferService,
    SubmitNegotiationService,
    AcceptOfferService,
    DeclineOfferService,
    ListOffersService,
    ListMyOffersService,
    GetOfferService,
    ListWantedOffersService,
  ],
  exports: [OFFER_REPOSITORY],
})
export class OffersModule {}
