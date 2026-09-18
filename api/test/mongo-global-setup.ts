import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Jest `globalSetup` for the e2e suite: a real MongoDB without asking anyone to install one.
 *
 * Runs once, in the parent process, before any test file is loaded. That timing matters:
 * `ConfigModule.forRoot` validates the environment the moment `app.module.ts` is imported, so
 * the keys must already be set — `beforeAll` inside a test file is too late.
 *
 * `mongodb-memory-server` downloads a MongoDB binary on first run (~100 MB, cached under
 * node_modules/.cache) and starts it on a free port. On a slow or blocked network set
 * `E2E_DATABASE_URI` to an existing database instead and the download is skipped — a spare
 * Atlas database works, but the tests write to it.
 */
declare global {
  var __FARM_POOL_MONGO__: MongoMemoryServer | undefined;
}

export default async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';

  if (process.env.E2E_DATABASE_URI) {
    process.env.DATABASE_URI = process.env.E2E_DATABASE_URI;
    return;
  }

  const server = await MongoMemoryServer.create();
  globalThis.__FARM_POOL_MONGO__ = server;
  process.env.DATABASE_URI = server.getUri('farm-pool-test');
}
