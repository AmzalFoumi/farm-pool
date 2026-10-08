import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { ApproveFarmer } from './approve-farmer';
import { JoinCooperative } from './join-cooperative';
import { RejectFarmer } from './reject-farmer';

async function seedPendingFarmer(users: InMemoryUserRepository) {
  return users.create({
    displayName: 'Ranjith',
    phone: `+9477${Math.floor(Math.random() * 10_000_000)
      .toString()
      .padStart(7, '0')}`,
    passwordHash: 'hash',
    role: 'farmer',
    status: 'pending_review',
  });
}

describe('JoinCooperative', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let users: InMemoryUserRepository;
  let joinCooperative: JoinCooperative;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    users = new InMemoryUserRepository();
    joinCooperative = new JoinCooperative(cooperatives, users);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: [],
    });
  });

  it('adds the farmer to the cooperative covering their district, case-insensitively', async () => {
    const cooperative = await joinCooperative.execute('farmer-1', 'kurunegala');
    expect(cooperative.memberFarmerIds).toContain('farmer-1');
  });

  it('records the district on the farmer’s own account, for the coordinator to see', async () => {
    const farmer = await seedPendingFarmer(users);
    await joinCooperative.execute(farmer.id, 'Kurunegala');
    expect((await users.findById(farmer.id))?.district).toBe('Kurunegala');
  });

  it('is idempotent — applying twice does not duplicate the membership', async () => {
    await joinCooperative.execute('farmer-1', 'Kurunegala');
    const cooperative = await joinCooperative.execute('farmer-1', 'Kurunegala');
    expect(
      cooperative.memberFarmerIds.filter((id) => id === 'farmer-1'),
    ).toHaveLength(1);
  });

  it('throws no_cooperative_for_district when no cooperative covers the district', async () => {
    await expect(
      joinCooperative.execute('farmer-1', 'Jaffna'),
    ).rejects.toMatchObject({
      code: 'no_cooperative_for_district',
      kind: 'not_found',
    });
  });
});

describe('ApproveFarmer', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let users: InMemoryUserRepository;
  let approveFarmer: ApproveFarmer;

  beforeEach(() => {
    cooperatives = new InMemoryCooperativeRepository();
    users = new InMemoryUserRepository();
    approveFarmer = new ApproveFarmer(cooperatives, users);
  });

  it('activates a pending farmer who is a member of the coordinator’s cooperative', async () => {
    const farmer = await seedPendingFarmer(users);
    const cooperative = await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    const result = await approveFarmer.execute('coord-1', farmer.id);

    expect(result.status).toBe('active');
    expect((await users.findById(farmer.id))?.status).toBe('active');
    expect(cooperative.memberFarmerIds).toContain(farmer.id);
  });

  it('throws farmer_not_found for a farmer outside the coordinator’s cooperative', async () => {
    const farmer = await seedPendingFarmer(users);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [],
    });

    await expect(
      approveFarmer.execute('coord-1', farmer.id),
    ).rejects.toMatchObject({ code: 'farmer_not_found' });
  });

  it('throws farmer_not_pending when approving the same farmer twice', async () => {
    const farmer = await seedPendingFarmer(users);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    await approveFarmer.execute('coord-1', farmer.id);

    await expect(
      approveFarmer.execute('coord-1', farmer.id),
    ).rejects.toMatchObject({ code: 'farmer_not_pending', kind: 'conflict' });
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    const farmer = await seedPendingFarmer(users);
    await expect(
      approveFarmer.execute('nobody', farmer.id),
    ).rejects.toMatchObject({ code: 'cooperative_not_found' });
  });
});

describe('RejectFarmer', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let users: InMemoryUserRepository;
  let rejectFarmer: RejectFarmer;

  beforeEach(() => {
    cooperatives = new InMemoryCooperativeRepository();
    users = new InMemoryUserRepository();
    rejectFarmer = new RejectFarmer(cooperatives, users);
  });

  it('suspends a pending farmer and removes them from the cooperative', async () => {
    const farmer = await seedPendingFarmer(users);
    const cooperative = await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    const result = await rejectFarmer.execute(
      'coord-1',
      farmer.id,
      'Could not verify identity',
    );

    expect(result.status).toBe('suspended');
    expect(result.rejectionReason).toBe('Could not verify identity');
    expect(await users.findById(farmer.id)).toMatchObject({
      status: 'suspended',
      rejectionReason: 'Could not verify identity',
    });
    const after = await cooperatives.findById(cooperative.id);
    expect(after?.memberFarmerIds).not.toContain(farmer.id);
  });

  it('throws farmer_not_found on a second reject — removal already dropped their membership', async () => {
    const farmer = await seedPendingFarmer(users);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    await rejectFarmer.execute('coord-1', farmer.id, 'No reason');

    await expect(
      rejectFarmer.execute('coord-1', farmer.id, 'No reason'),
    ).rejects.toMatchObject({ code: 'farmer_not_found' });
  });

  it('throws farmer_not_pending for an already-active member', async () => {
    const farmer = await seedPendingFarmer(users);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    await users.activate(farmer.id);

    await expect(
      rejectFarmer.execute('coord-1', farmer.id, 'No reason'),
    ).rejects.toMatchObject({ code: 'farmer_not_pending' });
  });
});
