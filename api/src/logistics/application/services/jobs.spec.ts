import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryOrderRepository } from '../../../orders/infrastructure/persistence/in-memory-order.repository';
import { AcceptJob } from './accept-job';
import { ConfirmDelivery, ConfirmPickup } from './confirm-delivery-step';
import { GetAssignedDriver } from './get-assigned-driver';
import { GetJob } from './get-job';
import { ListMyJobs } from './list-my-jobs';
import { ListOpenJobs } from './list-open-jobs';

const listingFields: NewListing = {
  farmerId: 'farmer-1',
  farmerName: 'Nimal',
  cropId: 'tomato',
  quantityKg: 500,
  pricePerKg: 180,
  harvestDate: '2026-09-20',
  district: 'Kurunegala',
  town: 'Wariyapola',
  farmgateNotes: 'Past the tank, call at the junction',
  minOrderKg: 10,
  status: 'verified',
};

describe('logistics jobs', () => {
  let listings: InMemoryListingRepository;
  let orders: InMemoryOrderRepository;
  let users: InMemoryUserRepository;
  let board: ListOpenJobs;
  let mine: ListMyJobs;
  let get: GetJob;
  let accept: AcceptJob;
  let assignedDriver: GetAssignedDriver;
  let pickup: ConfirmPickup;
  let deliver: ConfirmDelivery;

  let listingId: string;
  let driverId: string;
  let farmerId: string;

  /** An order in whatever status the test needs, against the seeded listing. */
  const seedOrder = async (
    quantityKg: number,
    status: 'open' | 'requested',
  ) => {
    const order = await orders.create({
      buyerId: 'buyer-1',
      farmerId,
      farmerName: 'Nimal',
      listingId,
      cropId: 'tomato',
      quantityKg,
      pricePerKg: 180,
      total: quantityKg * 180,
      status: 'open',
    });
    if (status !== 'open') await orders.updateStatus(order.id, status);
    return order.id;
  };

  const seedDriver = async (
    phone: string,
    vehicle: { capacityKg: number; operatingDistrict: string },
  ) => {
    const user = await users.create({
      displayName: 'Sunil',
      phone,
      passwordHash: 'hash',
      role: 'logistics',
    });
    await users.saveDriverProfile(user.id, {
      vehicleType: 'small-lorry',
      registration: 'NW CAB-4821',
      capacityKg: vehicle.capacityKg,
      operatingDistrict: vehicle.operatingDistrict,
      verification: 'pending',
      updatedAt: new Date(),
    });
    return user.id;
  };

  beforeEach(async () => {
    listings = new InMemoryListingRepository();
    orders = new InMemoryOrderRepository();
    users = new InMemoryUserRepository();
    board = new ListOpenJobs(orders, listings, users);
    mine = new ListMyJobs(orders, listings);
    get = new GetJob(orders, listings, users);
    accept = new AcceptJob(orders, listings, users);
    assignedDriver = new GetAssignedDriver(orders, users);
    pickup = new ConfirmPickup(orders, listings, users);
    deliver = new ConfirmDelivery(orders, listings, users);

    listingId = (await listings.seed({ ...listingFields })).id;

    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94771111111',
      passwordHash: 'hash',
      role: 'farmer',
    });
    farmerId = farmer.id;

    driverId = await seedDriver('+94772222222', {
      capacityKg: 1500,
      operatingDistrict: 'Kurunegala',
    });
  });

  describe('the board', () => {
    it('shows an open job in the driver district that the vehicle can carry', async () => {
      const id = await seedOrder(120, 'open');

      const jobs = await board.execute(driverId);

      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({
        id,
        quantityKg: 120,
        district: 'Kurunegala',
      });
    });

    /* LP-21, the constraint the board exists to honour: no job without a confirmed order. */
    it('never shows an order that has not reached open', async () => {
      await seedOrder(120, 'requested');

      await expect(board.execute(driverId)).resolves.toEqual([]);
    });

    it('hides a load heavier than the vehicle', async () => {
      await seedOrder(2000, 'open');

      await expect(board.execute(driverId)).resolves.toEqual([]);
    });

    it('hides a job in another district, comparing names case-insensitively', async () => {
      await seedOrder(120, 'open');
      const jaffna = await seedDriver('+94773333333', {
        capacityKg: 1500,
        operatingDistrict: 'Jaffna',
      });
      const sameDistrictOddCase = await seedDriver('+94774444444', {
        capacityKg: 1500,
        operatingDistrict: '  kurunegala ',
      });

      await expect(board.execute(jaffna)).resolves.toEqual([]);
      await expect(board.execute(sameDistrictOddCase)).resolves.toHaveLength(1);
    });

    it('refuses a driver with no vehicle on file', async () => {
      const noVehicle = await users.create({
        displayName: 'New',
        phone: '+94775555555',
        passwordHash: 'hash',
        role: 'logistics',
      });

      await expect(board.execute(noVehicle.id)).rejects.toMatchObject({
        code: 'no_vehicle',
      });
    });

    it('carries no phone number — the board is public to every driver', async () => {
      await seedOrder(120, 'open');

      const [job] = await board.execute(driverId);

      expect(JSON.stringify(job)).not.toContain('+9477');
    });
  });

  describe('accepting', () => {
    it('moves the order to assigned and returns the pickup contact', async () => {
      const id = await seedOrder(120, 'open');

      const job = await accept.execute(driverId, id);

      expect(job.status).toBe('assigned');
      expect(job.pickup).toMatchObject({
        farmerName: 'Nimal',
        farmerPhone: '+94771111111',
        farmgateNotes: 'Past the tank, call at the junction',
      });
      await expect(orders.findById(id)).resolves.toMatchObject({
        status: 'assigned',
        assignedDriverId: driverId,
      });
    });

    it('takes the job off every other driver board', async () => {
      const id = await seedOrder(120, 'open');
      const other = await seedDriver('+94776666666', {
        capacityKg: 1500,
        operatingDistrict: 'Kurunegala',
      });

      await accept.execute(driverId, id);

      await expect(board.execute(other)).resolves.toEqual([]);
    });

    /* The race worth engineering against: two drivers tap Accept on the same job. The loser must
       be told, never quietly handed work another driver is already driving to. */
    it('tells the second driver the job is taken', async () => {
      const id = await seedOrder(120, 'open');
      const other = await seedDriver('+94777777777', {
        capacityKg: 1500,
        operatingDistrict: 'Kurunegala',
      });
      await accept.execute(driverId, id);

      await expect(accept.execute(other, id)).rejects.toMatchObject({
        code: 'job_taken',
      });
      await expect(orders.findById(id)).resolves.toMatchObject({
        assignedDriverId: driverId,
      });
    });

    it('refuses a load heavier than the vehicle', async () => {
      const id = await seedOrder(2000, 'open');

      await expect(accept.execute(driverId, id)).rejects.toMatchObject({
        code: 'load_too_heavy',
      });
    });

    /* Nothing moves a driver past `pending` yet (open question 3), so gating on `verified` would
       mean no driver could accept anything. This test pins that decision until it is answered. */
    it('lets a driver whose vehicle is still pending accept', async () => {
      const id = await seedOrder(120, 'open');

      await expect(accept.execute(driverId, id)).resolves.toMatchObject({
        status: 'assigned',
      });
    });

    it('refuses an order that never reached open', async () => {
      const id = await seedOrder(120, 'requested');

      await expect(accept.execute(driverId, id)).rejects.toMatchObject({
        code: 'job_taken',
      });
    });
  });

  describe('job detail', () => {
    it('withholds the farmer phone number until this driver holds the job', async () => {
      const id = await seedOrder(120, 'open');

      const before = await get.execute(driverId, id);
      expect(before.pickup).toBeUndefined();

      await accept.execute(driverId, id);

      const after = await get.execute(driverId, id);
      expect(after.pickup?.farmerPhone).toBe('+94771111111');
    });

    it('refuses a job another driver holds', async () => {
      const id = await seedOrder(120, 'open');
      const other = await seedDriver('+94778888888', {
        capacityKg: 1500,
        operatingDistrict: 'Kurunegala',
      });
      await accept.execute(driverId, id);

      await expect(get.execute(other, id)).rejects.toMatchObject({
        code: 'not_your_job',
      });
    });

    it('lists the accepted job under the driver own jobs', async () => {
      const id = await seedOrder(120, 'open');
      await accept.execute(driverId, id);

      await expect(mine.execute(driverId)).resolves.toMatchObject([
        { id, status: 'assigned' },
      ]);
    });
  });

  describe('fulfilment', () => {
    /** An accepted job, ready for its pickup confirmation. */
    const accepted = async () => {
      const id = await seedOrder(120, 'open');
      await accept.execute(driverId, id);
      return id;
    };

    it('records the weight actually loaded and moves to in transit', async () => {
      const id = await accepted();

      const job = await pickup.execute(driverId, id, 95);

      expect(job).toMatchObject({ status: 'in_transit', collectedKg: 95 });
      await expect(orders.findById(id)).resolves.toMatchObject({
        status: 'in_transit',
        collectedKg: 95,
        quantityKg: 120,
      });
    });

    /* LP-50: the load on the lorry regularly is not the load on the order. Both directions are
       recorded as typed — an api that refused them would leave the driver no way to be honest. */
    it('accepts a short load and an over-collection alike', async () => {
      const short = await accepted();
      await expect(pickup.execute(driverId, short, 1)).resolves.toMatchObject({
        collectedKg: 1,
      });

      const over = await seedOrder(120, 'open');
      await accept.execute(driverId, over);
      await expect(pickup.execute(driverId, over, 140)).resolves.toMatchObject({
        collectedKg: 140,
      });
    });

    it('runs the whole lifecycle to delivered', async () => {
      const id = await accepted();
      await pickup.execute(driverId, id, 120);

      await expect(deliver.execute(driverId, id)).resolves.toMatchObject({
        status: 'delivered',
        collectedKg: 120,
      });
    });

    it('refuses a drop-off before the pickup, and says which step is missing', async () => {
      const id = await accepted();

      await expect(deliver.execute(driverId, id)).rejects.toMatchObject({
        code: 'wrong_stage',
        message: 'Confirm the pickup before the drop-off',
      });
    });

    it('refuses to confirm the same step twice', async () => {
      const id = await accepted();
      await pickup.execute(driverId, id, 120);
      await deliver.execute(driverId, id);

      await expect(deliver.execute(driverId, id)).rejects.toMatchObject({
        code: 'wrong_stage',
        message: 'This job is already finished',
      });
      await expect(pickup.execute(driverId, id, 120)).rejects.toMatchObject({
        code: 'wrong_stage',
      });
    });

    /* The guard is the repository filter, so this is the test that it actually guards. */
    it('refuses a driver who does not hold the job', async () => {
      const id = await accepted();
      const other = await seedDriver('+94779999999', {
        capacityKg: 1500,
        operatingDistrict: 'Kurunegala',
      });

      await expect(pickup.execute(other, id, 120)).rejects.toMatchObject({
        code: 'not_your_job',
      });
      await expect(orders.findById(id)).resolves.toMatchObject({
        status: 'assigned',
      });
    });

    it('leaves the job on the driver own list all the way through', async () => {
      const id = await accepted();
      await pickup.execute(driverId, id, 120);

      await expect(mine.execute(driverId)).resolves.toMatchObject([
        { id, status: 'in_transit' },
      ]);
    });
  });

  describe('who is collecting this order', () => {
    /* LP-04 — the requirement the whole verification feature exists for. */
    it('gives the farmer the plate and the verification state', async () => {
      const id = await seedOrder(120, 'open');
      await accept.execute(driverId, id);

      await expect(assignedDriver.execute(farmerId, id)).resolves.toMatchObject(
        {
          registration: 'NW CAB-4821',
          verification: 'pending',
          phone: '+94772222222',
        },
      );
    });

    it('gives the buyer the same', async () => {
      const id = await seedOrder(120, 'open');
      await accept.execute(driverId, id);

      await expect(
        assignedDriver.execute('buyer-1', id),
      ).resolves.toMatchObject({
        registration: 'NW CAB-4821',
      });
    });

    it('refuses anyone who is not on the order', async () => {
      const id = await seedOrder(120, 'open');
      await accept.execute(driverId, id);

      await expect(
        assignedDriver.execute('someone-else', id),
      ).rejects.toMatchObject({ code: 'not_your_job' });
    });

    it('says so while no driver has taken it', async () => {
      const id = await seedOrder(120, 'open');

      await expect(assignedDriver.execute(farmerId, id)).rejects.toMatchObject({
        code: 'no_driver_assigned',
      });
    });
  });
});

