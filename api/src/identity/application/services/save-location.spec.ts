import { MAX_SAVED_LOCATIONS } from '@farm-pool/shared';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { ForgetLocation, SaveLocation } from './save-location';

const DAMBULLA = { latitude: 7.8742, longitude: 80.6511 };
const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };

describe('saved locations', () => {
  let users: InMemoryUserRepository;
  let save: SaveLocation;
  let forget: ForgetLocation;
  let buyerId: string;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    save = new SaveLocation(users);
    forget = new ForgetLocation(users);
    const buyer = await users.create({
      displayName: 'Ayesha',
      phone: '+94770000900',
      passwordHash: 'hash',
      role: 'buyer',
    });
    buyerId = buyer.id;
  });

  it('saves a place with an id the app can key on', async () => {
    const user = await save.execute(buyerId, {
      label: 'Dambulla market',
      point: DAMBULLA,
    });

    expect(user.savedLocations).toHaveLength(1);
    expect(user.savedLocations?.[0]).toMatchObject({
      label: 'Dambulla market',
      point: DAMBULLA,
    });
    expect(user.savedLocations?.[0].id).toBeTruthy();
  });

  /* Re-pinning a place the buyer already named means "this is where it actually is", not "I now
     have two of them" — so the same label updates rather than duplicating. */
  it('updates the point when the same label is saved again, keeping its id', async () => {
    const first = await save.execute(buyerId, {
      label: 'Dambulla market',
      point: DAMBULLA,
    });
    const id = first.savedLocations?.[0].id;

    const second = await save.execute(buyerId, {
      label: 'dambulla  MARKET',
      point: COLOMBO,
    });

    expect(second.savedLocations).toHaveLength(1);
    expect(second.savedLocations?.[0].point).toEqual(COLOMBO);
    expect(second.savedLocations?.[0].id).toBe(id);
  });

  it('keeps different places apart', async () => {
    await save.execute(buyerId, { label: 'Dambulla market', point: DAMBULLA });
    const user = await save.execute(buyerId, {
      label: 'Colombo warehouse',
      point: COLOMBO,
    });

    expect(user.savedLocations).toHaveLength(2);
  });

  it('refuses past the cap rather than growing the account read forever', async () => {
    for (let i = 0; i < MAX_SAVED_LOCATIONS; i++) {
      await save.execute(buyerId, { label: `Place ${i}`, point: DAMBULLA });
    }

    await expect(
      save.execute(buyerId, { label: 'One too many', point: DAMBULLA }),
    ).rejects.toMatchObject({ code: 'too_many_locations' });
  });

  it('forgets a place, and forgetting a gone one is not an error', async () => {
    const saved = await save.execute(buyerId, {
      label: 'Dambulla market',
      point: DAMBULLA,
    });
    const id = saved.savedLocations?.[0].id ?? '';

    const after = await forget.execute(buyerId, id);
    expect(after.savedLocations).toBeUndefined();

    // A double tap must not 404.
    await expect(forget.execute(buyerId, id)).resolves.toBeTruthy();
  });
});
