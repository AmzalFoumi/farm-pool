import type { DriverVehicle, PublicUser } from '@farm-pool/shared';
import { applyVehicle, toPublicUser } from '../../domain/entities/user';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { IdentityError } from '../errors';

/**
 * A delivery partner submits or edits their vehicle (FARM-45). Writes only to the caller's own
 * account — the id comes from the token, never the body — so there is no ownership check to make.
 * Who may call it is the permission matrix's job (`driver:update-vehicle`, logistics only).
 *
 * The vehicle is already validated and the plate normalised (`driverVehicleSchema` at the edge).
 * The rule left here is `applyVehicle`'s: a different vehicle goes back to `pending`.
 */
export class SaveDriverVehicle {
  constructor(
    private readonly users: UserRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(userId: string, vehicle: DriverVehicle): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }

    const saved = await this.users.saveDriverProfile(
      userId,
      applyVehicle(user.driver, vehicle, this.now()),
    );
    if (!saved) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }
    return toPublicUser(saved);
  }
}
