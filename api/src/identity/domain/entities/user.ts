import type {
  AccountStatus,
  DriverProfile as DriverProfileDto,
  DriverVehicle,
  DriverVerification,
  PublicUser,
  Role,
} from '@farm-pool/shared';

/**
 * An account, as the domain sees it. One record per person, whatever their role.
 *
 * `passwordHash` is the only secret here and never leaves the api: `toPublicUser` is the single
 * way a user is turned into a response, and it drops the hash. `email` is reserved for the later
 * email credential (`.plans/DECISIONS.md`) and is absent, never `null`, when unset — the unique
 * index on it is sparse and a `null` would count as a value.
 */
export interface User {
  id: string;
  displayName: string;
  /** E.164, e.g. `+94771234567`. Normalised before it gets here; see `phoneSchema` in shared. */
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  /** A delivery partner's vehicle (FARM-45). Absent for other roles and before it is submitted. */
  driver?: DriverProfile;
  createdAt: Date;
  updatedAt: Date;
}

/** A driver's vehicle as the domain holds it: the submission, its check, and when it changed. */
export interface DriverProfile extends DriverVehicle {
  verification: DriverVerification;
  updatedAt: Date;
}

/**
 * The one rule about a resubmitted vehicle: a different vehicle is a different thing to check.
 * Changing the plate or the vehicle type sends the driver back to `pending`, so a `verified`
 * badge can never end up on a vehicle nobody looked at. Capacity and district are the driver's
 * own working details and keep whatever state the vehicle already had.
 */
export function applyVehicle(
  current: DriverProfile | undefined,
  vehicle: DriverVehicle,
  now: Date,
): DriverProfile {
  const sameVehicle =
    current !== undefined &&
    current.registration === vehicle.registration &&
    current.vehicleType === vehicle.vehicleType;

  return {
    ...vehicle,
    verification: sameVehicle ? current.verification : 'pending',
    updatedAt: now,
  };
}

/** What is needed to create a user. The store assigns `id`, `status` and the timestamps. */
export type NewUser = Pick<
  User,
  'displayName' | 'phone' | 'passwordHash' | 'role'
> &
  Partial<Pick<User, 'email' | 'status'>>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    phone: user.phone,
    ...(user.email !== undefined ? { email: user.email } : {}),
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    ...(user.driver !== undefined
      ? { driver: toDriverProfileDto(user.driver) }
      : {}),
  };
}

function toDriverProfileDto(driver: DriverProfile): DriverProfileDto {
  return {
    vehicleType: driver.vehicleType,
    registration: driver.registration,
    capacityKg: driver.capacityKg,
    operatingDistrict: driver.operatingDistrict,
    verification: driver.verification,
    updatedAt: driver.updatedAt.toISOString(),
  };
}
