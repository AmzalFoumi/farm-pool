import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NewUser, User } from '../../domain/entities/user';
import {
  DuplicatePhoneError,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import { USER_MODEL, UserDocument, type UserHydrated } from './user.schema';

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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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
