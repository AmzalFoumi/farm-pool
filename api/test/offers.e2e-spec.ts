import type {
  ApiErrorBody,
  AuthResponse,
  Offer,
  Order,
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
 * A buyer's offer on a listing over HTTP (FARM-46): make → refusals → counter → accept → the
 * order is `accepted` at the agreed price with the delivery point → pay → `open`.
 */
describe('offers (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = Number(Date.now().toString().slice(-8));
  const phoneOf = (n: number) =>
    `07${((suffix + n) % 1e8).toString().padStart(8, '0')}`;
  const body = <T>(res: request.Response): T => res.body as T;

  let buyer: AuthResponse;
  let otherBuyer: AuthResponse;
  let farmer: AuthResponse;
  let listings: ListingRepository;
  let listingId: string;
  let fixedListingId: string;
  let offerId: string;

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

  const standard = (id: string, kg = 40, price = 170) => ({
    listingId: id,
    listingType: 'STANDARD',
    proposedPrice: price,
    proposedQuantityKg: kg,
  });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    buyer = await register('buyer', 40);
    otherBuyer = await register('buyer', 41);
    farmer = await approveFarmer(
      app,
      await register('farmer', 42),
      'longenough',
    );

    listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const base = {
      farmerId: farmer.user.id,
      farmerName: farmer.user.displayName,
      cropId: 'carrot' as const,
      quantityKg: 100,
      pricePerKg: 200,
      harvestDate: '2026-11-30',
      district: `E2E-${suffix}`,
      minOrderKg: 10,
      status: 'verified' as const,
    };
    listingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:offers`, {
        ...base,
        acceptNegotiation: true,
      })
    ).id;
    fixedListingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:offers:fixed`, {
        ...base,
        acceptNegotiation: false,
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /offers as a buyer → 201 PENDING with both names, the farmer to answer', async () => {
    const res = await as(buyer)
      .post('/offers', standard(listingId))
      .expect(201);
    const offer = body<Offer>(res);
    expect(offer).toMatchObject({
      buyerId: buyer.user.id,
      farmerId: farmer.user.id,
      farmerName: farmer.user.displayName,
      buyerName: buyer.user.displayName,
      pricePerKg: 170,
      quantityKg: 40,
      total: 6800,
      status: 'PENDING',
      actionRequiredBy: 'FARMER',
    });
    offerId = offer.id;
  });

  it('POST /offers refusals: duplicate, out of range, not negotiable, wrong role', async () => {
    const dup = await as(buyer)
      .post('/offers', standard(listingId))
      .expect(409);
    expect(body<ApiErrorBody>(dup).code).toBe('offer_exists');

    const small = await as(otherBuyer)
      .post('/offers', standard(listingId, 5))
      .expect(400);
    expect(body<ApiErrorBody>(small).code).toBe('quantity_out_of_range');

    const fixed = await as(otherBuyer)
      .post('/offers', standard(fixedListingId))
      .expect(409);
    expect(body<ApiErrorBody>(fixed).code).toBe('negotiation_not_accepted');

    const unknown = await as(otherBuyer)
      .post('/offers', standard('000000000000000000000000'))
      .expect(409);
    expect(body<ApiErrorBody>(unknown).code).toBe('listing_unavailable');

    const farmerTry = await as(farmer)
      .post('/offers', standard(listingId))
      .expect(400);
    expect(body<ApiErrorBody>(farmerTry).code).toBe('invalid');
  });

  it('GET /offers/mine and /offers/:id → both sides see it, a stranger does not', async () => {
    for (const who of [buyer, farmer]) {
      const res = await as(who).get('/offers/mine').expect(200);
      expect(body<Offer[]>(res).map((o) => o.id)).toContain(offerId);
      await as(who).get(`/offers/${offerId}`).expect(200);
    }
    const none = await as(otherBuyer).get('/offers/mine').expect(200);
    expect(body<Offer[]>(none)).toEqual([]);

    const denied = await as(otherBuyer).get(`/offers/${offerId}`).expect(403);
    expect(body<ApiErrorBody>(denied).code).toBe('not_your_offer');
  });

  it('POST /offers/:id/accept by the side that proposed → 400', async () => {
    const res = await as(buyer).post(`/offers/${offerId}/accept`).expect(400);
    expect(body<ApiErrorBody>(res).code).toBe('invalid');
  });

  it('POST /offers/:id/negotiation by the farmer → NEGOTIATING, the buyer to answer', async () => {
    const tooMuch = await as(farmer)
      .post(`/offers/${offerId}/negotiation`, {
        proposedPrice: 185,
        proposedQuantityKg: 500,
      })
      .expect(400);
    expect(body<ApiErrorBody>(tooMuch).code).toBe('quantity_out_of_range');

    const res = await as(farmer)
      .post(`/offers/${offerId}/negotiation`, {
        proposedPrice: 185,
        proposedQuantityKg: 40,
        note: 'Grade A',
      })
      .expect(201);
    expect(body<Offer>(res)).toMatchObject({
      pricePerKg: 185,
      status: 'NEGOTIATING',
      actionRequiredBy: 'BUYER',
    });
  });

  let orderId: string;

  it('POST /offers/:id/accept by the buyer with a delivery point → an accepted order', async () => {
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
      quantityKg: 40,
      pricePerKg: 185,
      total: 7400,
      status: 'accepted',
      dropOff: market,
    });
    expect((await listings.findById(listingId))?.quantityKg).toBe(60);

    const again = await as(buyer).post(`/offers/${offerId}/accept`).expect(400);
    expect(body<ApiErrorBody>(again).code).toBe('invalid');
  });

  it('an accept with no body still works (what the app sent before this change)', async () => {
    const res = await as(otherBuyer)
      .post('/offers', standard(listingId, 20))
      .expect(201);
    const accepted = await as(farmer)
      .post(`/offers/${body<Offer>(res).id}/accept`)
      .expect(201);
    expect(body<{ orderId: string }>(accepted).orderId).toEqual(
      expect.any(String),
    );
  });

  it('the order made from the offer can be paid and becomes open', async () => {
    await as(buyer).post(`/payments/orders/${orderId}/pay`).expect(201);
    const order = body<Order>(
      await as(buyer).get(`/orders/${orderId}`).expect(200),
    );
    expect(order.status).toBe('open');
  });
});
