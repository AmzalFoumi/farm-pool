import type { OrderStatus } from '@farm-pool/shared';
import { InMemoryOrderRepository } from '../../../orders/infrastructure/persistence/in-memory-order.repository';
import { SimulatedPaymentGateway } from '../../infrastructure/gateway/simulated-payment-gateway';
import { InMemoryPaymentRepository } from '../../infrastructure/persistence/in-memory-payment.repository';
import { ConfirmReceipt } from './confirm-receipt';
import { GetPayment } from './get-payment';
import { PayForOrder } from './pay-for-order';
import { ProposePrice } from './propose-price';
import { RespondToPriceProposal } from './respond-to-price-proposal';

describe('payments', () => {
  let orders: InMemoryOrderRepository;
  let payments: InMemoryPaymentRepository;
  let pay: PayForOrder;
  let get: GetPayment;
  let confirm: ConfirmReceipt;
  let propose: ProposePrice;
  let respond: RespondToPriceProposal;

  /** An order in whatever status the test needs: 100 kg at Rs 180, so Rs 18,000. */
  const seedOrder = async (status: OrderStatus, pricePerKg = 180) => {
    const order = await orders.create({
      buyerId: 'buyer-1',
      farmerId: 'farmer-1',
      farmerName: 'Nimal',
      listingId: 'listing-1',
      cropId: 'tomato',
      quantityKg: 100,
      pricePerKg,
      total: 100 * pricePerKg,
      status,
    });
    return order.id;
  };

  beforeEach(() => {
    orders = new InMemoryOrderRepository();
    payments = new InMemoryPaymentRepository();
    pay = new PayForOrder(payments, orders, new SimulatedPaymentGateway());
    get = new GetPayment(payments);
    confirm = new ConfirmReceipt(payments, orders);
    propose = new ProposePrice(payments, orders);
    respond = new RespondToPriceProposal(payments, orders);
  });

  describe('paying for an order', () => {
    it('holds the total, releases the 30% advance and opens the order', async () => {
      const orderId = await seedOrder('accepted');

      const payment = await pay.execute('buyer-1', orderId);

      expect(payment).toMatchObject({
        orderId,
        buyerId: 'buyer-1',
        farmerId: 'farmer-1',
        total: 18000,
        advanceAmount: 5400,
        heldAmount: 12600,
        status: 'in_escrow',
        method: 'simulated',
      });
      expect(payment.entries.map((e) => [e.kind, e.amount])).toEqual([
        ['deposit', 18000],
        ['advance_release', 5400],
      ]);
      expect((await orders.findById(orderId))?.status).toBe('open');
    });

    it('gives every entry its own receipt number and keeps the gateway reference private', async () => {
      const payment = await pay.execute('buyer-1', await seedOrder('accepted'));

      const numbers = payment.entries.map((e) => e.receiptNo);
      expect(new Set(numbers).size).toBe(numbers.length);
      for (const receiptNo of numbers) {
        expect(receiptNo).toMatch(/^FP-\d{6}-[A-HJ-NP-Z2-9]{6}$/);
      }
      expect(payment).not.toHaveProperty('gatewayRef');
    });

    it('splits a total that does not divide evenly without losing a rupee', async () => {
      const payment = await pay.execute(
        'buyer-1',
        await seedOrder('accepted', 181.5),
      );

      expect(payment.advanceAmount + payment.heldAmount).toBe(payment.total);
    });

    it.each<OrderStatus>([
      'requested',
      'declined',
      'cancelled',
      'open',
      'delivered',
    ])('refuses an order that is %s', async (status) => {
      const orderId = await seedOrder(status);

      await expect(pay.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'order_not_payable',
        kind: 'conflict',
      });
      expect(await payments.findByOrder(orderId)).toBeNull();
    });

    it('refuses a second payment on the same order', async () => {
      const orderId = await seedOrder('accepted');
      await pay.execute('buyer-1', orderId);

      await expect(pay.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'already_paid',
        kind: 'conflict',
      });
    });

    it('refuses anyone but the buyer who placed the order', async () => {
      const orderId = await seedOrder('accepted');

      await expect(pay.execute('buyer-2', orderId)).rejects.toMatchObject({
        code: 'not_your_order',
        kind: 'forbidden',
      });
      expect((await orders.findById(orderId))?.status).toBe('accepted');
    });

    it('refuses an order that does not exist', async () => {
      await expect(pay.execute('buyer-1', 'nope')).rejects.toMatchObject({
        code: 'order_not_found',
        kind: 'not_found',
      });
    });

    it('takes the payment back out if the order moved while the charge was in flight', async () => {
      const orderId = await seedOrder('accepted');
      // The farmer withdraws between the status check and the claim.
      const charge = jest
        .spyOn(SimulatedPaymentGateway.prototype, 'charge')
        .mockImplementationOnce(async () => {
          await orders.updateStatus(orderId, 'declined');
          return { reference: 'sim_test' };
        });

      await expect(pay.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'order_not_payable',
      });
      expect(await payments.findByOrder(orderId)).toBeNull();
      charge.mockRestore();
    });
  });

  describe('reading a payment', () => {
    it('shows it to the buyer and the farmer, and to nobody else', async () => {
      const orderId = await seedOrder('accepted');
      await pay.execute('buyer-1', orderId);

      await expect(get.execute('buyer-1', orderId)).resolves.toMatchObject({
        orderId,
      });
      await expect(get.execute('farmer-1', orderId)).resolves.toMatchObject({
        orderId,
      });
      await expect(get.execute('buyer-2', orderId)).rejects.toMatchObject({
        code: 'not_your_order',
        kind: 'forbidden',
      });
    });

    it('says so when the order has not been paid for', async () => {
      const orderId = await seedOrder('accepted');

      await expect(get.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'payment_not_found',
        kind: 'not_found',
      });
    });
  });

  describe('confirming receipt', () => {
    /** A paid order, then moved to wherever the delivery has got to. */
    const paidOrder = async (status: OrderStatus) => {
      const orderId = await seedOrder('accepted');
      await pay.execute('buyer-1', orderId);
      await orders.updateStatus(orderId, status);
      return orderId;
    };

    it('releases the held balance to the farmer and stamps the order', async () => {
      const orderId = await paidOrder('delivered');

      const payment = await confirm.execute('buyer-1', orderId);

      expect(payment).toMatchObject({
        status: 'released',
        total: 18000,
        advanceAmount: 5400,
        heldAmount: 0,
      });
      expect(payment.entries.map((e) => [e.kind, e.amount])).toEqual([
        ['deposit', 18000],
        ['advance_release', 5400],
        ['balance_release', 12600],
      ]);
      const order = await orders.findById(orderId);
      expect(order?.status).toBe('delivered');
      expect(order?.receivedAt).toBeInstanceOf(Date);
    });

    it.each<OrderStatus>(['open', 'assigned', 'in_transit'])(
      'refuses while the order is still %s',
      async (status) => {
        const orderId = await paidOrder(status);

        await expect(confirm.execute('buyer-1', orderId)).rejects.toMatchObject(
          { code: 'not_delivered_yet', kind: 'conflict' },
        );
        expect((await payments.findByOrder(orderId))?.heldAmount).toBe(12600);
      },
    );

    it('releases once: a second confirmation is refused and pays nothing more', async () => {
      const orderId = await paidOrder('delivered');
      await confirm.execute('buyer-1', orderId);

      await expect(confirm.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'already_released',
        kind: 'conflict',
      });
      expect((await payments.findByOrder(orderId))?.entries).toHaveLength(3);
    });

    it('refuses anyone but the buyer, including the farmer who is owed the money', async () => {
      const orderId = await paidOrder('delivered');

      await expect(confirm.execute('farmer-1', orderId)).rejects.toMatchObject({
        code: 'not_your_order',
        kind: 'forbidden',
      });
      expect((await payments.findByOrder(orderId))?.status).toBe('in_escrow');
    });

    it('refuses an order that was never paid for', async () => {
      const orderId = await seedOrder('delivered');

      await expect(confirm.execute('buyer-1', orderId)).rejects.toMatchObject({
        code: 'payment_not_found',
        kind: 'not_found',
      });
    });
  });

  describe('renegotiating the price', () => {
    /** A paid order: 100 kg at Rs 180, Rs 5,400 advanced and Rs 12,600 held. */
    const paidOrder = async () => {
      const orderId = await seedOrder('accepted');
      await pay.execute('buyer-1', orderId);
      return orderId;
    };

    it('records a proposal on the order without changing the price or the money', async () => {
      const orderId = await paidOrder();

      const order = await propose.execute('farmer-1', orderId, {
        pricePerKg: 200,
        reason: 'Dambulla price rose',
      });

      expect(order).toMatchObject({
        pricePerKg: 180,
        total: 18000,
        priceProposal: {
          proposedBy: 'farmer',
          pricePerKg: 200,
          reason: 'Dambulla price rose',
        },
      });
      expect((await payments.findByOrder(orderId))?.heldAmount).toBe(12600);
    });

    it('lets either side propose before the buyer has paid', async () => {
      const orderId = await seedOrder('accepted');

      const order = await propose.execute('buyer-1', orderId, {
        pricePerKg: 170,
      });

      expect(order.priceProposal).toMatchObject({ proposedBy: 'buyer' });
    });

    it.each<OrderStatus>(['requested', 'in_transit', 'delivered', 'cancelled'])(
      'refuses a proposal on an order that is %s',
      async (status) => {
        const orderId = await seedOrder(status);

        await expect(
          propose.execute('buyer-1', orderId, { pricePerKg: 170 }),
        ).rejects.toMatchObject({
          code: 'proposal_not_allowed',
          kind: 'conflict',
        });
      },
    );

    it('refuses a second proposal while one is waiting', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });

      await expect(
        propose.execute('buyer-1', orderId, { pricePerKg: 170 }),
      ).rejects.toMatchObject({ code: 'proposal_pending', kind: 'conflict' });
    });

    it('refuses the price the order already has, and anyone not on the order', async () => {
      const orderId = await paidOrder();

      await expect(
        propose.execute('buyer-1', orderId, { pricePerKg: 180 }),
      ).rejects.toMatchObject({ code: 'price_unchanged', kind: 'invalid' });
      await expect(
        propose.execute('buyer-2', orderId, { pricePerKg: 170 }),
      ).rejects.toMatchObject({ code: 'not_your_order', kind: 'forbidden' });
    });

    it('refuses a price whose total is below the advance the farmer already has', async () => {
      const orderId = await paidOrder();

      // 100 kg at Rs 50 is Rs 5,000; the farmer already holds Rs 5,400.
      await expect(
        propose.execute('buyer-1', orderId, { pricePerKg: 50 }),
      ).rejects.toMatchObject({ code: 'price_too_low', kind: 'invalid' });
    });

    it('on accept of a higher price: reprices the order and tops the held balance up', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });

      const order = await respond.execute('buyer-1', orderId, 'accept');

      expect(order).toMatchObject({ pricePerKg: 200, total: 20000 });
      expect(order).not.toHaveProperty('priceProposal');
      const payment = await payments.findByOrder(orderId);
      expect(payment).toMatchObject({
        total: 20000,
        advanceAmount: 5400,
        heldAmount: 14600,
        status: 'in_escrow',
      });
      expect(payment?.entries.at(-1)).toMatchObject({
        kind: 'top_up',
        amount: 2000,
      });
    });

    it('on accept of a lower price: refunds the difference from the held balance', async () => {
      const orderId = await paidOrder();
      await propose.execute('buyer-1', orderId, { pricePerKg: 150 });

      await respond.execute('farmer-1', orderId, 'accept');

      const payment = await payments.findByOrder(orderId);
      expect(payment).toMatchObject({
        total: 15000,
        advanceAmount: 5400,
        heldAmount: 9600,
      });
      expect(payment?.entries.at(-1)).toMatchObject({
        kind: 'refund',
        amount: 3000,
      });
    });

    it('releases the renegotiated balance, not the original one, on receipt', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });
      await respond.execute('buyer-1', orderId, 'accept');
      await orders.updateStatus(orderId, 'delivered');

      const payment = await confirm.execute('buyer-1', orderId);

      expect(payment.entries.at(-1)).toMatchObject({
        kind: 'balance_release',
        amount: 14600,
      });
    });

    it('on accept before payment: reprices the order, and the buyer then pays the new total', async () => {
      const orderId = await seedOrder('accepted');
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });
      await respond.execute('buyer-1', orderId, 'accept');

      const payment = await pay.execute('buyer-1', orderId);

      expect(payment).toMatchObject({ total: 20000, advanceAmount: 6000 });
    });

    it('does not let the side that proposed accept its own price', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });

      await expect(
        respond.execute('farmer-1', orderId, 'accept'),
      ).rejects.toMatchObject({ code: 'own_proposal', kind: 'forbidden' });
      expect((await orders.findById(orderId))?.pricePerKg).toBe(180);
    });

    it('on decline, by either side: removes the proposal and changes nothing else', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });
      const declined = await respond.execute('buyer-1', orderId, 'decline');
      expect(declined).toMatchObject({ pricePerKg: 180, total: 18000 });
      expect(declined).not.toHaveProperty('priceProposal');

      // The proposer withdrawing is the same operation.
      await propose.execute('farmer-1', orderId, { pricePerKg: 210 });
      const withdrawn = await respond.execute('farmer-1', orderId, 'decline');
      expect(withdrawn).not.toHaveProperty('priceProposal');
      expect((await payments.findByOrder(orderId))?.entries).toHaveLength(2);
    });

    it('refuses an answer when nothing is waiting', async () => {
      const orderId = await paidOrder();

      await expect(
        respond.execute('buyer-1', orderId, 'accept'),
      ).rejects.toMatchObject({ code: 'no_open_proposal', kind: 'conflict' });
    });

    it('refuses to accept once the produce has been collected', async () => {
      const orderId = await paidOrder();
      await propose.execute('farmer-1', orderId, { pricePerKg: 200 });
      await orders.updateStatus(orderId, 'in_transit');

      await expect(
        respond.execute('buyer-1', orderId, 'accept'),
      ).rejects.toMatchObject({
        code: 'proposal_not_allowed',
        kind: 'conflict',
      });
      expect((await payments.findByOrder(orderId))?.heldAmount).toBe(12600);
    });
  });
});
