import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { Env } from '../config/env';

/**
 * The one MongoDB connection, opened from the validated `DATABASE_URI`.
 *
 * Domains never import this. They declare their own collections with
 * `MongooseModule.forFeature([...])` inside their own module, and those models attach to the
 * connection opened here. Keeping the connection in one place means swapping Atlas for a local
 * server, or an in-memory server in tests, is an environment change and not a code change.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('DATABASE_URI', { infer: true }),
      }),
    }),
  ],
})
export class DatabaseModule {}
