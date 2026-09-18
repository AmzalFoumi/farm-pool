import type { ApiErrorBody, AuthResponse, PublicUser } from '@farm-pool/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * The whole auth story over HTTP against the in-memory MongoDB from `mongo-global-setup.ts`:
 * register → login → me → the coordinator-only route → the refusals.
 */
describe('identity (e2e)', () => {
  let app: INestApplication<App>;
  // Unique per run; the coordinator gets the next number so the two never collide.
  const suffix = Number(Date.now().toString().slice(-8));
  const phone = `07${suffix.toString().padStart(8, '0')}`;
  const coordinatorPhone = `07${((suffix + 1) % 1e8).toString().padStart(8, '0')}`;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const body = <T>(res: request.Response): T => res.body as T;

  let farmerToken: string;
  let farmerId: string;

  it('POST /identity/register → 201 with a token and the public user', async () => {
    const res = await request(app.getHttpServer())
      .post('/identity/register')
      .send({
        displayName: 'Nimal',
        phone,
        password: 'longenough',
        role: 'farmer',
      })
      .expect(201);

    const auth = body<AuthResponse>(res);
    expect(typeof auth.token).toBe('string');
    expect(auth.user).toMatchObject({ role: 'farmer', status: 'active' });
    expect(auth.user.phone).toMatch(/^\+94\d{9}$/);
    expect(auth.user).not.toHaveProperty('passwordHash');
    farmerToken = auth.token;
    farmerId = auth.user.id;
  });

  it('POST /identity/register again with the same phone → 409 phone_taken', async () => {
    const res = await request(app.getHttpServer())
      .post('/identity/register')
      .send({
        displayName: 'Other',
        phone,
        password: 'longenough',
        role: 'buyer',
      })
      .expect(409);
    expect(body<ApiErrorBody>(res).code).toBe('phone_taken');
  });

  it('POST /identity/register with a bad body → 400 validation_error with field paths', async () => {
    const res = await request(app.getHttpServer())
      .post('/identity/register')
      .send({ displayName: 'N', phone: '12', password: 'short', role: 'admin' })
      .expect(400);
    const error = body<ApiErrorBody>(res);
    expect(error.code).toBe('validation_error');
    const paths = (error.issues ?? []).map((i) => i.path);
    expect(paths).toEqual(
      expect.arrayContaining(['displayName', 'phone', 'password', 'role']),
    );
  });

  it('POST /identity/login → 200 with a fresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/identity/login')
      .send({ identifier: phone, password: 'longenough' })
      .expect(200);
    const auth = body<AuthResponse>(res);
    expect(typeof auth.token).toBe('string');
    expect(auth.user.id).toBe(farmerId);
  });

  it('POST /identity/login with a wrong password → 401 invalid_credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/identity/login')
      .send({ identifier: phone, password: 'wrongpassword' })
      .expect(401);
    expect(body<ApiErrorBody>(res).code).toBe('invalid_credentials');
  });

  it('GET /identity/me with the token → 200 the same user', async () => {
    const res = await request(app.getHttpServer())
      .get('/identity/me')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);
    const me = body<PublicUser>(res);
    expect(me.id).toBe(farmerId);
    expect(me).not.toHaveProperty('passwordHash');
  });

  it('GET /identity/me without a token → 401 unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get('/identity/me')
      .expect(401);
    expect(body<ApiErrorBody>(res).code).toBe('unauthorized');
  });

  it('GET /identity/me with a tampered token → 401 unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get('/identity/me')
      .set('Authorization', `Bearer ${farmerToken}x`)
      .expect(401);
    expect(body<ApiErrorBody>(res).code).toBe('unauthorized');
  });

  it('GET /identity/users as a farmer → 403 forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get('/identity/users')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(403);
    expect(body<ApiErrorBody>(res).code).toBe('forbidden');
  });

  it('GET /identity/users as a coordinator → 200 with every account', async () => {
    const reg = await request(app.getHttpServer())
      .post('/identity/register')
      .send({
        displayName: 'Area Coordinator',
        phone: coordinatorPhone,
        password: 'longenough',
        role: 'coordinator',
      })
      .expect(201);
    const coordinator = body<AuthResponse>(reg);

    const res = await request(app.getHttpServer())
      .get('/identity/users')
      .set('Authorization', `Bearer ${coordinator.token}`)
      .expect(200);

    const users = body<PublicUser[]>(res);
    const ids = users.map((u) => u.id);
    expect(ids).toContain(farmerId);
    expect(ids).toContain(coordinator.user.id);
    for (const u of users) {
      expect(u).not.toHaveProperty('passwordHash');
    }
  });

  it('GET / (health) stays public', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });
});
