import type {
  ApiErrorBody,
  AuthResponse,
  Offer,
  Order,
  WantedListing,
} from '@farm-pool/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from './../src/catalog/domain/repositories/listing.repository';
import { approveFarmer } from './approve-farmer';

/**
 * A farmer answering a buyer's wanted request over HTTP (FARM-47): respond → refusals → the buyer
 * reads the responses → accept → the request is closed, the other response is declined, an
 * ordinary offer on the same listing is untouched → the order is paid and becomes `open`.
 */
describe('wanted response (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = Number(Date.now().toString().slice(-8));
  // Offset so a suite that starts in the same millisecond cannot pick the same phone.
  const phoneOf = (n: number) =>
    `07${((suffix + 60000000 + n) % 1e8).toString().padStart(8, '0')}`;
  const body = <T>(res: request.Response): T => res.body as T;

  let buyer: AuthResponse;
  let otherBuyer: AuthResponse;
  let farmer: AuthResponse;
  let otherFarmer: AuthResponse;
  let listings: ListingRepository;
  let listingId: string;
  let otherListingId: string;
  let beansListingId: string;
  let wantedId: string;

  const market = {
    label: 'Pettah',
    point: { latitude: 6.93, longitude: 79.85 },
  };

  const register = async (role: string, n: number): Promise<AuthResponse> => {
    const res = await request(app.getHttpServer())
      .post('/identity/register')
      .send({
        displayName: `${role} ${n}`,
        phone: phoneOf(n),
        password: 'longenough',
        role,
      })
      .expect(201);
    return body<AuthResponse>(res);
  };

  const as = (who: AuthResponse) => ({
    get: (path: string) =>
      request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${who.token}`),
    post: (path: string, payload?: object) => {
      const req = request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${who.token}`);
      return payload ? req.send(payload) : req;
    },
  });

  const respondFrom = (id: string, kg = 30, price = 175) => ({
    listingId: id,
    listingType: 'WANTED',
    wantedId,
    proposedPrice: price,
    proposedQuantityKg: kg,
  });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    buyer = await register('buyer', 80);
    otherBuyer = await register('buyer', 81);
    farmer = await approveFarmer(
      app,
      await register('farmer', 82),
      'longenough',
    );
    otherFarmer = await approveFarmer(
      app,
      await register('farmer', 83),
      'longenough',
    );

    listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const listing = (owner: AuthResponse, cropId: 'carrot' | 'beans') => ({
      farmerId: owner.user.id,
      farmerName: owner.user.displayName,
      cropId,
      quantityKg: 100,
      pricePerKg: 200,
      harvestDate: '2026-11-30',
      district: `E2E-${suffix}`,
      minOrderKg: 10,
      acceptNegotiation: true,
      status: 'verified' as const,
    });
    listingId = (
      await listings.upsertBySeedKey(
        `e2e:${suffix}:wr:a`,
        listing(farmer, 'carrot'),
      )
    ).id;
    otherListingId = (
      await listings.upsertBySeedKey(
        `e2e:${suffix}:wr:b`,
        listing(otherFarmer, 'carrot'),
      )
    ).id;
    beansListingId = (
      await listings.upsertBySeedKey(
        `e2e:${suffix}:wr:c`,
        listing(farmer, 'beans'),
      )
    ).id;

    const res = await as(buyer)
      .post('/catalog/wanted', {
        cropId: 'carrot',
        quantityKg: 60,
        neededBy: '2026-12-01',
        district: 'Colombo',
      })
      .expect(201);
    wantedId = body<WantedListing>(res).id;
  });

  afterAll(async () => {
    await app.close();
  });

  let offerId: string;
  let losingOfferId: string;
  let ordinaryOfferId: string;

  it('POST /offers as a farmer, from their own listing → 201 PENDING, the buyer to answer', async () => {
    const res = await as(farmer)
      .post('/offers', respondFrom(listingId))
      .expect(201);
    const offer = body<Offer>(res);
    expect(offer).toMatchObject({
      buyerId: buyer.user.id,
      farmerId: farmer.user.id,
      listingId,
      listingType: 'WANTED',
      wantedId,
      initiatedBy: 'FARMER',
      status: 'PENDING',
      actionRequiredBy: 'BUYER',
      farmerName: farmer.user.displayName,
      buyerName: buyer.user.displayName,
    });
    offerId = offer.id;

    const second = await as(otherFarmer)
      .post('/offers', respondFrom(otherListingId, 30, 180))
      .expect(201);
    losingOfferId = body<Offer>(second).id;

    const ordinary = await as(otherBuyer)
      .post('/offers', {
        listingId,
        listingType: 'STANDARD',
        proposedPrice: 190,
        proposedQuantityKg: 20,
      })
      .expect(201);
    ordinaryOfferId = body<Offer>(ordinary).id;
  });

  it('POST /offers refusals for a response', async () => {
    const notMine = await as(otherFarmer)
      .post('/offers', respondFrom(listingId))
      .expect(403);
    expect(body<ApiErrorBody>(notMine).code).toBe('not_your_listing');

    const wrongCrop = await as(farmer)
      .post('/offers', respondFrom(beansListingId))
      .expect(400);
    expect(body<ApiErrorBody>(wrongCrop).code).toBe('crop_mismatch');

    const dup = await as(farmer)
      .post('/offers', respondFrom(listingId))
      .expect(409);
    expect(body<ApiErrorBody>(dup).code).toBe('offer_exists');

    const noRequest = await as(farmer)
      .post('/offers', { ...respondFrom(listingId), wantedId: undefined })
      .expect(400);
    expect(body<ApiErrorBody>(noRequest).code).toBe('validation_error');

    const unknown = await as(farmer)
      .post('/offers', {
        ...respondFrom(listingId),
        wantedId: '000000000000000000000000',
      })
      .expect(409);
    expect(body<ApiErrorBody>(unknown).code).toBe('wanted_closed');

    const buyerTry = await as(buyer)
      .post('/offers', respondFrom(listingId))
      .expect(400);
    expect(body<ApiErrorBody>(buyerTry).code).toBe('invalid');
  });

  it('GET /offers/wanted/:id → the buyer sees both responses, each farmer only their own', async () => {
    const forBuyer = body<Offer[]>(
      await as(buyer).get(`/offers/wanted/${wantedId}`).expect(200),
    );
    expect(forBuyer.map((o) => o.id).sort()).toEqual(
      [offerId, losingOfferId].sort(),
    );

    const forFarmer = body<Offer[]>(
      await as(farmer).get(`/offers/wanted/${wantedId}`).expect(200),
    );
    expect(forFarmer.map((o) => o.id)).toEqual([offerId]);

    const forStranger = body<Offer[]>(
      await as(otherBuyer).get(`/offers/wanted/${wantedId}`).expect(200),
    );
    expect(forStranger).toEqual([]);
  });

  it('the response also shows among the offers on the farmer’s listing', async () => {
    const res = await as(farmer)
      .get(`/offers/listing/${listingId}`)
      .expect(200);
    expect(body<Offer[]>(res).map((o) => o.id)).toEqual(
      expect.arrayContaining([offerId, ordinaryOfferId]),
    );
  });

  let orderId: string;

  it('POST /offers/:id/accept by the buyer → an accepted order; the request is closed', async () => {
    const res = await as(buyer)
      .post(`/offers/${offerId}/accept`, { dropOff: market })
      .expect(201);
    orderId = body<{ orderId: string }>(res).orderId;

    const order = body<Order>(
      await as(buyer).get(`/orders/${orderId}`).expect(200),
    );
    expect(order).toMatchObject({
      buyerId: buyer.user.id,
      farmerId: farmer.user.id,
      listingId,
      offerId,
      quantityKg: 30,
      pricePerKg: 175,
      status: 'accepted',
      dropOff: market,
    });
    expect((await listings.findById(listingId))?.quantityKg).toBe(70);

    const mine = body<WantedListing[]>(
      await as(buyer).get('/catalog/wanted?mine=true').expect(200),
    );
    expect(mine.find((w) => w.id === wantedId)?.status).toBe('closed');
  });

  it('the other response was declined; the ordinary offer on the listing was not', async () => {
    const loser = body<Offer>(
      await as(otherFarmer).get(`/offers/${losingOfferId}`).expect(200),
    );
    expect(loser.status).toBe('DECLINED');

    const ordinary = body<Offer>(
      await as(otherBuyer).get(`/offers/${ordinaryOfferId}`).expect(200),
    );
    expect(ordinary.status).toBe('PENDING');
  });

  it('a new response to the closed request → 409 wanted_closed', async () => {
    const res = await as(otherFarmer)
      .post('/offers', respondFrom(otherListingId))
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('wanted_closed');
  });

  it('the order can be paid and becomes open, like any other', async () => {
    await as(buyer).post(`/payments/orders/${orderId}/pay`).expect(201);
    const order = body<Order>(
      await as(buyer).get(`/orders/${orderId}`).expect(200),
    );
    expect(order.status).toBe('open');
  });
});