/**
 * Both ends of the trip (FARM-26). The farm gate comes from the listing, the drop-off from the
 * order, and the distance exists only when both are real — see `toJobSummary`.
 */
describe('job distance', () => {
  const GATE = { latitude: 7.6281, longitude: 80.2447 }; // near Wariyapola
  const DAMBULLA = { latitude: 7.8742, longitude: 80.6511 };

  let listings: InMemoryListingRepository;
  let orders: InMemoryOrderRepository;
  let users: InMemoryUserRepository;
  let board: ListOpenJobs;
  let driverId: string;

  const seed = async (opts: {
    pickupPoint?: typeof GATE;
    dropOff?: { point: typeof DAMBULLA };
  }) => {
    const listing = await listings.seed({
      ...listingFields,
      ...(opts.pickupPoint ? { pickupPoint: opts.pickupPoint } : {}),
    });
    await orders.create({
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      farmerName: 'Nimal',
      listingId: listing.id,
      cropId: 'tomato',
      quantityKg: 120,
      pricePerKg: 180,
      total: 21600,
      status: 'open',
      ...(opts.dropOff ? { dropOff: opts.dropOff } : {}),
    });
  };

  beforeEach(async () => {
    listings = new InMemoryListingRepository();
    orders = new InMemoryOrderRepository();
    users = new InMemoryUserRepository();
    board = new ListOpenJobs(orders, listings, users);
    const driver = await users.create({
      displayName: 'Sunil',
      phone: '+94770000800',
      passwordHash: 'hash',
      role: 'logistics',
    });
    await users.saveDriverProfile(driver.id, {
      vehicleType: 'small-lorry',
      registration: 'NW CAB-1111',
      capacityKg: 1500,
      operatingDistrict: 'Kurunegala',
      verification: 'pending',
      updatedAt: new Date(),
    });
    driverId = driver.id;
  });

  it('measures gate to drop-off when both are known', async () => {
    await seed({ pickupPoint: GATE, dropOff: { point: DAMBULLA } });

    const [job] = await board.execute(driverId);

    // ~48 km straight line between Wariyapola and Dambulla.
    expect(job.distanceKm).toBeGreaterThan(40);
    expect(job.distanceKm).toBeLessThan(55);
  });

  /* A distance from a district centre would be precise enough to be believed and wrong enough to
     matter on a quote, so there is no distance at all until both ends are real. */
  it('gives no distance when either end is missing', async () => {
    await seed({ dropOff: { point: DAMBULLA } });
    expect((await board.execute(driverId))[0].distanceKm).toBeUndefined();

    orders = new InMemoryOrderRepository();
    listings = new InMemoryListingRepository();
    board = new ListOpenJobs(orders, listings, users);
    await seed({ pickupPoint: GATE });
    expect((await board.execute(driverId))[0].distanceKm).toBeUndefined();
  });
});

