import {
  Logger,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LogisticsError } from './application/errors';
import { LogisticsAuditInterceptor } from './logistics-audit.interceptor';

/**
 * The log line is the thing under test, because it is the whole point of the interceptor: a
 * delivery dispute is settled by reading it months later. Asserting on the text is therefore
 * asserting on the contract, not on an implementation detail.
 */
describe('LogisticsAuditInterceptor', () => {
  /** Every Logger method under test has the same shape, so one alias keeps the spies typed. */
  type LogSpy = jest.SpyInstance<void, [message: unknown, ...rest: unknown[]]>;

  let interceptor: LogisticsAuditInterceptor;
  let log: LogSpy;
  let debug: LogSpy;
  let warn: LogSpy;
  let error: LogSpy;

  const context = (
    handler: string,
    params: Record<string, string> = {},
    body: unknown = undefined,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'driver-1' }, params, body }),
      }),
      getHandler: () => ({ name: handler }),
    }) as unknown as ExecutionContext;

  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  const handlerThrowing = (err: unknown): CallHandler => ({
    handle: () => throwError(() => err),
  });

  /** The line without the duration, which is a clock reading and not worth pinning. */
  const lineFrom = (spy: LogSpy) =>
    String(spy.mock.calls[0][0]).replace(/ \d+ms$/, '');

  const spyOnLogger = (method: 'log' | 'debug' | 'warn' | 'error'): LogSpy =>
    jest.spyOn(Logger.prototype, method).mockImplementation() as LogSpy;

  beforeEach(() => {
    interceptor = new LogisticsAuditInterceptor();
    log = spyOnLogger('log');
    debug = spyOnLogger('debug');
    warn = spyOnLogger('warn');
    error = spyOnLogger('error');
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs a write at info with the actor, the order and the promised window', async () => {
    await lastValueFrom(
      interceptor.intercept(
        context(
          'accept',
          { orderId: 'order-1' },
          { committedWindow: { from: 360, to: 540 } },
        ),
        handlerReturning({}),
      ),
    );

    expect(lineFrom(log)).toBe(
      'accept actor=driver-1 order=order-1 window=360-540 → ok',
    );
    expect(debug).not.toHaveBeenCalled();
  });

  it('records the weight actually loaded at pickup', async () => {
    await lastValueFrom(
      interceptor.intercept(
        context('pickup', { orderId: 'order-1' }, { collectedKg: 95 }),
        handlerReturning({}),
      ),
    );

    expect(lineFrom(log)).toBe(
      'pickup actor=driver-1 order=order-1 collectedKg=95 → ok',
    );
  });

  it('keeps reads at debug so polling the board does not bury the writes', async () => {
    await lastValueFrom(
      interceptor.intercept(context('board'), handlerReturning([])),
    );

    expect(log).not.toHaveBeenCalled();
    expect(lineFrom(debug)).toBe('board actor=driver-1 → ok');
  });

  it('warns with the stable code when a job is refused', async () => {
    const taken = new LogisticsError(
      'conflict',
      'job_taken',
      'Another driver took this job first',
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context('accept', { orderId: 'order-1' }, {}),
          handlerThrowing(taken),
        ),
      ),
    ).rejects.toBe(taken);

    expect(lineFrom(warn)).toBe(
      'accept actor=driver-1 order=order-1 window=none → refused conflict/job_taken',
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('logs an unexpected failure at error, keeping the cause', async () => {
    const boom = new Error('connection lost');

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context('deliver', { orderId: 'order-1' }),
          handlerThrowing(boom),
        ),
      ),
    ).rejects.toBe(boom);

    expect(lineFrom(error)).toBe(
      'deliver actor=driver-1 order=order-1 → failed',
    );
    expect(error.mock.calls[0][1]).toBe(boom);
  });
});
