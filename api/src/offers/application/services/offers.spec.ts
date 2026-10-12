import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryWantedRepository } from '../../../catalog/infrastructure/persistence/in-memory-wanted.repository';
import type { User } from '../../../identity/domain/entities/user';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { PlaceOrder } from '../../../orders/application/services/place-order';
import { InMemoryOrderRepository } from '../../../orders/infrastructure/persistence/in-memory-order.repository';
import { InMemoryOfferRepository } from '../../infrastructure/persistence/in-memory-offer.repository';
import { AcceptOfferService } from './accept-offer.service';
import { CreateOfferService } from './create-offer.service';
import { DeclineOfferService } from './decline-offer.service';
import { SubmitNegotiationService } from './submit-negotiation.service';

const listingFields = (farmer: User): NewListing => ({
  farmerId: farmer.id,
  farmerName: farmer.displayName,
  cropId: 'tomato',
  quantityKg: 100,
  pricePerKg: 180,
  harvestDate: '2026-11-20',
  district: 'Kurunegala',
  minOrderKg: 10,
  acceptNegotiation: true,
  status: 'verified',
});

describe('offers', () => {
  let users: InMemoryUserRepository;
  let listings: InMemoryListingRepository;
  let wanteds: InMemoryWantedRepository;
  let orders: InMemoryOrderRepository;
  let offers: InMemoryOfferRepository;
  let create: CreateOfferService;
  let negotiate: SubmitNegotiationService;
  let accept: AcceptOfferService;
  let decline: DeclineOfferService;
  let buyer: User;
  let otherBuyer: User;
  let farmer: User;
  let listingId: string;

  const person = (displayName: string, phone: string, role: User['role']) =>
    users.create({ displayName, phone, passwordHash: 'hash', role });

  const standard = (quantityKg = 40, price = 170) => ({
    listingId,
    listingType: 'STANDARD' as const,
    proposedPrice: price,
    proposedQuantityKg: quantityKg,
  });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    listings = new InMemoryListingRepository();
    wanteds = new InMemoryWantedRepository();
    orders = new InMemoryOrderRepository();
    offers = new InMemoryOfferRepository();
    const placeOrder = new PlaceOrder(orders, listings);
    create = new CreateOfferService(offers, listings, wanteds);
    negotiate = new SubmitNegotiationService(offers);
    accept = new AcceptOfferService(offers, listings, wanteds, placeOrder);
    decline = new DeclineOfferService(offers);

    buyer = await person('Priya', '+94770000001', 'buyer');
    otherBuyer = await person('Kasun', '+94770000002', 'buyer');
    farmer = await person('Nimal', '+94770000003', 'farmer');
    listingId = (await listings.seed(listingFields(farmer))).id;
  });

  describe('create', () => {
    it('opens a PENDING offer from a buyer and gives the turn to the farmer', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());

      expect(offer).toMatchObject({
        buyerId: buyer.id,
        farmerId: farmer.id,
        listingId,
        listingType: 'STANDARD',
        cropId: 'tomato',
        initiatedBy: 'BUYER',
        pricePerKg: 170,
        quantityKg: 40,
        total: 6800,
        status: 'PENDING',
        actionRequiredBy: 'FARMER',
      });
      expect(offer.negotiationHistory).toHaveLength(1);
    });

    it('refuses a farmer starting an offer on a listing', async () => {
      await expect(
        create.execute(farmer.id, 'FARMER', standard()),
      ).rejects.toMatchObject({ code: 'invalid', kind: 'invalid' });
    });
  });

  describe('counter', () => {
    it('overwrites the terms, keeps the history and passes the turn', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());

      const countered = await negotiate.execute(farmer.id, offer.id, {
        proposedPrice: 176,
        proposedQuantityKg: 40,
      });

      expect(countered).toMatchObject({
        pricePerKg: 176,
        total: 7040,
        status: 'NEGOTIATING',
        actionRequiredBy: 'BUYER',
      });
      expect(countered.negotiationHistory.map((h) => h.senderType)).toEqual([
        'BUYER',
        'FARMER',
      ]);
    });

    it('refuses the side whose turn it is not, and a stranger', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());
      const terms = { proposedPrice: 160, proposedQuantityKg: 40 };

      await expect(
        negotiate.execute(buyer.id, offer.id, terms),
      ).rejects.toMatchObject({ code: 'invalid' });
      await expect(
        negotiate.execute(otherBuyer.id, offer.id, terms),
      ).rejects.toMatchObject({ code: 'not_your_offer', kind: 'forbidden' });
    });
  });

  describe('accept', () => {
    it('takes the stock, creates an accepted order at the agreed price and links it', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());

      const { orderId } = await accept.execute(farmer.id, offer.id);

      expect((await listings.findById(listingId))?.quantityKg).toBe(60);
      expect(await orders.findById(orderId)).toMatchObject({
        buyerId: buyer.id,
        farmerId: farmer.id,
        farmerName: 'Nimal',
        listingId,
        offerId: offer.id,
        quantityKg: 40,
        pricePerKg: 170,
        total: 6800,
        status: 'accepted',
      });
      expect(await offers.findById(offer.id)).toMatchObject({
        status: 'ACCEPTED',
        orderId,
      });
    });

    it('refuses the side that made the latest proposal', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());
      await expect(accept.execute(buyer.id, offer.id)).rejects.toMatchObject({
        code: 'invalid',
      });
    });

    it('marks a listing sold when what is left is below its minimum order', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard(95));
      await accept.execute(farmer.id, offer.id);
      expect(await listings.findById(listingId)).toMatchObject({
        quantityKg: 5,
        status: 'sold',
      });
    });
  });

  describe('decline', () => {
    it('lets either side decline a live offer, once', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());

      expect((await decline.execute(buyer.id, offer.id)).status).toBe(
        'DECLINED',
      );
      await expect(decline.execute(farmer.id, offer.id)).rejects.toMatchObject({
        code: 'invalid',
      });
    });
  });
});
