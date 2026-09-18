import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The app is a separate origin (Expo dev server, or a phone), so the browser build needs CORS.
  app.enableCors();

  const config = app.get(ConfigService<Env, true>);
  const host = config.get('HOST', { infer: true });
  const port = config.get('PORT', { infer: true });
  await app.listen(port, host);
  Logger.log(`Listening on http://${host}:${port}`, 'Bootstrap');
}
void bootstrap();
