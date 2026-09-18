import type { ApiErrorBody, AuthResponse, Order } from '@farm-pool/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from './../src/catalog/domain/repositories/listing.repository';

/**
 * The buyer order story over HTTP: place → mine → get → cancel, plus the refusals
 * (farmer cannot place, another buyer cannot read or cancel, bad quantity is 400).
 */
describe('orders (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = Number(Date.now().toString().slice(-8));
  const phoneOf = (n: number) =>
    `07${((suffix + n) % 1e8).toString().padStart(8, '0')}`;

  let buyer: AuthResponse;
  let otherBuyer: AuthResponse;
  let farmer: AuthResponse;
  let listingId: string;

  const body = <T>(res: request.Response): T => res.body as T;

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

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    buyer = await register('buyer', 20);
    otherBuyer = await register('buyer', 21);
    farmer = await register('farmer', 22);

    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    listingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:orders`, {
        farmerId: farmer.user.id,
        farmerName: farmer.user.displayName,
        cropId: 'carrot',
        quantityKg: 100,
        pricePerKg: 200,
        harvestDate: '2026-09-30',
        district: `E2E-${suffix}`,
        minOrderKg: 10,
        status: 'verified',
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  let orderId: string;

  it('POST /orders as a buyer → 201 requested, total computed on the server', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, quantityKg: 20, note: 'Morning pickup' })
      .expect(201);
    const order = body<Order>(res);
    expect(order).toMatchObject({
      buyerId: buyer.user.id,
      farmerId: farmer.user.id,
      cropId: 'carrot',
      quantityKg: 20,
      pricePerKg: 200,
      total: 4000,
      status: 'requested',
      note: 'Morning pickup',
    });
    orderId = order.id;
  });

  it('POST /orders below the minimum → 400 quantity_out_of_range', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, quantityKg: 5 })
      .expect(400);
    expect(body<ApiErrorBody>(res).code).toBe('quantity_out_of_range');
  });

  it('POST /orders for an unknown listing → 404 listing_not_found', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId: '000000000000000000000000', quantityKg: 10 })
      .expect(404);
    expect(body<ApiErrorBody>(res).code).toBe('listing_not_found');
  });

  it('POST /orders as a farmer → 403 forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ listingId, quantityKg: 10 })
      .expect(403);
    expect(body<ApiErrorBody>(res).code).toBe('forbidden');
  });

  it("GET /orders/mine → the buyer's orders only", async () => {
    const res = await request(app.getHttpServer())
      .get('/orders/mine')
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(body<Order[]>(res).map((o) => o.id)).toEqual([orderId]);

    const other = await request(app.getHttpServer())
      .get('/orders/mine')
      .set('Authorization', `Bearer ${otherBuyer.token}`)
      .expect(200);
    expect(body<Order[]>(other)).toEqual([]);
  });

  it('GET /orders/:id → 200 for buyer and farmer, 403 for another buyer', async () => {
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .expect(200);
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherBuyer.token}`)
      .expect(403);
    expect(body<ApiErrorBody>(res).code).toBe('not_your_order');
  });

  it('POST /orders/:id/cancel → 403 for another buyer, 200 for the owner, 409 again', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${otherBuyer.token}`)
      .expect(403);

    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(body<Order>(res).status).toBe('cancelled');

    const again = await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(409);
    expect(body<ApiErrorBody>(again).code).toBe('order_not_cancellable');
  });
});