/**
 * Capacity across every job a driver holds, not just the one in front of them.
 *
 * The bug this covers: the check was per-order, so three 600 kg jobs each passed against a 900 kg
 * van and three farmers were each promised a collection one vehicle could not make.
 */
describe('vehicle capacity across held jobs', () => {
  let listings: InMemoryListingRepository;
  let orders: InMemoryOrderRepository;
  let users: InMemoryUserRepository;
  let accept: AcceptJob;
  let pickup: ConfirmPickup;
  let deliver: ConfirmDelivery;
  let driverId: string;

  /** An open order of `quantityKg`, against its own listing. */
  const openOrder = async (quantityKg: number) => {
    const listing = await listings.seed({ ...listingFields, quantityKg: 5000 });
    const order = await orders.create({
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      farmerName: 'Nimal',
      listingId: listing.id,
      cropId: 'tomato',
      quantityKg,
      pricePerKg: 180,
      total: quantityKg * 180,
      status: 'open',
    });
    return order.id;
  };

  beforeEach(async () => {
    listings = new InMemoryListingRepository();
    orders = new InMemoryOrderRepository();
    users = new InMemoryUserRepository();
    accept = new AcceptJob(orders, listings, users);
    pickup = new ConfirmPickup(orders, listings, users);
    deliver = new ConfirmDelivery(orders, listings, users);

    const driver = await users.create({
      displayName: 'Sunil',
      phone: '+94770000700',
      passwordHash: 'hash',
      role: 'logistics',
    });
    await users.saveDriverProfile(driver.id, {
      vehicleType: 'van',
      registration: 'WP CAP-0900',
      capacityKg: 900,
      operatingDistrict: 'Kurunegala',
      verification: 'pending',
      updatedAt: new Date(),
    });
    driverId = driver.id;
  });

  it('refuses the job that would take the driver past their capacity', async () => {
    await accept.execute(driverId, await openOrder(600));

    await expect(
      accept.execute(driverId, await openOrder(600)),
    ).rejects.toMatchObject({ code: 'vehicle_full' });
  });

  it('allows jobs that fit together exactly', async () => {
    await accept.execute(driverId, await openOrder(600));

    await expect(
      accept.execute(driverId, await openOrder(300)),
    ).resolves.toMatchObject({ status: 'assigned' });
  });

  /* The two refusals mean different things: one can never be taken, the other can be taken after
     the current run. A driver deciding what to do next needs to know which. */
  it('tells a too-big load apart from a full vehicle', async () => {
    await expect(
      accept.execute(driverId, await openOrder(2000)),
    ).rejects.toMatchObject({ code: 'load_too_heavy' });

    await accept.execute(driverId, await openOrder(800));
    await expect(
      accept.execute(driverId, await openOrder(200)),
    ).rejects.toMatchObject({ code: 'vehicle_full' });
  });

  it('says how much room is left, so the driver knows what they can still take', async () => {
    await accept.execute(driverId, await openOrder(700));

    /* Caught rather than matched with `expect.stringContaining`, which is typed `any` and trips
       the no-unsafe-assignment rule this project lints with. */
    const refusal = await accept
      .execute(driverId, await openOrder(500))
      .then(() => null)
      .catch((e: Error) => e.message);

    expect(refusal).toContain('200 kg');
  });

  /* Delivering frees the space again — which is what lets a driver run a second trip without the
     app needing any concept of a trip. */
  it('frees the capacity once a load is delivered', async () => {
    const first = await openOrder(800);
    await accept.execute(driverId, first);
    await expect(
      accept.execute(driverId, await openOrder(300)),
    ).rejects.toMatchObject({ code: 'vehicle_full' });

    await pickup.execute(driverId, first, 800);
    await deliver.execute(driverId, first);

    await expect(
      accept.execute(driverId, await openOrder(300)),
    ).resolves.toMatchObject({ status: 'assigned' });
  });

  /* A short harvest is real room. Refusing work for kilograms that were never on the lorry would
     cost the driver a job and the farmer a collection, for nothing. */
  it('counts what was actually collected, not what was ordered', async () => {
    const first = await openOrder(800);
    await accept.execute(driverId, first);
    await pickup.execute(driverId, first, 300);

    await expect(
      accept.execute(driverId, await openOrder(600)),
    ).resolves.toMatchObject({ status: 'assigned' });
  });
});
