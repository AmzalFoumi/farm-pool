import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryOrderRepository } from '../../infrastructure/persistence/in-memory-order.repository';
import { CancelOrder } from './cancel-order';
import { GetOrder } from './get-order';
import { ListMyOrders } from './list-my-orders';
import { PlaceOrder } from './place-order';

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

describe('orders', () => {
  let listings: InMemoryListingRepository;
  let orders: InMemoryOrderRepository;
  let place: PlaceOrder;
  let listMine: ListMyOrders;
  let get: GetOrder;
  let cancel: CancelOrder;
  let listingId: string;

  beforeEach(async () => {
    listings = new InMemoryListingRepository();
    orders = new InMemoryOrderRepository();
    place = new PlaceOrder(orders, listings);
    listMine = new ListMyOrders(orders);
    get = new GetOrder(orders);
    cancel = new CancelOrder(orders);
    listingId = (await listings.seed({ ...listingFields })).id;
  });

  it('places a requested order with price, farmer and crop copied from the listing', async () => {
    const order = await place.execute('buyer-1', { listingId, quantityKg: 25 });

    expect(order).toMatchObject({
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      farmerName: 'Nimal',
      cropId: 'tomato',
      quantityKg: 25,
      pricePerKg: 180,
      total: 4500,
      status: 'requested',
    });
    expect(order).not.toHaveProperty('note');
  });

  it('does not touch the listing quantity', async () => {
    await place.execute('buyer-1', { listingId, quantityKg: 25 });
    expect((await listings.findById(listingId))?.quantityKg).toBe(100);
  });

  it('refuses a quantity below the minimum or above what is on offer', async () => {
    await expect(
      place.execute('buyer-1', { listingId, quantityKg: 5 }),
    ).rejects.toMatchObject({ code: 'quantity_out_of_range', kind: 'invalid' });
    await expect(
      place.execute('buyer-1', { listingId, quantityKg: 101 }),
    ).rejects.toMatchObject({ code: 'quantity_out_of_range' });
    await expect(
      place.execute('buyer-1', { listingId, quantityKg: 100 }),
    ).resolves.toBeDefined();
  });

  it('refuses an unknown or non-verified listing', async () => {
    const draft = await listings.seed({ ...listingFields, status: 'draft' });
    await expect(
      place.execute('buyer-1', { listingId: 'nope', quantityKg: 10 }),
    ).rejects.toMatchObject({ code: 'listing_not_found', kind: 'not_found' });
    await expect(
      place.execute('buyer-1', { listingId: draft.id, quantityKg: 10 }),
    ).rejects.toMatchObject({ code: 'listing_unavailable', kind: 'conflict' });
  });

  it("lists only the caller's orders, and shows one to its buyer or farmer only", async () => {
    const mine = await place.execute('buyer-1', { listingId, quantityKg: 10 });
    await place.execute('buyer-2', { listingId, quantityKg: 10 });

    expect((await listMine.execute('buyer-1')).map((o) => o.id)).toEqual([
      mine.id,
    ]);

    await expect(get.execute('buyer-1', mine.id)).resolves.toMatchObject({
      id: mine.id,
    });
    await expect(get.execute('farmer-1', mine.id)).resolves.toMatchObject({
      id: mine.id,
    });
    await expect(get.execute('buyer-2', mine.id)).rejects.toMatchObject({
      code: 'not_your_order',
      kind: 'forbidden',
    });
    await expect(get.execute('buyer-1', 'missing')).rejects.toMatchObject({
      code: 'order_not_found',
    });
  });

  it('cancels only while requested, and only by its buyer', async () => {
    const order = await place.execute('buyer-1', { listingId, quantityKg: 10 });

    await expect(cancel.execute('buyer-2', order.id)).rejects.toMatchObject({
      code: 'not_your_order',
    });

    const cancelled = await cancel.execute('buyer-1', order.id);
    expect(cancelled.status).toBe('cancelled');

    await expect(cancel.execute('buyer-1', order.id)).rejects.toMatchObject({
      code: 'order_not_cancellable',
      kind: 'conflict',
    });

    const accepted = await place.execute('buyer-1', {
      listingId,
      quantityKg: 10,
    });
    await orders.updateStatus(accepted.id, 'accepted');
    await expect(cancel.execute('buyer-1', accepted.id)).rejects.toMatchObject({
      code: 'order_not_cancellable',
    });
  });
});
