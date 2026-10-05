import {
  createOfferSchema,
  submitNegotiationSchema,
  type CreateOfferData,
  type SubmitNegotiationData,
  type SenderType,
} from '@farm-pool/shared';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { AcceptOfferService } from './application/services/accept-offer.service';
import { CreateOfferService } from './application/services/create-offer.service';
import { DeclineOfferService } from './application/services/decline-offer.service';
import { ListOffersService } from './application/services/list-offers.service';
import { SubmitNegotiationService } from './application/services/submit-negotiation.service';
import { toOfferDto } from './domain/entities/offer';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly createOffer: CreateOfferService,
    private readonly submitNegotiation: SubmitNegotiationService,
    private readonly acceptOffer: AcceptOfferService,
    private readonly declineOffer: DeclineOfferService,
    private readonly listOffers: ListOffersService,
  ) {}

  @Allow('listing:read') // the farmer reading their listing, or buyer looking at listing
  @Get('listing/:listingId')
  async getForListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
  ) {
    const offers = await this.listOffers.execute(user.sub, listingId);
    return offers.map(toOfferDto);
  }

  @Allow('order:place') // Using order:place because buying a listing is order:place, offering on wanted is similar
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOfferSchema)) data: CreateOfferData,
  ) {
    const role = user.role.toUpperCase() as SenderType;
    const offer = await this.createOffer.execute(user.sub, role, data);
    return toOfferDto(offer);
  }

  @Allow('order:renegotiate')
  @Post(':id/negotiation')
  async negotiate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submitNegotiationSchema))
    data: SubmitNegotiationData,
  ) {
    const offer = await this.submitNegotiation.execute(id, data);
    return toOfferDto(offer);
  }

  @Allow('order:renegotiate')
  @Post(':id/accept')
  async accept(@Param('id') id: string) {
    return this.acceptOffer.execute(id);
  }

  @Allow('order:renegotiate')
  @Post(':id/decline')
  async decline(@Param('id') id: string) {
    const offer = await this.declineOffer.execute(id);
    return toOfferDto(offer);
  }
}
