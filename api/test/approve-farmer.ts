import type { AuthResponse } from '@farm-pool/shared';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './../src/identity/domain/repositories/user.repository';

/**
 * A farmer registers `pending_review` (FARM-44) and `RolesGuard` refuses every role-restricted
 * route until a coordinator approves them. A spec about orders or payments is not about that
 * wait, so this moves the account to `active` through the repository — the state the approve
 * endpoint leaves it in — and logs in again.
 *
 * The second login is the point: `status` is baked into the token, so the one `register`
 * returned still says `pending_review` however the account reads in the database.
 */
export async function approveFarmer(
  app: INestApplication<App>,
  farmer: AuthResponse,
  password: string,
): Promise<AuthResponse> {
  const users = app.get<UserRepository>(USER_REPOSITORY);
  await users.activate(farmer.user.id);

  const res = await request(app.getHttpServer())
    .post('/identity/login')
    .send({ identifier: farmer.user.phone, password })
    .expect(200);
  return res.body as AuthResponse;
}
