import type {
  ApiErrorBody,
  AuthResponse,
  JobSummary,
  Order,
  Payment,
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
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from './../src/orders/domain/repositories/order.repository';

/**
 * The escrow story over HTTP: a buyer pays an accepted order, the order reaches the driver job
 * board, and both sides can read the payment — plus every refusal in the endpoint table.
 *
 * Farmer acceptance (FARM-46) has no endpoint yet, so an order is moved to `accepted` through
 * the repository, which is exactly the state that story will leave it in.
 */
describe('payments (e2e)', () => {
  let app: INestApplication<App>;
  let orders: OrderRepository;
  const suffix = Number(Date.now().toString().slice(-8));
  const phoneOf = (n: number) =>
    `07${((suffix + n) % 1e8).toString().padStart(8, '0')}`;
  const district = `E2E-${suffix}-pay`;

  let buyer: AuthResponse;
  let otherBuyer: AuthResponse;
  let farmer: AuthResponse;
  let driver: AuthResponse;
  let listingId: string;

  const body = <T>(res: request.Response): T => res.body as T;
  const as = (who: AuthResponse) => ({ Authorization: `Bearer ${who.token}` });

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

  /** A 20 kg order at Rs 200 (Rs 4,000), left `requested` or moved on to `accepted`. */
  const placeOrder = async (accepted: boolean): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set(as(buyer))
      .send({ listingId, quantityKg: 20 })
      .expect(201);
    const { id } = body<Order>(res);
    if (accepted) await orders.updateStatus(id, 'accepted');
    return id;
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    orders = app.get<OrderRepository>(ORDER_REPOSITORY);

    buyer = await register('buyer', 40);
    otherBuyer = await register('buyer', 41);
    farmer = await register('farmer', 42);
    driver = await register('logistics', 43);

    await request(app.getHttpServer())
      .put('/identity/me/vehicle')
      .set(as(driver))
      .send({
        vehicleType: 'small-lorry',
        registration: 'WP CAB-1234',
        capacityKg: 1500,
        operatingDistrict: district,
      })
      .expect(200);

    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    listingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:payments`, {
        farmerId: farmer.user.id,
        farmerName: farmer.user.displayName,
        cropId: 'carrot',
        quantityKg: 100,
        pricePerKg: 200,
        harvestDate: '2026-09-30',
        district,
        minOrderKg: 10,
        status: 'verified',
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const jobBoard = async (): Promise<string[]> => {
    const res = await request(app.getHttpServer())
      .get('/logistics/jobs')
      .set(as(driver))
      .expect(200);
    return body<JobSummary[]>(res).map((job) => job.id);
  };

  let orderId: string;

  it('POST pay on an order the farmer has not accepted → 409 order_not_payable', async () => {
    const requested = await placeOrder(false);
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${requested}/pay`)
      .set(as(buyer))
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('order_not_payable');
  });

  it('GET payment before paying → 404 payment_not_found', async () => {
    orderId = await placeOrder(true);
    const res = await request(app.getHttpServer())
      .get(`/payments/orders/${orderId}`)
      .set(as(buyer))
      .expect(404);
    expect(body<ApiErrorBody>(res).code).toBe('payment_not_found');
  });

  it('POST pay as another buyer → 403 not_your_order; as a farmer → 403 forbidden', async () => {
    const other = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/pay`)
      .set(as(otherBuyer))
      .expect(403);
    expect(body<ApiErrorBody>(other).code).toBe('not_your_order');

    const asFarmer = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/pay`)
      .set(as(farmer))
      .expect(403);
    expect(body<ApiErrorBody>(asFarmer).code).toBe('forbidden');
  });

  it('POST pay for an unknown order → 404 order_not_found', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments/orders/000000000000000000000000/pay')
      .set(as(buyer))
      .expect(404);
    expect(body<ApiErrorBody>(res).code).toBe('order_not_found');
  });

  it('an accepted but unpaid order is not on the driver job board', async () => {
    expect(await jobBoard()).not.toContain(orderId);
  });

  it('POST pay as the buyer → 201, 30% released, 70% held, order open', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/pay`)
      .set(as(buyer))
      .expect(201);
    const payment = body<Payment>(res);
    expect(payment).toMatchObject({
      orderId,
      buyerId: buyer.user.id,
      farmerId: farmer.user.id,
      total: 4000,
      advanceAmount: 1200,
      heldAmount: 2800,
      status: 'in_escrow',
      method: 'simulated',
    });
    expect(payment.entries.map((e) => e.kind)).toEqual([
      'deposit',
      'advance_release',
    ]);
    expect(payment).not.toHaveProperty('gatewayRef');

    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(as(buyer))
      .expect(200);
    expect(body<Order>(order).status).toBe('open');
  });

  it('a paid order appears on the driver job board', async () => {
    expect(await jobBoard()).toContain(orderId);
  });

  it('POST pay again → 409 already_paid', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/pay`)
      .set(as(buyer))
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('already_paid');
  });

  it('GET payment → 200 for buyer and farmer, 403 for another buyer', async () => {
    await request(app.getHttpServer())
      .get(`/payments/orders/${orderId}`)
      .set(as(buyer))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/payments/orders/${orderId}`)
      .set(as(farmer))
      .expect(200);
    const res = await request(app.getHttpServer())
      .get(`/payments/orders/${orderId}`)
      .set(as(otherBuyer))
      .expect(403);
    expect(body<ApiErrorBody>(res).code).toBe('not_your_order');
  });
});
