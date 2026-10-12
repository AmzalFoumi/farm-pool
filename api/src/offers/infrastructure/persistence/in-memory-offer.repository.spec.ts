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

  it('keeps responses to a request apart from ordinary offers on the same listing', async () => {
    const offers = new InMemoryOfferRepository();
    const ordinary = await offers.create({ ...fields });
    const response = await offers.create({
      ...fields,
      listingType: 'WANTED',
      wantedId: 'wanted-1',
      initiatedBy: 'FARMER',
      actionRequiredBy: 'BUYER',
    });
    const otherResponse = await offers.create({
      ...fields,
      farmerId: 'farmer-2',
      listingId: 'listing-2',
      listingType: 'WANTED',
      wantedId: 'wanted-1',
    });
    await offers.create({
      ...fields,
      wantedId: 'wanted-1',
      status: 'DECLINED',
    });

    expect(
      (await offers.findByWantedId('wanted-1')).map((o) => o.id).sort(),
    ).toHaveLength(3);
    expect(
      (await offers.findActiveByWantedId('wanted-1', response.id)).map(
        (o) => o.id,
      ),
    ).toEqual([otherResponse.id]);

    const pair = {
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      listingId: 'listing-1',
    };
    expect((await offers.findActiveBetween(pair)).map((o) => o.id)).toEqual([
      ordinary.id,
    ]);
    expect(
      (await offers.findActiveBetween({ ...pair, wantedId: 'wanted-1' })).map(
        (o) => o.id,
      ),
    ).toEqual([response.id]);
  });

  it('maps an offer stored before names and delivery points existed', async () => {
    const offers = new InMemoryOfferRepository();
    const dto = toOfferDto(await offers.create({ ...fields }));
    expect(dto).not.toHaveProperty('farmerName');
    expect(dto).not.toHaveProperty('buyerName');
    expect(dto).not.toHaveProperty('dropOff');
  });
});
