import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env';

/**
 * Loads `.env`, validates it with `envSchema`, and makes the typed result injectable
 * everywhere via `ConfigService<Env, true>` — `isGlobal` means no other module has to import
 * this one.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
