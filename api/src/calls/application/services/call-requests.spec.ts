import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryCallRepository } from '../../infrastructure/persistence/in-memory-call.repository';
import { AnswerCall } from './answer-call';
import { ListMyCalls } from './list-my-calls';
import { RequestCall } from './request-call';

const listingFields: NewListing = {
  farmerId: 'farmer-1',
  farmerName: 'Nimal',
  cropId: 'tomato',
  quantityKg: 100,
  pricePerKg: 180,
  harvestDate: '2026-09-20',
  district: 'Kurunegala',
  minOrderKg: 10,
  status: 'verified',
};

describe('call requests (FARM-24)', () => {
  let calls: InMemoryCallRepository;
  let listings: InMemoryListingRepository;
  let request: RequestCall;
  let answer: AnswerCall;
  let listMine: ListMyCalls;
  let listingId: string;
  let buyerId: string;

  beforeEach(async () => {
    calls = new InMemoryCallRepository();
    listings = new InMemoryListingRepository();
    const users = new InMemoryUserRepository();
    request = new RequestCall(calls, listings, users);
    answer = new AnswerCall(calls);
    listMine = new ListMyCalls(calls);
    listingId = (await listings.seed({ ...listingFields })).id;
    buyerId = (
      await users.create({
        displayName: 'Kamal',
        phone: '+94771234567',
        passwordHash: 'x',
        role: 'buyer',
      })
    ).id;
  });

  it('creates a requested call to the listing farmer, names copied', async () => {
    const call = await request.execute(buyerId, { listingId });
    expect(call).toMatchObject({
      listingId,
      callerId: buyerId,
      callerName: 'Kamal',
      calleeId: 'farmer-1',
      calleeName: 'Nimal',
      status: 'requested',
    });
  });

  it('refuses a second open request for the same listing', async () => {
    await request.execute(buyerId, { listingId });
    await expect(request.execute(buyerId, { listingId })).rejects.toMatchObject(
      { kind: 'conflict', code: 'call_already_open' },
    );
  });

  it('allows a new request once the last one was declined', async () => {
    const first = await request.execute(buyerId, { listingId });
    await answer.execute('farmer-1', first.id, 'decline');
    await expect(
      request.execute(buyerId, { listingId }),
    ).resolves.toMatchObject({ status: 'requested' });
  });

  it('refuses a missing, unverified or own listing', async () => {
    await expect(
      request.execute(buyerId, { listingId: 'nope' }),
    ).rejects.toMatchObject({ code: 'listing_not_found' });

    const pending = await listings.seed({
      ...listingFields,
      status: 'pending_approval',
    });
    await expect(
      request.execute(buyerId, { listingId: pending.id }),
    ).rejects.toMatchObject({ code: 'listing_unavailable' });

    await expect(
      request.execute('farmer-1', { listingId }),
    ).rejects.toMatchObject({ code: 'own_listing' });
  });

  it('lets the farmer accept, making the call active', async () => {
    const call = await request.execute(buyerId, { listingId });
    await expect(
      answer.execute('farmer-1', call.id, 'accept'),
    ).resolves.toMatchObject({ status: 'active' });
  });

  it('only the callee answers, and only once', async () => {
    const call = await request.execute(buyerId, { listingId });
    await expect(
      answer.execute(buyerId, call.id, 'accept'),
    ).rejects.toMatchObject({ kind: 'forbidden', code: 'not_the_callee' });
    await expect(
      answer.execute('stranger', call.id, 'accept'),
    ).rejects.toMatchObject({ code: 'not_your_call' });

    await answer.execute('farmer-1', call.id, 'decline');
    await expect(
      answer.execute('farmer-1', call.id, 'accept'),
    ).rejects.toMatchObject({ kind: 'conflict', code: 'call_not_requested' });
  });

  it('lists a call for both people and nobody else', async () => {
    await request.execute(buyerId, { listingId });
    expect(await listMine.execute(buyerId)).toHaveLength(1);
    expect(await listMine.execute('farmer-1')).toHaveLength(1);
    expect(await listMine.execute('stranger')).toHaveLength(0);
  });
});
