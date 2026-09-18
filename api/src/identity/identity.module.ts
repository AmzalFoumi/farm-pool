import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import type { Env } from '../config/env';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './application/ports/password-hasher';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from './application/ports/token-signer';
import { GetMe } from './application/services/get-me';
import { ListUsers } from './application/services/list-users';
import { LoginUser } from './application/services/login-user';
import { RegisterUser } from './application/services/register-user';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './domain/repositories/user.repository';
import { IdentityController } from './identity.controller';
import { IdentityErrorFilter } from './identity-error.filter';
import { MongooseUserRepository } from './infrastructure/persistence/mongoose-user.repository';
import {
  USER_MODEL,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { JsonwebtokenTokenSigner } from './infrastructure/security/jsonwebtoken-token-signer';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';

/**
 * The identity domain, wired.
 *
 * The three ports (`USER_REPOSITORY`, `PASSWORD_HASHER`, `TOKEN_SIGNER`) are bound to their
 * adapters here, and the use-cases are built with `useFactory` so they stay plain classes with
 * no Nest decorators — the same `new RegisterUser(repo, hasher, signer)` an Expo API route
 * would write.
 *
 * The guards are registered as `APP_GUARD`, which makes them global: every route in every
 * module needs a token unless it says `@Public()`. Order matters — `JwtAuthGuard` first (it
 * sets `request.user`), `RolesGuard` second (it reads it).
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: USER_MODEL, schema: UserSchema }]),
  ],
  controllers: [IdentityController],
  providers: [
    // Ports → adapters
    { provide: USER_REPOSITORY, useClass: MongooseUserRepository },
    { provide: PASSWORD_HASHER, useFactory: () => new ScryptPasswordHasher() },
    {
      provide: TOKEN_SIGNER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new JsonwebtokenTokenSigner({
          secret: config.get('JWT_SECRET', { infer: true }),
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        }),
    },
    // Use-cases
    {
      provide: RegisterUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenSigner,
      ) => new RegisterUser(users, hasher, tokens),
    },
    {
      provide: LoginUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenSigner,
      ) => new LoginUser(users, hasher, tokens),
    },
    {
      provide: GetMe,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => new GetMe(users),
    },
    {
      provide: ListUsers,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => new ListUsers(users),
    },
    // Global guards and the error mapping
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: IdentityErrorFilter },
  ],
  exports: [USER_REPOSITORY, TOKEN_SIGNER],
})
export class IdentityModule {}
