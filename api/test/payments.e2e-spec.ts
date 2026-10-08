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
import { approveFarmer } from './approve-farmer';

/**
 * The escrow story over HTTP: a buyer pays an accepted order, the order reaches the driver job
 * board, both sides can read the payment, and confirming receipt releases the balance — plus
 * every refusal in the endpoint table.
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
    farmer = await approveFarmer(
      app,
      await register('farmer', 42),
      'longenough',
    );
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

  it('POST confirm-receipt before delivery → 409 not_delivered_yet', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/confirm-receipt`)
      .set(as(buyer))
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('not_delivered_yet');
  });

  it('the driver accepts, collects and delivers the paid order', async () => {
    await request(app.getHttpServer())
      .post(`/logistics/jobs/${orderId}/accept`)
      .set(as(driver))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/logistics/jobs/${orderId}/pickup`)
      .set(as(driver))
      .send({ collectedKg: 20 })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/logistics/jobs/${orderId}/deliver`)
      .set(as(driver))
      .expect(200);
  });

  it('POST confirm-receipt as the farmer → 403 forbidden; as another buyer → 403 not_your_order', async () => {
    const asFarmer = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/confirm-receipt`)
      .set(as(farmer))
      .expect(403);
    expect(body<ApiErrorBody>(asFarmer).code).toBe('forbidden');

    const other = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/confirm-receipt`)
      .set(as(otherBuyer))
      .expect(403);
    expect(body<ApiErrorBody>(other).code).toBe('not_your_order');
  });

  it('POST confirm-receipt as the buyer → 200 released, balance paid, order stamped', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/confirm-receipt`)
      .set(as(buyer))
      .expect(200);
    const payment = body<Payment>(res);
    expect(payment).toMatchObject({ status: 'released', heldAmount: 0 });
    expect(payment.entries.map((e) => [e.kind, e.amount])).toEqual([
      ['deposit', 4000],
      ['advance_release', 1200],
      ['balance_release', 2800],
    ]);

    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(as(buyer))
      .expect(200);
    expect(body<Order>(order)).toMatchObject({ status: 'delivered' });
    expect(typeof body<Order>(order).receivedAt).toBe('string');
  });

  it('POST confirm-receipt again → 409 already_released', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payments/orders/${orderId}/confirm-receipt`)
      .set(as(buyer))
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('already_released');
  });

  describe('price renegotiation (FARM-53)', () => {
    let renegotiated: string;
    const proposalUrl = () => `/payments/orders/${renegotiated}/price-proposal`;

    it('POST price-proposal as the farmer on a paid order → 200 with the proposal', async () => {
      renegotiated = await placeOrder(true);
      await request(app.getHttpServer())
        .post(`/payments/orders/${renegotiated}/pay`)
        .set(as(buyer))
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(farmer))
        .send({ pricePerKg: 250, reason: 'Market moved' })
        .expect(200);
      expect(body<Order>(res)).toMatchObject({
        pricePerKg: 200,
        priceProposal: { proposedBy: 'farmer', pricePerKg: 250 },
      });
    });

    it('POST price-proposal with a bad price → 400 validation_error; as a driver → 403', async () => {
      const bad = await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(buyer))
        .send({ pricePerKg: 0 })
        .expect(400);
      expect(body<ApiErrorBody>(bad).code).toBe('validation_error');

      const asDriver = await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(driver))
        .send({ pricePerKg: 250 })
        .expect(403);
      expect(body<ApiErrorBody>(asDriver).code).toBe('forbidden');
    });

    it('POST price-proposal while one is open → 409 proposal_pending', async () => {
      const res = await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(buyer))
        .send({ pricePerKg: 180 })
        .expect(409);
      expect(body<ApiErrorBody>(res).code).toBe('proposal_pending');
    });

    it('POST accept as the proposer → 403 own_proposal; as another buyer → 403 not_your_order', async () => {
      const own = await request(app.getHttpServer())
        .post(`${proposalUrl()}/accept`)
        .set(as(farmer))
        .expect(403);
      expect(body<ApiErrorBody>(own).code).toBe('own_proposal');

      const other = await request(app.getHttpServer())
        .post(`${proposalUrl()}/accept`)
        .set(as(otherBuyer))
        .expect(403);
      expect(body<ApiErrorBody>(other).code).toBe('not_your_order');
    });

    it('POST accept as the buyer → 200 repriced, held balance topped up', async () => {
      const res = await request(app.getHttpServer())
        .post(`${proposalUrl()}/accept`)
        .set(as(buyer))
        .expect(200);
      const order = body<Order>(res);
      expect(order).toMatchObject({ pricePerKg: 250, total: 5000 });
      expect(order).not.toHaveProperty('priceProposal');

      const payment = await request(app.getHttpServer())
        .get(`/payments/orders/${renegotiated}`)
        .set(as(buyer))
        .expect(200);
      expect(body<Payment>(payment)).toMatchObject({
        total: 5000,
        advanceAmount: 1200,
        heldAmount: 3800,
      });
      expect(body<Payment>(payment).entries.at(-1)).toMatchObject({
        kind: 'top_up',
        amount: 1000,
      });
    });

    it('POST decline with nothing open → 409 no_open_proposal', async () => {
      const res = await request(app.getHttpServer())
        .post(`${proposalUrl()}/decline`)
        .set(as(buyer))
        .expect(409);
      expect(body<ApiErrorBody>(res).code).toBe('no_open_proposal');
    });

    it('POST price-proposal below the advance → 400 price_too_low; then propose and decline → 200', async () => {
      const low = await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(buyer))
        .send({ pricePerKg: 10 })
        .expect(400);
      expect(body<ApiErrorBody>(low).code).toBe('price_too_low');

      await request(app.getHttpServer())
        .post(proposalUrl())
        .set(as(buyer))
        .send({ pricePerKg: 220 })
        .expect(200);
      const res = await request(app.getHttpServer())
        .post(`${proposalUrl()}/decline`)
        .set(as(farmer))
        .expect(200);
      expect(body<Order>(res)).toMatchObject({ pricePerKg: 250, total: 5000 });
      expect(body<Order>(res)).not.toHaveProperty('priceProposal');
    });

    it('POST price-proposal on a delivered order → 409 proposal_not_allowed', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payments/orders/${orderId}/price-proposal`)
        .set(as(buyer))
        .send({ pricePerKg: 150 })
        .expect(409);
      expect(body<ApiErrorBody>(res).code).toBe('proposal_not_allowed');
    });
  });
});
