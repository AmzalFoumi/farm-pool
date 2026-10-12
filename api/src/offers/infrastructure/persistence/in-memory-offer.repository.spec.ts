import type { NewOffer } from '../../domain/entities/offer';
import { toOfferDto } from '../../domain/entities/offer';
import { InMemoryOfferRepository } from './in-memory-offer.repository';

const fields: NewOffer = {
  buyerId: 'buyer-1',
  farmerId: 'farmer-1',
  listingId: 'listing-1',
  listingType: 'STANDARD',
  cropId: 'tomato',
  initiatedBy: 'BUYER',
  pricePerKg: 170,
  quantityKg: 40,
  total: 6800,
  status: 'PENDING',
  actionRequiredBy: 'FARMER',
  negotiationHistory: [],
  version: 0,
};

describe('InMemoryOfferRepository', () => {
  it('refuses a save whose version is not exactly one above the stored one', async () => {
    const offers = new InMemoryOfferRepository();
    const created = await offers.create({ ...fields });

    const first = await offers.findById(created.id);
    const second = await offers.findById(created.id);
    first!.status = 'NEGOTIATING';
    first!.version += 1;
    await offers.save(first!);

    second!.status = 'DECLINED';
    second!.version += 1;
    await expect(offers.save(second!)).rejects.toMatchObject({
      code: 'conflict',
      kind: 'conflict',
    });
    expect((await offers.findById(created.id))?.status).toBe('NEGOTIATING');
  });

  it('hands out copies, so changing a loaded offer does not change the stored one', async () => {
    const offers = new InMemoryOfferRepository();
    const created = await offers.create({ ...fields });
    created.status = 'DECLINED';
    expect((await offers.findById(created.id))?.status).toBe('PENDING');
  });

  it('finds offers by buyer, by farmer, and the live ones between a pair', async () => {
    const offers = new InMemoryOfferRepository();
    const live = await offers.create({ ...fields });
    await offers.create({ ...fields, status: 'DECLINED' });
    await offers.create({ ...fields, buyerId: 'buyer-2' });

    expect(await offers.findByBuyerId('buyer-1')).toHaveLength(2);
    expect(await offers.findByFarmerId('farmer-1')).toHaveLength(3);
    const between = await offers.findActiveBetween({
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      listingId: 'listing-1',
    });
    expect(between.map((o) => o.id)).toEqual([live.id]);
  });

  it('maps an offer stored before names and delivery points existed', async () => {
    const offers = new InMemoryOfferRepository();
    const dto = toOfferDto(await offers.create({ ...fields }));
    expect(dto).not.toHaveProperty('farmerName');
    expect(dto).not.toHaveProperty('buyerName');
    expect(dto).not.toHaveProperty('dropOff');
  });
});
