import type { ApiErrorBody, AuthResponse, Listing } from '@farm-pool/shared';
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
  COOPERATIVE_REPOSITORY,
  type CooperativeRepository,
} from './../src/coordination/domain/repositories/cooperative.repository';
import { approveFarmer } from './approve-farmer';

/** A coordinator approving a listing over HTTP (FARM-43), plus who may not. */
describe('approve listing (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = Number(Date.now().toString().slice(-8));
  const phoneOf = (n: number) =>
    `07${((suffix + 90000000 + n) % 1e8).toString().padStart(8, '0')}`;
  const body = <T>(res: request.Response): T => res.body as T;

  let coordinator: AuthResponse;
  let farmer: AuthResponse;
  let buyer: AuthResponse;
  let listingId: string;
  let outsideListingId: string;

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

    coordinator = await register('coordinator', 60);
    buyer = await register('buyer', 61);
    farmer = await approveFarmer(
      app,
      await register('farmer', 62),
      'longenough',
    );

    const cooperatives = app.get<CooperativeRepository>(COOPERATIVE_REPOSITORY);
    await cooperatives.upsertBySeedKey(`e2e:${suffix}:approve-listing`, {
      coordinatorId: coordinator.user.id,
      name: `E2E Cooperative ${suffix}`,
      district: `E2E-${suffix}`,
      memberFarmerIds: [farmer.user.id],
    });

    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const base = {
      farmerName: farmer.user.displayName,
      cropId: 'carrot' as const,
      quantityKg: 100,
      pricePerKg: 200,
      harvestDate: '2026-11-30',
      district: `E2E-${suffix}`,
      minOrderKg: 10,
      status: 'pending_approval' as const,
    };
    listingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:approve-listing:in`, {
        ...base,
        farmerId: farmer.user.id,
      })
    ).id;
    outsideListingId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:approve-listing:out`, {
        ...base,
        farmerId: '000000000000000000000001',
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const approve = (token: string, id: string) =>
    request(app.getHttpServer())
      .put(`/coordination/listings/${id}/approve`)
      .set('Authorization', `Bearer ${token}`);

  it('refuses a farmer and a buyer with 403 forbidden', async () => {
    for (const who of [farmer, buyer]) {
      const res = await approve(who.token, listingId).expect(403);
      expect(body<ApiErrorBody>(res).code).toBe('forbidden');
    }
  });

  it('answers 404 for a listing outside the cooperative and for a malformed id', async () => {
    const outside = await approve(coordinator.token, outsideListingId).expect(
      404,
    );
    expect(body<ApiErrorBody>(outside).code).toBe('listing_not_found');

    const malformed = await approve(coordinator.token, 'not-an-id').expect(404);
    expect(body<ApiErrorBody>(malformed).code).toBe('listing_not_found');
  });

  it('approves once: 200 verified, then 409 listing_not_pending', async () => {
    const res = await approve(coordinator.token, listingId).expect(200);
    expect(body<Listing>(res)).toMatchObject({
      id: listingId,
      status: 'verified',
    });

    const again = await approve(coordinator.token, listingId).expect(409);
    expect(body<ApiErrorBody>(again).code).toBe('listing_not_pending');
  });

  it('makes the listing visible to a buyer', async () => {
    await request(app.getHttpServer())
      .get(`/catalog/listings/${listingId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
  });
});
