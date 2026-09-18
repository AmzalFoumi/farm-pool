import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { accountStatusSchema, roleSchema } from '@farm-pool/shared';
import type { AccountStatus, Role } from '@farm-pool/shared';
import type { HydratedDocument } from 'mongoose';

/**
 * How a user is laid out in the `users` collection. This is the storage shape only; the domain
 * works with `User` from `domain/entities/user.ts`, and the repository maps between the two.
 *
 * The role and status enums are read from the shared zod schemas so the database can never
 * accept a value the app and the api do not know about.
 */
@Schema({ collection: 'users', timestamps: true })
export class UserDocument {
  @Prop({ required: true, trim: true })
  displayName: string;

  /** E.164. Unique: one account per phone number. */
  @Prop({ required: true, unique: true })
  phone: string;

  /**
   * Reserved for the later email credential. `sparse` means only documents that *have* an email
   * take part in the unique index, so many users with no email do not collide. That only holds
   * while the field is left out entirely — never write `null` here.
   */
  @Prop({
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, enum: roleSchema.options })
  role: Role;

  @Prop({
    type: String,
    required: true,
    enum: accountStatusSchema.options,
    default: 'active',
  })
  status: AccountStatus;

  // Written by `timestamps: true`; declared so the mapper can read them with types.
  createdAt: Date;
  updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;

export const UserSchema = SchemaFactory.createForClass(UserDocument);

/** Mongoose model name; the token `@InjectModel(USER_MODEL)` resolves to. */
export const USER_MODEL = UserDocument.name;
