import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SavedLocation } from '@farm-pool/shared';
import type { DriverProfile, NewUser, User } from '../../domain/entities/user';
import {
  DuplicatePhoneError,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  DriverProfileDocument,
  USER_MODEL,
  UserDocument,
  type UserHydrated,
} from './user.schema';

/** MongoDB's error code for "unique index violated". */
const DUPLICATE_KEY = 11000;

@Injectable()
export class MongooseUserRepository implements UserRepository {
  constructor(
    @InjectModel(USER_MODEL) private readonly users: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<User | null> {
    // A malformed id is "not found", not a 500 — Mongoose would otherwise throw a CastError.
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users.findById(id).exec();
    return doc ? toUser(doc) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const doc = await this.users.findOne({ phone }).exec();
    return doc ? toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.users.findOne({ email: email.toLowerCase() }).exec();
    return doc ? toUser(doc) : null;
  }

  async create(user: NewUser): Promise<User> {
    try {
      // Spread only the keys that are set, so an absent email stays absent (sparse index).
      const doc = await this.users.create({
        displayName: user.displayName,
        phone: user.phone,
        passwordHash: user.passwordHash,
        role: user.role,
        ...(user.email !== undefined ? { email: user.email } : {}),
        ...(user.status !== undefined ? { status: user.status } : {}),
      });
      return toUser(doc);
    } catch (error) {
      if (isDuplicateKey(error)) throw new DuplicatePhoneError(user.phone);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    const docs = await this.users.find().sort({ createdAt: 1 }).exec();
    return docs.map(toUser);
  }

  async saveLocations(
    id: string,
    locations: SavedLocation[],
  ): Promise<User | null> {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users
      .findByIdAndUpdate(
        id,
        { savedLocations: locations },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toUser(doc) : null;
  }

  async saveDriverProfile(
    id: string,
    driver: DriverProfile,
  ): Promise<User | null> {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users
      .findByIdAndUpdate(id, { $set: { driver } }, { new: true })
      .exec();
    return doc ? toUser(doc) : null;
  }

  async saveFarmerDistrict(id: string, district: string): Promise<User | null> {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users
      .findByIdAndUpdate(id, { $set: { district } }, { new: true })
      .exec();
    return doc ? toUser(doc) : null;
  }

  async activate(id: string): Promise<User | null> {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users
      .findOneAndUpdate(
        { _id: id, status: 'pending_review' },
        { $set: { status: 'active' } },
        { new: true },
      )
      .exec();
    return doc ? toUser(doc) : null;
  }

  async reject(id: string, reason: string): Promise<User | null> {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null;
    const doc = await this.users
      .findOneAndUpdate(
        { _id: id, status: 'pending_review' },
        { $set: { status: 'suspended', rejectionReason: reason } },
        { new: true },
      )
      .exec();
    return doc ? toUser(doc) : null;
  }
}

function toUser(doc: UserHydrated): User {
  return {
    id: doc._id.toHexString(),
    displayName: doc.displayName,
    phone: doc.phone,
    ...(typeof doc.email === 'string' ? { email: doc.email } : {}),
    passwordHash: doc.passwordHash,
    role: doc.role,
    status: doc.status,
    ...(doc.driver ? { driver: toDriverProfile(doc.driver) } : {}),
    ...(doc.savedLocations?.length
      ? {
          savedLocations: doc.savedLocations.map((l) => ({
            id: l.id,
            label: l.label,
            point: { latitude: l.point.latitude, longitude: l.point.longitude },
          })),
        }
      : {}),
    ...(typeof doc.district === 'string' ? { district: doc.district } : {}),
    ...(typeof doc.rejectionReason === 'string'
      ? { rejectionReason: doc.rejectionReason }
      : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDriverProfile(driver: DriverProfileDocument): DriverProfile {
  return {
    vehicleType: driver.vehicleType,
    registration: driver.registration,
    capacityKg: driver.capacityKg,
    operatingDistrict: driver.operatingDistrict,
    verification: driver.verification,
    updatedAt: driver.updatedAt,
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === DUPLICATE_KEY
  );
}
