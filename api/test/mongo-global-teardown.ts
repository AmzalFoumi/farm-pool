/** Jest `globalTeardown`: stop the in-memory MongoDB started by `mongo-global-setup.ts`. */
export default async function teardown(): Promise<void> {
  await globalThis.__FARM_POOL_MONGO__?.stop();
}
