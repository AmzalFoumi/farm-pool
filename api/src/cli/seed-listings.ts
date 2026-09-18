import type { CropId } from '@farm-pool/shared';
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

/**
 * TEMPORARY dev seed so the buyer screens have something to show before farmer listing
 * creation (FARM-21) exists. Run with `npm run seed:listings -w api`.
 *
 * Idempotent: the farmer is created once (by phone) and every listing is upserted by its
 * `seedKey`, so re-running updates rather than duplicates. Refuses to run in production.
 *
 *   SEED_PASSWORD   the seed farmer's password (default `longenough`, dev only)
 *
 * Delete this file when FARM-21 ships.
 */
const SEED_FARMER = {
  displayName: 'Nimal Perera',
  phone: '+94771000001',
  role: 'farmer' as const,
};

type SeedRow = {
  key: string;
  cropId: CropId;
  quantityKg: number;
  pricePerKg: number;
  harvestDate: string;
  district: string;
  minOrderKg: number;
};

const ROWS: SeedRow[] = [
  {
    key: 'tomato-kurunegala',
    cropId: 'tomato',
    quantityKg: 250,
    pricePerKg: 180,
    harvestDate: '2026-09-22',
    district: 'Kurunegala',
    minOrderKg: 20,
  },
  {
    key: 'chilli-dambulla',
    cropId: 'green-chilli',
    quantityKg: 80,
    pricePerKg: 650,
    harvestDate: '2026-09-21',
    district: 'Matale',
    minOrderKg: 5,
  },
  {
    key: 'brinjal-kurunegala',
    cropId: 'brinjal',
    quantityKg: 120,
    pricePerKg: 140,
    harvestDate: '2026-09-23',
    district: 'Kurunegala',
    minOrderKg: 10,
  },
  {
    key: 'mango-anuradhapura',
    cropId: 'mango',
    quantityKg: 300,
    pricePerKg: 220,
    harvestDate: '2026-09-25',
    district: 'Anuradhapura',
    minOrderKg: 25,
  },
  {
    key: 'pumpkin-matale',
    cropId: 'pumpkin',
    quantityKg: 500,
    pricePerKg: 90,
    harvestDate: '2026-09-20',
    district: 'Matale',
    minOrderKg: 50,
  },
  {
    key: 'carrot-nuwaraeliya',
    cropId: 'carrot',
    quantityKg: 200,
    pricePerKg: 260,
    harvestDate: '2026-09-24',
    district: 'Nuwara Eliya',
    minOrderKg: 10,
  },
  {
    key: 'banana-kurunegala',
    cropId: 'banana',
    quantityKg: 150,
    pricePerKg: 120,
    harvestDate: '2026-09-22',
    district: 'Kurunegala',
    minOrderKg: 10,
  },
  {
    key: 'onion-dambulla',
    cropId: 'onion',
    quantityKg: 1000,
    pricePerKg: 210,
    harvestDate: '2026-09-26',
    district: 'Matale',
    minOrderKg: 100,
  },
];

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

    let farmer = await users.findByPhone(SEED_FARMER.phone);
    if (!farmer) {
      const password = process.env.SEED_PASSWORD ?? 'longenough';
      farmer = await users.create({
        ...SEED_FARMER,
        passwordHash: await hasher.hash(password),
      });
      console.log(`Created seed farmer ${SEED_FARMER.phone}`);
    } else {
      console.log(`Seed farmer ${SEED_FARMER.phone} already exists`);
    }

    for (const row of ROWS) {
      const { key, ...fields } = row;
      await listings.upsertBySeedKey(`seed:${key}`, {
        ...fields,
        farmerId: farmer.id,
        farmerName: farmer.displayName,
        status: 'verified',
      });
    }
    console.log(`Upserted ${ROWS.length} verified listings`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
