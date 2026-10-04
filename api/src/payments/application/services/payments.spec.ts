import type { OrderStatus } from '@farm-pool/shared';
import { InMemoryOrderRepository } from '../../../orders/infrastructure/persistence/in-memory-order.repository';
import { SimulatedPaymentGateway } from '../../infrastructure/gateway/simulated-payment-gateway';
import { InMemoryPaymentRepository } from '../../infrastructure/persistence/in-memory-payment.repository';
import { ConfirmReceipt } from './confirm-receipt';
import { GetPayment } from './get-payment';
import { PayForOrder } from './pay-for-order';

describe('payments', () => {
  let orders: InMemoryOrderRepository;
  let payments: InMemoryPaymentRepository;
  let pay: PayForOrder;
  let get: GetPayment;
  let confirm: ConfirmReceipt;

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
});
