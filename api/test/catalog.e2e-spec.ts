import type {
  ApiErrorBody,
  AuthResponse,
  Listing,
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

/**
 * The catalog over HTTP: seeded listings are browsable and filterable by a signed-in user, a
 * non-verified listing is invisible, and a buyer can post, list and close a wanted request while
 * another buyer cannot close it.
 */
describe('catalog (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = Number(Date.now().toString().slice(-8));
  const phoneOf = (n: number) =>
    `07${((suffix + n) % 1e8).toString().padStart(8, '0')}`;

  let buyerToken: string;
  let otherBuyerToken: string;
  let verifiedId: string;
  let draftId: string;

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

    buyerToken = (await register('buyer', 10)).token;
    otherBuyerToken = (await register('buyer', 11)).token;

    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const base = {
      farmerId: 'seed-farmer',
      farmerName: 'Seed Farmer',
      quantityKg: 100,
      pricePerKg: 100,
      harvestDate: '2026-09-30',
      minOrderKg: 10,
    };
    verifiedId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:verified`, {
        ...base,
        cropId: 'tomato',
        district: `E2E-${suffix}`,
        status: 'verified',
      })
    ).id;
    draftId = (
      await listings.upsertBySeedKey(`e2e:${suffix}:draft`, {
        ...base,
        cropId: 'mango',
        district: `E2E-${suffix}`,
        status: 'draft',
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /catalog/listings without a token → 401', async () => {
    await request(app.getHttpServer()).get('/catalog/listings').expect(401);
  });

  it('GET /catalog/listings?district= → only the verified listing', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/listings')
      .query({ district: `e2e-${suffix}` })
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    const listings = body<Listing[]>(res);
    expect(listings.map((l) => l.id)).toEqual([verifiedId]);
    expect(listings[0]).toMatchObject({ cropId: 'tomato', status: 'verified' });
  });

  it('GET /catalog/listings?crop=bad → 400 validation_error', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/listings')
      .query({ crop: 'durian' })
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(400);
    expect(body<ApiErrorBody>(res).code).toBe('validation_error');
  });

  it('GET /catalog/listings/:id → 200 for verified, 404 for draft and unknown', async () => {
    await request(app.getHttpServer())
      .get(`/catalog/listings/${verifiedId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    const draft = await request(app.getHttpServer())
      .get(`/catalog/listings/${draftId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(404);
    expect(body<ApiErrorBody>(draft).code).toBe('listing_not_found');

    await request(app.getHttpServer())
      .get('/catalog/listings/not-an-id')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(404);
  });

  let wantedId: string;

  it('POST /catalog/wanted as a buyer → 201 open request', async () => {
    const res = await request(app.getHttpServer())
      .post('/catalog/wanted')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        cropId: 'onion',
        quantityKg: 200,
        neededBy: '2026-10-01',
        district: 'Dambulla',
      })
      .expect(201);
    const wanted = body<WantedListing>(res);
    expect(wanted).toMatchObject({ cropId: 'onion', status: 'open' });
    wantedId = wanted.id;
  });

  it('POST /catalog/wanted with a bad date → 400 with the path', async () => {
    const res = await request(app.getHttpServer())
      .post('/catalog/wanted')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        cropId: 'onion',
        quantityKg: 200,
        neededBy: '1/10/2026',
        district: 'Dambulla',
      })
      .expect(400);
    const paths = (body<ApiErrorBody>(res).issues ?? []).map((i) => i.path);
    expect(paths).toContain('neededBy');
  });

  it('GET /catalog/wanted?mine=true → only my requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/wanted')
      .query({ mine: 'true' })
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(body<WantedListing[]>(res).map((w) => w.id)).toEqual([wantedId]);

    const other = await request(app.getHttpServer())
      .get('/catalog/wanted')
      .query({ mine: 'true' })
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(200);
    expect(body<WantedListing[]>(other)).toEqual([]);
  });

  it('POST /catalog/wanted/:id/close by another buyer → 403, by the owner → 200, again → 409', async () => {
    const forbidden = await request(app.getHttpServer())
      .post(`/catalog/wanted/${wantedId}/close`)
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(403);
    expect(body<ApiErrorBody>(forbidden).code).toBe('not_your_request');

    const closed = await request(app.getHttpServer())
      .post(`/catalog/wanted/${wantedId}/close`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(body<WantedListing>(closed).status).toBe('closed');

    const again = await request(app.getHttpServer())
      .post(`/catalog/wanted/${wantedId}/close`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(409);
    expect(body<ApiErrorBody>(again).code).toBe('wanted_already_closed');
  });

  it('POST /catalog/wanted as a farmer → 403 forbidden', async () => {
    const farmer = await register('farmer', 12);
    const res = await request(app.getHttpServer())
      .post('/catalog/wanted')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        cropId: 'onion',
        quantityKg: 200,
        neededBy: '2026-10-01',
        district: 'Dambulla',
      })
      .expect(403);
    expect(body<ApiErrorBody>(res).code).toBe('forbidden');
  });
});
