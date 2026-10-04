import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../identity/application/ports/password-hasher';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../identity/domain/repositories/user.repository';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '../orders/domain/repositories/order.repository';

/**
 * TEMPORARY dev seed so the payment screens can be reached before farmer acceptance (FARM-46)
 * exists: nothing in the app can move an order to `accepted` yet, and `accepted` is the only
 * state an order can be paid from. Run with `npm run seed:demo-order -w api`.
 *
 * Creates the seed farmer and a seed buyer once (by phone), one verified listing (by `seedKey`),
 * and one `accepted` order between them — unless the buyer already has one waiting to be paid,
 * so re-running does not pile them up. Refuses to run in production.
 *
 *   SEED_PASSWORD   both seed accounts' password (default `longenough`, dev only)
 *
 * Delete this file when FARM-46 ships.
 */
const SEED_FARMER = {
  displayName: 'Nimal Perera',
  phone: '+94771000001',
  role: 'farmer' as const,
};

const SEED_BUYER = {
  displayName: 'Priya Fernando',
  phone: '+94771000002',
  role: 'buyer' as const,
};

const QUANTITY_KG = 100;
const PRICE_PER_KG = 180;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const hasher = app.get<PasswordHasher>(PASSWORD_HASHER);
    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const orders = app.get<OrderRepository>(ORDER_REPOSITORY);
    const password = process.env.SEED_PASSWORD ?? 'longenough';

    const account = async (seed: typeof SEED_FARMER | typeof SEED_BUYER) => {
      const existing = await users.findByPhone(seed.phone);
      if (existing) return existing;
      console.log(`Created seed ${seed.role} ${seed.phone}`);
      return users.create({
        ...seed,
        passwordHash: await hasher.hash(password),
      });
    };
    const farmer = await account(SEED_FARMER);
    const buyer = await account(SEED_BUYER);

    const listing = await listings.upsertBySeedKey('seed:demo-order-tomato', {
      farmerId: farmer.id,
      farmerName: farmer.displayName,
      cropId: 'tomato',
      quantityKg: 250,
      pricePerKg: PRICE_PER_KG,
      harvestDate: '2026-10-06',
      district: 'Kurunegala',
      minOrderKg: 20,
      status: 'verified',
    });

    const waiting = (await orders.findByBuyer(buyer.id)).find(
      (order) => order.listingId === listing.id && order.status === 'accepted',
    );
    if (waiting) {
      console.log(`Order ${waiting.id} is already accepted and unpaid`);
    } else {
      const order = await orders.create({
        buyerId: buyer.id,
        farmerId: farmer.id,
        farmerName: farmer.displayName,
        listingId: listing.id,
        cropId: listing.cropId,
        quantityKg: QUANTITY_KG,
        pricePerKg: PRICE_PER_KG,
        total: QUANTITY_KG * PRICE_PER_KG,
        status: 'accepted',
      });
      console.log(`Created accepted order ${order.id}`);
    }
    console.log(
      `Log in as the buyer (${SEED_BUYER.phone}) and open My orders to pay.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
