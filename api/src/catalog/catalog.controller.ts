import {
  createListingSchema,
  createWantedSchema,
  listingQuerySchema,
  type CreateListingData,
  type CreateWantedData,
  type Listing,
  type ListingQuery,
  type WantedListing,
} from '@farm-pool/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { CloseWanted } from './application/services/close-wanted';
import { CreateListing } from './application/services/create-listing';
import { CreateWanted } from './application/services/create-wanted';
import { GetListing } from './application/services/get-listing';
import { ListListings } from './application/services/list-listings';
import { ListMyListings } from './application/services/list-my-listings';
import { ListWanted } from './application/services/list-wanted';

/**
 * HTTP entry points for the catalog domain. Thin: validate, call one use-case, return.
 * `CatalogError` is turned into a status by `DomainErrorFilter` (app-wide).
 *
 * | Method | Path                        | Allow            | Result                     |
 * | ------ | --------------------------- | ---------------- | -------------------------- |
 * | GET    | /catalog/listings?crop=&district= | `listing:read` | 200 `Listing[]` (verified) |
 * | POST   | /catalog/listings           | `listing:create` | 201 `Listing`              |
 * | GET    | /catalog/listings/mine      | `listing:create` | 200 `Listing[]` (own, all) |
 * | GET    | /catalog/listings/:id       | `listing:read`   | 200 `Listing` · 404        |
 * | GET    | /catalog/wanted?mine=true   | `wanted:read`    | 200 `WantedListing[]`      |
 * | POST   | /catalog/wanted             | `wanted:create`  | 201 `WantedListing`        |
 * | POST   | /catalog/wanted/:id/close   | `wanted:create`  | 200 · 403 · 409            |
 */
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly listListings: ListListings,
    private readonly getListing: GetListing,
    private readonly createListing: CreateListing,
    private readonly listMyListings: ListMyListings,
    private readonly createWanted: CreateWanted,
    private readonly listWanted: ListWanted,
    private readonly closeWanted: CloseWanted,
  ) {}

  @Allow('listing:read')
  @Get('listings')
  listings(
    @Query(new ZodValidationPipe(listingQuerySchema)) query: ListingQuery,
  ): Promise<Listing[]> {
    return this.listListings.execute(query);
  }

  @Allow('listing:create')
  @Post('listings')
  createListingRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createListingSchema)) body: CreateListingData,
  ): Promise<Listing> {
    return this.createListing.execute(user.sub, body);
  }

  /* Declared before `listings/:id`, or Nest would read "mine" as an id. `listing:create` is the
     farmer's action: only someone who can post listings has any of their own. */
  @Allow('listing:create')
  @Get('listings/mine')
  myListings(@CurrentUser() user: AuthenticatedUser): Promise<Listing[]> {
    return this.listMyListings.execute(user.sub);
  }

  @Allow('listing:read')
  @Get('listings/:id')
  listing(@Param('id') id: string): Promise<Listing> {
    return this.getListing.execute(id);
  }

  @Allow('wanted:read')
  @Get('wanted')
  wanted(
    @CurrentUser() user: AuthenticatedUser,
    @Query('mine') mine?: string,
  ): Promise<WantedListing[]> {
    return this.listWanted.execute(user.sub, mine === 'true');
  }

  @Allow('wanted:create')
  @Post('wanted')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWantedSchema)) body: CreateWantedData,
  ): Promise<WantedListing> {
    return this.createWanted.execute(user.sub, body);
  }

  @Allow('wanted:create')
  @Post('wanted/:id/close')
  @HttpCode(200)
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WantedListing> {
    return this.closeWanted.execute(user.sub, id);
  }
}
