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
