import { NestFactory } from '@nestjs/core';
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from '../catalog/domain/repositories/listing.repository';
import { AppModule } from '../app.module';
import {
  COOPERATIVE_REPOSITORY,
  type CooperativeRepository,
} from '../coordination/domain/repositories/cooperative.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../identity/application/ports/password-hasher';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../identity/domain/repositories/user.repository';

/**
 * TEMPORARY dev seed so the coordinator dashboard has something to show before a real
 * cooperative-creation flow exists (`.plans/coordination/OPEN.md`). Run with
 * `npm run seed:cooperatives -w api`.
 *
 * One of the four farmer members (`+94771000001`) is the same seed farmer `seed-listings.ts`
 * creates, so running both seeds shows that farmer's listings on the dashboard. One member
 * (`+94771000006`) is seeded `pending_review` and one listing is seeded `pending_approval`, so
 * "Needs you today" has real, non-empty rows to show rather than only ever an empty state.
 *
 * Idempotent: each user is created once (by phone), the cooperative is upserted by its
 * `seedKey`, and the pending listing is upserted by its own `seedKey` — re-running updates
 * rather than duplicates. Refuses to run in production.
 *
 *   SEED_PASSWORD   password for every seeded account (default `longenough`, dev only)
 *
 * Delete this file once a real cooperative-creation flow ships.
 */
const SEED_COORDINATOR = {
  displayName: 'Priya Jayasinghe',
  phone: '+94771000002',
  role: 'coordinator' as const,
};

const SEED_FARMERS = [
  // Same phone seed-listings.ts uses — shared member so the dashboard shows real listings
  // when both seeds have been run.
  { displayName: 'Nimal Perera', phone: '+94771000001' },
  { displayName: 'Kamala Silva', phone: '+94771000003' },
  { displayName: 'Sunil Bandara', phone: '+94771000004' },
] as const;

const SEED_PENDING_FARMER = {
  displayName: 'Ranjith Fernando',
  phone: '+94771000006',
} as const;

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
    const cooperatives = app.get<CooperativeRepository>(COOPERATIVE_REPOSITORY);
    const listings = app.get<ListingRepository>(LISTING_REPOSITORY);
    const password = process.env.SEED_PASSWORD ?? 'longenough';

    const coordinator = await findOrCreate(
      users,
      hasher,
      password,
      SEED_COORDINATOR,
    );
    console.log(`Coordinator ${SEED_COORDINATOR.phone} ready`);

    const memberIds: string[] = [];
    for (const farmer of SEED_FARMERS) {
      const user = await findOrCreate(users, hasher, password, {
        ...farmer,
        role: 'farmer' as const,
      });
      memberIds.push(user.id);
    }

    const pendingFarmer = await findOrCreate(users, hasher, password, {
      ...SEED_PENDING_FARMER,
      role: 'farmer' as const,
      status: 'pending_review' as const,
    });
    memberIds.push(pendingFarmer.id);
    console.log(
      `${SEED_FARMERS.length} verified + 1 pending member farmer ready`,
    );

    await cooperatives.upsertBySeedKey('seed:kurunegala-cooperative', {
      coordinatorId: coordinator.id,
      name: 'Kurunegala Vegetable Growers',
      district: 'Kurunegala',
      memberFarmerIds: memberIds,
    });
    console.log(
      `Upserted cooperative for coordinator ${SEED_COORDINATOR.phone} (password: ${password})`,
    );

    const nimal = await users.findByPhone('+94771000001');
    if (nimal) {
      await listings.upsertBySeedKey('seed:coop-pending-listing', {
        farmerId: nimal.id,
        farmerName: nimal.displayName,
        cropId: 'carrot',
        quantityKg: 90,
        pricePerKg: 250,
        harvestDate: '2026-09-28',
        district: 'Kurunegala',
        minOrderKg: 10,
        status: 'pending_approval',
      });
      console.log('Upserted one pending_approval listing for Nimal Perera');
    }
  } finally {
    await app.close();
  }
}

async function findOrCreate(
  users: UserRepository,
  hasher: PasswordHasher,
  password: string,
  account: {
    displayName: string;
    phone: string;
    role: 'coordinator' | 'farmer';
    status?: 'active' | 'pending_review' | 'suspended';
  },
) {
  const existing = await users.findByPhone(account.phone);
  if (existing) return existing;
  return users.create({
    ...account,
    passwordHash: await hasher.hash(password),
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
