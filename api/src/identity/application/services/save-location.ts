import {
  MAX_SAVED_LOCATIONS,
  type PublicUser,
  type SaveLocationData,
} from '@farm-pool/shared';
import { randomUUID } from 'node:crypto';
import { toPublicUser } from '../../domain/entities/user';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { IdentityError } from '../errors';

/**
 * A buyer keeps a place they deliver to, so the next order is a tap rather than a pin (FARM-26).
 *
 * The list is replaced wholesale through `saveLocations` rather than pushed to, because the rules
 * about what the list may contain — the cap, and one entry per label — belong here and not in the
 * store. A `$push` would put half of them in Mongo and half in this file.
 *
 * **Saving the same label twice updates it instead of adding a duplicate.** A buyer who re-pins
 * "Dambulla market" because the first pin was off by a street means "this is where it actually
 * is", not "I now have two Dambulla markets". The label is the identity as far as the person is
 * concerned, so it is the identity here.
 */
export class SaveLocation {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, data: SaveLocationData): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }

    const existing = user.savedLocations ?? [];
    const sameLabel = existing.find((l) => matches(l.label, data.label));

    const next = sameLabel
      ? existing.map((l) =>
          l === sameLabel ? { ...l, label: data.label, point: data.point } : l,
        )
      : [...existing, { id: randomUUID(), ...data }];

    if (next.length > MAX_SAVED_LOCATIONS) {
      throw new IdentityError(
        'too_many_locations',
        `You can keep up to ${MAX_SAVED_LOCATIONS} saved places. Remove one first.`,
      );
    }

    const saved = await this.users.saveLocations(userId, next);
    if (!saved) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }
    return toPublicUser(saved);
  }
}

/** Forget a saved place. Removing one that is already gone is not an error — the buyer's intent
 *  ("I do not want this") is satisfied either way, and a 404 here would only ever be a double tap. */
export class ForgetLocation {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, locationId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }

    const next = (user.savedLocations ?? []).filter((l) => l.id !== locationId);
    const saved = await this.users.saveLocations(userId, next);
    if (!saved) {
      throw new IdentityError('not_found', 'This account no longer exists');
    }
    return toPublicUser(saved);
  }
}

/**
 * Labels are compared the way a person would: case, surrounding space and a double-tapped space
 * in the middle do not make a different place. The buyer's own spelling is still what gets
 * stored — only the comparison is normalised, never the label they typed.
 */
function matches(a: string, b: string): boolean {
  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalise(a) === normalise(b);
}
