import type { NewOrder } from '../../../orders/domain/entities/order';
import { InMemoryOrderRepository } from '../../../orders/infrastructure/persistence/in-memory-order.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { ListCooperativeOrders } from './list-cooperative-orders';

const fields: NewOrder = {
  buyerId: 'buyer-1',
  farmerId: 'farmer-1',
  farmerName: 'Nimal',
  listingId: 'listing-1',
  cropId: 'tomato',
  quantityKg: 100,
  pricePerKg: 180,
  total: 18000,
  status: 'delivered',
};

describe('ListCooperativeOrders', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let orders: InMemoryOrderRepository;
  let listCooperativeOrders: ListCooperativeOrders;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    orders = new InMemoryOrderRepository();
    listCooperativeOrders = new ListCooperativeOrders(cooperatives, orders);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1'],
    });
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(listCooperativeOrders.execute('nobody')).rejects.toMatchObject(
      { code: 'cooperative_not_found' },
    );
  });

  it('returns every order of a member farmer, any status', async () => {
    const delivered = await orders.create({ ...fields });
    const inTransit = await orders.create({
      ...fields,
      status: 'in_transit',
      collectedKg: 95,
    });
    const cancelled = await orders.create({ ...fields, status: 'cancelled' });

    const result = await listCooperativeOrders.execute('coord-1');

    expect(result.map((o) => o.id).sort()).toEqual(
      [delivered.id, inTransit.id, cancelled.id].sort(),
    );
    expect(result.find((o) => o.id === inTransit.id)?.collectedKg).toBe(95);
  });

  it('excludes an order from a farmer outside the cooperative', async () => {
    await orders.create({ ...fields, farmerId: 'farmer-9' });

    const result = await listCooperativeOrders.execute('coord-1');

    expect(result).toHaveLength(0);
  });
});
