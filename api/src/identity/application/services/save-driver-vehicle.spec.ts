import { driverVehicleSchema } from '@farm-pool/shared';
import { InMemoryUserRepository } from '../../infrastructure/persistence/in-memory-user.repository';
import { IdentityError } from '../errors';
import { SaveDriverVehicle } from './save-driver-vehicle';

describe('SaveDriverVehicle', () => {
  let users: InMemoryUserRepository;
  let save: SaveDriverVehicle;
  let clock: Date;
  let driverId: string;

  const vehicle = driverVehicleSchema.parse({
    vehicleType: 'small-lorry',
    registration: '  wp   cab-1234 ',
    capacityKg: 2500,
    operatingDistrict: 'Kurunegala',
  });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    clock = new Date('2026-09-30T08:00:00.000Z');
    save = new SaveDriverVehicle(users, () => clock);
    const driver = await users.create({
      displayName: 'Sunil',
      phone: '+94771234567',
      passwordHash: 'hashed:x',
      role: 'logistics',
    });
    driverId = driver.id;
  });

  it('stores the vehicle with a normalised plate, pending verification', async () => {
    const user = await save.execute(driverId, vehicle);

    expect(user.driver).toEqual({
      vehicleType: 'small-lorry',
      registration: 'WP CAB-1234',
      capacityKg: 2500,
      operatingDistrict: 'Kurunegala',
      verification: 'pending',
      updatedAt: '2026-09-30T08:00:00.000Z',
    });
    expect((await users.findById(driverId))?.driver?.registration).toBe(
      'WP CAB-1234',
    );
  });

  it('keeps a verified state when only capacity or district change', async () => {
    await save.execute(driverId, vehicle);
    await markVerified();

    const user = await save.execute(driverId, {
      ...vehicle,
      capacityKg: 3000,
      operatingDistrict: 'Matale',
    });

    expect(user.driver).toMatchObject({
      capacityKg: 3000,
      operatingDistrict: 'Matale',
      verification: 'verified',
    });
  });

  it('sends a different plate or vehicle type back to pending', async () => {
    await save.execute(driverId, vehicle);
    await markVerified();
    const newPlate = await save.execute(driverId, {
      ...vehicle,
      registration: 'WP CAB-9999',
    });
    expect(newPlate.driver?.verification).toBe('pending');

    await markVerified();
    const newType = await save.execute(driverId, {
      ...vehicle,
      registration: 'WP CAB-9999',
      vehicleType: 'lorry',
    });
    expect(newType.driver?.verification).toBe('pending');
  });

  it('refuses an account that no longer exists', async () => {
    await expect(save.execute('missing', vehicle)).rejects.toEqual(
      new IdentityError('not_found', 'This account no longer exists'),
    );
  });

  /** Nothing in the app verifies a driver yet (the process is undecided), so the test does. */
  async function markVerified() {
    const user = await users.findById(driverId);
    await users.saveDriverProfile(driverId, {
      ...user!.driver!,
      verification: 'verified',
    });
  }
});
