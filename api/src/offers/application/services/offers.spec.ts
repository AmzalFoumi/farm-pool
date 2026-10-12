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
import { GetOfferService } from './get-offer.service';
import { ListMyOffersService } from './list-my-offers.service';
import { ListWantedOffersService } from './list-wanted-offers.service';
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
  let listMine: ListMyOffersService;
  let getOne: GetOfferService;
  let listForWanted: ListWantedOffersService;
  let buyer: User;
  let otherBuyer: User;
  let farmer: User;
  let otherFarmer: User;
  let wantedId: string;
  let listingId: string;

  const person = (displayName: string, phone: string, role: User['role']) =>
    users.create({ displayName, phone, passwordHash: 'hash', role });

  const standard = (quantityKg = 40, price = 170) => ({
    listingId,
    listingType: 'STANDARD' as const,
    proposedPrice: price,
    proposedQuantityKg: quantityKg,
  });

  const response = (quantityKg = 30, price = 175) => ({
    listingId,
    listingType: 'WANTED' as const,
    wantedId,
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
    create = new CreateOfferService(offers, listings, wanteds, users);
    negotiate = new SubmitNegotiationService(offers, listings);
    accept = new AcceptOfferService(offers, listings, wanteds, placeOrder);
    decline = new DeclineOfferService(offers);
    listMine = new ListMyOffersService(offers);
    getOne = new GetOfferService(offers);
    listForWanted = new ListWantedOffersService(offers);

    buyer = await person('Priya', '+94770000001', 'buyer');
    otherBuyer = await person('Kasun', '+94770000002', 'buyer');
    farmer = await person('Nimal', '+94770000003', 'farmer');
    listingId = (await listings.seed(listingFields(farmer))).id;
    otherFarmer = await person('Kamala', '+94770000004', 'farmer');
    wantedId = (
      await wanteds.create({
        buyerId: buyer.id,
        cropId: 'tomato',
        quantityKg: 60,
        neededBy: '2026-12-01',
        district: 'Colombo',
      })
    ).id;
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

    it('records both names and the delivery point the buyer gave', async () => {
      const dropOff = {
        label: 'Manning Market',
        point: { latitude: 6.94, longitude: 79.86 },
      };
      const offer = await create.execute(buyer.id, 'BUYER', {
        ...standard(),
        dropOff,
      });
      expect(offer).toMatchObject({
        farmerName: 'Nimal',
        buyerName: 'Priya',
        dropOff,
      });
    });

    it('refuses a listing that is missing or not verified', async () => {
      const pending = await listings.seed({
        ...listingFields(farmer),
        status: 'pending_approval',
      });
      await expect(
        create.execute(buyer.id, 'BUYER', { ...standard(), listingId: 'nope' }),
      ).rejects.toMatchObject({
        code: 'listing_unavailable',
        kind: 'conflict',
      });
      await expect(
        create.execute(buyer.id, 'BUYER', {
          ...standard(),
          listingId: pending.id,
        }),
      ).rejects.toMatchObject({ code: 'listing_unavailable' });
    });

    it('refuses a listing whose farmer does not take offers', async () => {
      const fixed = await listings.seed({
        ...listingFields(farmer),
        acceptNegotiation: false,
      });
      await expect(
        create.execute(buyer.id, 'BUYER', {
          ...standard(),
          listingId: fixed.id,
        }),
      ).rejects.toMatchObject({
        code: 'negotiation_not_accepted',
        kind: 'conflict',
      });
    });

    it('refuses a quantity below the minimum order or above the stock', async () => {
      await expect(
        create.execute(buyer.id, 'BUYER', standard(5)),
      ).rejects.toMatchObject({
        code: 'quantity_out_of_range',
        kind: 'invalid',
      });
      await expect(
        create.execute(buyer.id, 'BUYER', standard(101)),
      ).rejects.toMatchObject({ code: 'quantity_out_of_range' });
      await expect(
        create.execute(buyer.id, 'BUYER', standard(100)),
      ).resolves.toBeDefined();
    });

    it('refuses a second live offer from the same buyer, but allows one after a decline', async () => {
      const first = await create.execute(buyer.id, 'BUYER', standard());

      await expect(
        create.execute(buyer.id, 'BUYER', standard()),
      ).rejects.toMatchObject({ code: 'offer_exists', kind: 'conflict' });
      await expect(
        create.execute(otherBuyer.id, 'BUYER', standard()),
      ).resolves.toBeDefined();

      await decline.execute(buyer.id, first.id);
      await expect(
        create.execute(buyer.id, 'BUYER', standard()),
      ).resolves.toBeDefined();
    });
  });

  describe('respond to a wanted request', () => {
    it('opens a PENDING offer from the farmer, on their own listing, for the buyer to answer', async () => {
      const offer = await create.execute(farmer.id, 'FARMER', response());

      expect(offer).toMatchObject({
        buyerId: buyer.id,
        farmerId: farmer.id,
        listingId,
        listingType: 'WANTED',
        wantedId,
        cropId: 'tomato',
        initiatedBy: 'FARMER',
        farmerName: 'Nimal',
        buyerName: 'Priya',
        pricePerKg: 175,
        quantityKg: 30,
        total: 5250,
        status: 'PENDING',
        actionRequiredBy: 'BUYER',
      });
      expect(offer.negotiationHistory[0]?.senderType).toBe('FARMER');
    });

    it('does not need the listing to be marked negotiable', async () => {
      const fixed = await listings.seed({
        ...listingFields(farmer),
        acceptNegotiation: false,
      });
      await expect(
        create.execute(farmer.id, 'FARMER', {
          ...response(),
          listingId: fixed.id,
        }),
      ).resolves.toBeDefined();
    });

    it('refuses a buyer, and a farmer using a listing that is not theirs', async () => {
      await expect(
        create.execute(buyer.id, 'BUYER', response()),
      ).rejects.toMatchObject({ code: 'invalid', kind: 'invalid' });
      await expect(
        create.execute(otherFarmer.id, 'FARMER', response()),
      ).rejects.toMatchObject({ code: 'not_your_listing', kind: 'forbidden' });
    });

    it('refuses a listing that is not approved, and a quantity it cannot fill', async () => {
      const pending = await listings.seed({
        ...listingFields(farmer),
        status: 'pending_approval',
      });
      await expect(
        create.execute(farmer.id, 'FARMER', {
          ...response(),
          listingId: pending.id,
        }),
      ).rejects.toMatchObject({
        code: 'listing_unavailable',
        kind: 'conflict',
      });
      await expect(
        create.execute(farmer.id, 'FARMER', response(500)),
      ).rejects.toMatchObject({ code: 'quantity_out_of_range' });
    });

    it('refuses a request that is closed or missing, and a listing of another crop', async () => {
      const onions = await listings.seed({
        ...listingFields(farmer),
        cropId: 'onion',
      });
      await expect(
        create.execute(farmer.id, 'FARMER', {
          ...response(),
          listingId: onions.id,
        }),
      ).rejects.toMatchObject({ code: 'crop_mismatch', kind: 'invalid' });

      await expect(
        create.execute(farmer.id, 'FARMER', {
          ...response(),
          wantedId: 'nope',
        }),
      ).rejects.toMatchObject({ code: 'wanted_closed', kind: 'conflict' });

      await wanteds.updateStatus(wantedId, 'closed');
      await expect(
        create.execute(farmer.id, 'FARMER', response()),
      ).rejects.toMatchObject({ code: 'wanted_closed' });
    });

    it('allows one live response per farmer per request, and does not block an ordinary offer', async () => {
      await create.execute(farmer.id, 'FARMER', response());

      await expect(
        create.execute(farmer.id, 'FARMER', response()),
      ).rejects.toMatchObject({ code: 'offer_exists', kind: 'conflict' });
      // The same buyer may still make their own offer on that listing: it is a different negotiation.
      await expect(
        create.execute(buyer.id, 'BUYER', standard()),
      ).resolves.toBeDefined();
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

    it('refuses a countered quantity the listing cannot fill', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());
      await expect(
        negotiate.execute(farmer.id, offer.id, {
          proposedPrice: 176,
          proposedQuantityKg: 500,
        }),
      ).rejects.toMatchObject({ code: 'quantity_out_of_range' });
      expect(await offers.findById(offer.id)).toMatchObject({
        status: 'PENDING',
        quantityKg: 40,
      });
    });

    it('keeps a delivery point from the buyer and ignores one from the farmer', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());
      const farmGate = { point: { latitude: 7.48, longitude: 80.36 } };
      const market = {
        label: 'Pettah',
        point: { latitude: 6.93, longitude: 79.85 },
      };

      const fromFarmer = await negotiate.execute(farmer.id, offer.id, {
        proposedPrice: 176,
        proposedQuantityKg: 40,
        dropOff: farmGate,
      });
      expect(fromFarmer.dropOff).toBeUndefined();

      const fromBuyer = await negotiate.execute(buyer.id, offer.id, {
        proposedPrice: 172,
        proposedQuantityKg: 40,
        dropOff: market,
      });
      expect(fromBuyer.dropOff).toEqual(market);
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

    it('copies the delivery point onto the order, from the offer or from the buyer accepting', async () => {
      const market = {
        label: 'Pettah',
        point: { latitude: 6.93, longitude: 79.85 },
      };

      const withPoint = await create.execute(buyer.id, 'BUYER', {
        ...standard(20),
        dropOff: market,
      });
      const first = await accept.execute(farmer.id, withPoint.id);
      expect((await orders.findById(first.orderId))?.dropOff).toEqual(market);

      const bare = await create.execute(otherBuyer.id, 'BUYER', standard(20));
      await negotiate.execute(farmer.id, bare.id, {
        proposedPrice: 175,
        proposedQuantityKg: 20,
      });
      const second = await accept.execute(otherBuyer.id, bare.id, {
        dropOff: market,
      });
      expect((await orders.findById(second.orderId))?.dropOff).toEqual(market);
    });

    it('ignores a delivery point sent by the farmer accepting', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard(20));
      const { orderId } = await accept.execute(farmer.id, offer.id, {
        dropOff: { point: { latitude: 7.48, longitude: 80.36 } },
      });
      expect((await orders.findById(orderId))?.dropOff).toBeUndefined();
    });

    it('gives the stock to the first accept and puts the losing offer back', async () => {
      const big = await create.execute(buyer.id, 'BUYER', standard(70));
      const alsoBig = await create.execute(
        otherBuyer.id,
        'BUYER',
        standard(70),
      );

      await accept.execute(farmer.id, big.id);

      await expect(accept.execute(farmer.id, alsoBig.id)).rejects.toMatchObject(
        { code: 'insufficient_stock', kind: 'conflict' },
      );
      expect((await offers.findById(alsoBig.id))?.status).toBe('PENDING');
      expect((await listings.findById(listingId))?.quantityKg).toBe(30);
      expect(await orders.findByBuyer(otherBuyer.id)).toEqual([]);
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

  describe('accept a response to a wanted request', () => {
    it('closes the request, takes the stock, and creates the accepted order', async () => {
      const offer = await create.execute(
        farmer.id,
        'FARMER',
        response(30, 175),
      );
      const market = {
        label: 'Pettah',
        point: { latitude: 6.93, longitude: 79.85 },
      };

      const { orderId } = await accept.execute(buyer.id, offer.id, {
        dropOff: market,
      });

      expect((await wanteds.findById(wantedId))?.status).toBe('closed');
      expect((await listings.findById(listingId))?.quantityKg).toBe(70);
      expect(await orders.findById(orderId)).toMatchObject({
        buyerId: buyer.id,
        farmerId: farmer.id,
        listingId,
        offerId: offer.id,
        quantityKg: 30,
        pricePerKg: 175,
        status: 'accepted',
        dropOff: market,
      });
    });

    it('declines the other responses to that request, and nothing else', async () => {
      const otherListing = await listings.seed(listingFields(otherFarmer));
      const winner = await create.execute(farmer.id, 'FARMER', response());
      const loser = await create.execute(otherFarmer.id, 'FARMER', {
        ...response(),
        listingId: otherListing.id,
      });
      // An ordinary offer by another buyer on the winning farmer's listing.
      const ordinary = await create.execute(
        otherBuyer.id,
        'BUYER',
        standard(20),
      );

      await accept.execute(buyer.id, winner.id);

      expect((await offers.findById(loser.id))?.status).toBe('DECLINED');
      expect((await offers.findById(ordinary.id))?.status).toBe('PENDING');
    });

    it('refuses once the buyer has closed the request, and changes nothing', async () => {
      const offer = await create.execute(farmer.id, 'FARMER', response());
      await wanteds.updateStatus(wantedId, 'closed');

      await expect(accept.execute(buyer.id, offer.id)).rejects.toMatchObject({
        code: 'wanted_closed',
        kind: 'conflict',
      });
      expect((await offers.findById(offer.id))?.status).toBe('PENDING');
      expect((await listings.findById(listingId))?.quantityKg).toBe(100);
      expect(await orders.findByBuyer(buyer.id)).toEqual([]);
    });

    it('reopens the request when the stock has gone', async () => {
      const offer = await create.execute(farmer.id, 'FARMER', response(60));
      // Someone else's deal takes most of the stock first.
      const big = await create.execute(otherBuyer.id, 'BUYER', standard(70));
      await accept.execute(farmer.id, big.id);

      await expect(accept.execute(buyer.id, offer.id)).rejects.toMatchObject({
        code: 'insufficient_stock',
      });
      expect((await wanteds.findById(wantedId))?.status).toBe('open');
      expect((await offers.findById(offer.id))?.status).toBe('PENDING');
    });

    it('lets the farmer accept after the buyer counters', async () => {
      const offer = await create.execute(
        farmer.id,
        'FARMER',
        response(30, 175),
      );
      await negotiate.execute(buyer.id, offer.id, {
        proposedPrice: 168,
        proposedQuantityKg: 30,
      });

      const { orderId } = await accept.execute(farmer.id, offer.id);

      expect((await orders.findById(orderId))?.pricePerKg).toBe(168);
      expect((await wanteds.findById(wantedId))?.status).toBe('closed');
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

  describe('reading', () => {
    it('lists the offers a user is on, on either side', async () => {
      const mine = await create.execute(buyer.id, 'BUYER', standard());
      const theirs = await create.execute(otherBuyer.id, 'BUYER', standard());

      expect((await listMine.execute(buyer.id)).map((o) => o.id)).toEqual([
        mine.id,
      ]);
      expect(
        (await listMine.execute(farmer.id)).map((o) => o.id).sort(),
      ).toEqual([mine.id, theirs.id].sort());
    });

    it('shows a request’s responses to its buyer, and to each farmer only their own', async () => {
      const otherListing = await listings.seed(listingFields(otherFarmer));
      const mine = await create.execute(farmer.id, 'FARMER', response());
      const theirs = await create.execute(otherFarmer.id, 'FARMER', {
        ...response(),
        listingId: otherListing.id,
      });

      expect(
        (await listForWanted.execute(buyer.id, wantedId))
          .map((o) => o.id)
          .sort(),
      ).toEqual([mine.id, theirs.id].sort());
      expect(
        (await listForWanted.execute(farmer.id, wantedId)).map((o) => o.id),
      ).toEqual([mine.id]);
      expect(await listForWanted.execute(otherBuyer.id, wantedId)).toEqual([]);
    });

    it('shows one offer to its two sides only', async () => {
      const offer = await create.execute(buyer.id, 'BUYER', standard());

      await expect(getOne.execute(buyer.id, offer.id)).resolves.toMatchObject({
        id: offer.id,
      });
      await expect(getOne.execute(farmer.id, offer.id)).resolves.toMatchObject({
        id: offer.id,
      });
      await expect(
        getOne.execute(otherBuyer.id, offer.id),
      ).rejects.toMatchObject({ code: 'not_your_offer', kind: 'forbidden' });
      await expect(getOne.execute(buyer.id, 'missing')).rejects.toMatchObject({
        code: 'not_found',
        kind: 'not_found',
      });
    });
  });
});
